package br.com.economae.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import br.com.economae.BuildConfig
import br.com.economae.R
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Acesso ao token de push. Interface para os testes; null quando o push não existe neste build. */
interface FontePush {
    val disponivel: Boolean
    suspend fun tokenAtual(): String?
}

class FontePushFirebase(private val contexto: Context) : FontePush {
    // Sem google-services.json o Firebase não inicializa: o app segue sem push.
    override val disponivel: Boolean
        get() = BuildConfig.PUSH_DISPONIVEL && FirebaseApp.getApps(contexto).isNotEmpty()

    override suspend fun tokenAtual(): String? {
        if (!disponivel) return null
        return suspendCancellableCoroutine { c ->
            FirebaseMessaging.getInstance().token.addOnCompleteListener { t ->
                c.resume(if (t.isSuccessful) t.result else null)
            }
        }
    }
}

object CanalOfertas {
    const val EXTRA_OFERTA = "ofertaId"
    const val EXTRA_ENTREGA = "entregaId"

    fun criar(contexto: Context) {
        val canal = NotificationChannel(
            contexto.getString(R.string.canal_ofertas_id),
            contexto.getString(R.string.canal_ofertas_nome),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = contexto.getString(R.string.canal_ofertas_descricao) }
        contexto.getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }
}
