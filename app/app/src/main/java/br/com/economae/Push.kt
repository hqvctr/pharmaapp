package br.com.economae

import android.Manifest
import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import org.json.JSONObject
import kotlin.coroutines.resume

/** Canal das notificações de aviso (o servidor manda `channel_id: avisos`, docs/operacao/push.md). */
const val CANAL_AVISOS = "avisos"

/** O que a notificação tocada pede para abrir: os campos `dados` do push do servidor (backend/src/despachante/texto.ts). */
data class AvisoAberto(val avisoId: String, val alertaId: String?, val produtoId: String)

/** Lê os dados do push (extras do Intent ou `data` da mensagem). Null se não for um push de aviso do economae. */
fun avisoDosDados(dados: (String) -> String?): AvisoAberto? {
    val aviso = dados("aviso_id")?.takeIf { it.isNotBlank() } ?: return null
    val produto = dados("produto_id")?.takeIf { it.isNotBlank() } ?: return null
    return AvisoAberto(aviso, dados("alerta_id")?.takeIf { it.isNotBlank() }, produto)
}

/** Ponte entre a notificação tocada (MainActivity) e a navegação (Raiz): a tela abre quando a pessoa já está dentro do app. */
object AberturaPush {
    var pendente by mutableStateOf<AvisoAberto?>(null)
}

class EconomaeApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Push.iniciar(this)
    }
}

object Push {
    private const val TAG = "economae-push"

    /** Canal de notificação e Firebase. O Firebase é configurado no código (BuildConfig), sem o plugin google-services. */
    fun iniciar(contexto: Context) {
        contexto.getSystemService(NotificationManager::class.java)?.createNotificationChannel(
            NotificationChannel(CANAL_AVISOS, "Avisos de promoção", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Promoções excepcionais e avisos dos produtos que você segue."
            },
        )
        try {
            if (FirebaseApp.getApps(contexto).isEmpty()) {
                FirebaseApp.initializeApp(
                    contexto,
                    FirebaseOptions.Builder()
                        .setApplicationId(BuildConfig.FIREBASE_APP_ID)
                        .setApiKey(BuildConfig.FIREBASE_API_KEY)
                        .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
                        .setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID)
                        .build(),
                )
            }
        } catch (e: Exception) {
            Log.w(TAG, "Firebase não iniciou: ${e.message}")
        }
    }

    /** O Android 13+ exige a permissão; antes dele, basta a notificação não estar bloqueada nas configurações. */
    fun permitido(contexto: Context): Boolean =
        (Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(contexto).areNotificationsEnabled()

    private suspend fun token(): String? = suspendCancellableCoroutine { c ->
        try {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { t -> if (c.isActive) c.resume(if (t.isSuccessful) t.result else null) }
        } catch (e: Exception) {
            Log.w(TAG, "Sem token do FCM: ${e.message}")
            if (c.isActive) c.resume(null)
        }
    }

    /**
     * Manda o token deste aparelho para a API (`PUT /v1/dispositivo`, preso à sessão). Sem consentimento a API recusa com 422 e não
     * grava nada: é o esperado. Idempotente; o app chama ao entrar, ao ligar as notificações e quando o FCM troca o token.
     */
    suspend fun registrar(api: Api, token: String? = null): Boolean {
        val t = token ?: token() ?: return false
        return try {
            api.put("/v1/dispositivo", JSONObject().put("token", t).put("plataforma", "android").put("versao_app", BuildConfig.VERSION_NAME)).ok
        } catch (e: SemConexao) {
            false
        }
    }

    /** Mostra a notificação quando o app está aberto (com ele fechado, quem mostra é o próprio Android, com os mesmos dados). */
    fun mostrar(contexto: Context, titulo: String, corpo: String, aviso: AvisoAberto?) {
        if (!permitido(contexto)) return
        val abrir = Intent(contexto, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (aviso != null) {
            abrir.putExtra("aviso_id", aviso.avisoId).putExtra("produto_id", aviso.produtoId)
            aviso.alertaId?.let { abrir.putExtra("alerta_id", it) }
        }
        val chave = aviso?.produtoId ?: titulo
        val toque = PendingIntent.getActivity(contexto, chave.hashCode(), abrir, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(contexto, CANAL_AVISOS)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setContentTitle(titulo)
            .setContentText(corpo)
            .setStyle(NotificationCompat.BigTextStyle().bigText(corpo))
            .setContentIntent(toque)
            .setAutoCancel(true)
            .build()
        try {
            // Mesmo produto substitui a notificação anterior, como faz o `tag` do servidor.
            NotificationManagerCompat.from(contexto).notify(chave, 1, n)
        } catch (e: SecurityException) {
            Log.w(TAG, "Notificação recusada pelo Android: ${e.message}")
        }
    }
}

/**
 * Pede a permissão de notificação do Android 13+ quando falta e devolve se as notificações vão aparecer. Antes do 13 não há
 * pedido: só conta se a pessoa não bloqueou o app nas configurações.
 */
@Composable
fun rememberPedirNotificacoes(aoResponder: (Boolean) -> Unit): () -> Unit {
    val contexto = LocalContext.current
    val pedido = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { aoResponder(it && Push.permitido(contexto)) }
    return {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            pedido.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            aoResponder(Push.permitido(contexto))
        }
    }
}

/** Abre a tela de notificações do app nas configurações do Android (para quem bloqueou). */
fun abrirConfiguracaoDeNotificacoes(contexto: Context) {
    contexto.startActivity(
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, contexto.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
}

const val TEXTO_NOTIFICACAO_BLOQUEADA = "O Android está bloqueando as notificações do economae. Os avisos continuam na aba Avisos; para recebê-los no celular, libere as notificações nas configurações."

class ServicoPush : FirebaseMessagingService() {
    private val escopo = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onNewToken(token: String) {
        val arm = Armazenamento(applicationContext)
        if (arm.access == null || arm.servidor.isBlank()) return
        escopo.launch { Push.registrar(Api(arm), token) }
    }

    override fun onMessageReceived(msg: RemoteMessage) {
        val n = msg.notification ?: return
        Push.mostrar(applicationContext, n.title ?: "economae", n.body ?: "", avisoDosDados { msg.data[it] })
    }
}
