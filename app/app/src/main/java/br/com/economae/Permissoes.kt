package br.com.economae

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Looper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.util.Locale
import kotlin.coroutines.resume

// Convites para as permissões do Android (DECISIONS 104): notificações (logo que a pessoa entra no app) e localização (no cadastro
// do CEP). "Agora não" volta a perguntar uma vez, 7 dias depois; depois disso, só pelo Perfil e pelo botão do campo de CEP.

private const val SETE_DIAS_MS = 7L * 24 * 3600 * 1000

/** Se o convite pode aparecer: nunca recusado, ou recusado uma vez há 7 dias ou mais. */
fun deveConvidar(recusas: Int, ultimaRecusaEm: Long, agora: Long): Boolean =
    recusas == 0 || (recusas == 1 && agora - ultimaRecusaEm >= SETE_DIAS_MS)

/** CEP de 8 dígitos a partir do código postal do Geocoder ("14020-260"); null se não for um CEP. */
fun cepDoCodigoPostal(codigo: String?): String? = codigo?.filter(Char::isDigit)?.takeIf { it.length == 8 }

/** Guarda no aparelho as recusas de cada convite (`tipo` = "notificacoes" ou "localizacao"). */
class Convites(contexto: Context) {
    private val p = contexto.getSharedPreferences("economae-convites", Context.MODE_PRIVATE)
    fun pode(tipo: String, agora: Long = System.currentTimeMillis()) = deveConvidar(p.getInt("$tipo.recusas", 0), p.getLong("$tipo.em", 0), agora)
    fun recusou(tipo: String, agora: Long = System.currentTimeMillis()) =
        p.edit().putInt("$tipo.recusas", p.getInt("$tipo.recusas", 0) + 1).putLong("$tipo.em", agora).apply()
    /** O app já mostrou o pedido do Android para esta permissão (para saber quando o Android não deixa mais perguntar). */
    fun jaPediu(permissao: String) = p.getBoolean("pediu.$permissao", false)
    fun pediu(permissao: String) = p.edit().putBoolean("pediu.$permissao", true).apply()
}

/**
 * Pede a permissão de notificação do Android 13+ e devolve se as notificações vão aparecer. Quando o Android não deixa mais
 * perguntar (a pessoa já negou antes) ou as notificações do app estão desligadas nas configurações, abre as configurações.
 */
@Composable
fun rememberPedirNotificacoes(aoResponder: (Boolean) -> Unit): () -> Unit {
    val contexto = LocalContext.current
    val convites = remember { Convites(contexto) }
    val pedido = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { aoResponder(it && Push.permitido(contexto)) }
    return {
        val permissao = Manifest.permission.POST_NOTIFICATIONS
        val semPermissao = Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(contexto, permissao) != PackageManager.PERMISSION_GRANTED
        val atividade = contexto as? Activity
        when {
            semPermissao && (!convites.jaPediu(permissao) || (atividade != null && ActivityCompat.shouldShowRequestPermissionRationale(atividade, permissao))) -> {
                convites.pediu(permissao)
                pedido.launch(permissao)
            }
            Push.permitido(contexto) -> aoResponder(true)
            else -> {
                abrirConfiguracaoDeNotificacoes(contexto)
                aoResponder(false)
            }
        }
    }
}

/**
 * Convite das notificações, logo que a pessoa entra no app: aparece se ela não consentiu ou se o Android bloqueia as notificações.
 * "Permitir" grava o consentimento, pede a permissão do Android e registra o aparelho.
 */
@Composable
fun ConviteNotificacoes(m: Modelo) {
    val contexto = LocalContext.current
    val escopo = rememberCoroutineScope()
    val convites = remember { Convites(contexto) }
    val u = m.usuario ?: return
    var aberto by remember(u) { mutableStateOf((!u.optBoolean("notificacoes_consentidas") || !Push.permitido(contexto)) && convites.pode("notificacoes")) }
    val pedir = rememberPedirNotificacoes { _ ->
        escopo.launch {
            try {
                if (!u.optBoolean("notificacoes_consentidas")) m.api.put("/v1/me/consentimentos", JSONObject().put("notificacoes", true))
                m.recarregarUsuario()
                Push.registrar(m.api)
            } catch (_: SemConexao) {}
        }
    }
    if (!aberto) return
    AlertDialog(
        onDismissRequest = { aberto = false; convites.recusou("notificacoes") },
        title = { Text("Avisos de promoção no celular") },
        text = {
            Text("Avisamos quando aparecer uma promoção excepcional nas suas categorias ou quando um produto que você segue baixar de preço. " +
                "Respeitamos o seu horário de silêncio e o limite de avisos por dia.")
        },
        confirmButton = { TextButton({ aberto = false; pedir() }) { Text("Permitir") } },
        dismissButton = { TextButton({ aberto = false; convites.recusou("notificacoes") }) { Text("Agora não") } },
    )
}

/**
 * Botão e convite da localização no cadastro do CEP. `aoAchar` recebe o CEP; `aoFalhar`, a mensagem para a pessoa. O convite só
 * aparece com `convidar` (nenhum CEP preenchido) e se as recusas deixarem.
 */
@Composable
fun rememberCepPelaLocalizacao(aoAchar: (String) -> Unit, aoFalhar: (String) -> Unit): () -> Unit {
    val contexto = LocalContext.current
    val escopo = rememberCoroutineScope()
    val buscar = {
        escopo.launch {
            val cep = try { cepPelaLocalizacao(contexto) } catch (e: Exception) { null }
            if (cep != null) aoAchar(cep) else aoFalhar("Não deu para descobrir o CEP pela localização. Digite o CEP.")
        }
        Unit
    }
    val pedido = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { r ->
        if (r.values.any { it }) buscar() else aoFalhar("Sem a permissão de localização, digite o CEP.")
    }
    return {
        if (temLocalizacao(contexto)) buscar()
        else pedido.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }
}

@Composable
fun ConviteLocalizacao(convidar: Boolean, usarLocalizacao: () -> Unit) {
    val contexto = LocalContext.current
    val convites = remember { Convites(contexto) }
    var aberto by remember { mutableStateOf(convidar && !temLocalizacao(contexto) && convites.pode("localizacao")) }
    if (!aberto) return
    AlertDialog(
        onDismissRequest = { aberto = false; convites.recusou("localizacao") },
        title = { Text("Preencher o CEP pela localização?") },
        text = {
            Text("Usamos a localização só agora, no celular, para descobrir o seu CEP. Ela não é enviada ao economae nem guardada: " +
                "o app guarda só o CEP, que define as lojas que entregam para você.")
        },
        confirmButton = { TextButton({ aberto = false; usarLocalizacao() }) { Text("Usar localização") } },
        dismissButton = { TextButton({ aberto = false; convites.recusou("localizacao") }) { Text("Agora não") } },
    )
}

fun temLocalizacao(contexto: Context): Boolean =
    listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)
        .any { ContextCompat.checkSelfPermission(contexto, it) == PackageManager.PERMISSION_GRANTED }

/** Localização atual (ou a última conhecida, se recente) → CEP pelo Geocoder do aparelho. Null se não conseguir em 15 s. */
@SuppressLint("MissingPermission")
suspend fun cepPelaLocalizacao(contexto: Context): String? {
    if (!temLocalizacao(contexto) || !Geocoder.isPresent()) return null
    val lm = contexto.getSystemService(LocationManager::class.java) ?: return null
    val provedores = listOf(LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER).filter { lm.isProviderEnabled(it) }
    val recente = provedores.mapNotNull { lm.getLastKnownLocation(it) }.filter { System.currentTimeMillis() - it.time < 10 * 60_000 }.maxByOrNull { it.time }
    val local = recente ?: withTimeoutOrNull(15_000) {
        provedores.firstNotNullOfOrNull { provedor -> localAtual(lm, provedor) }
    } ?: return null
    return withContext(Dispatchers.IO) {
        val geocoder = Geocoder(contexto, Locale("pt", "BR"))
        if (Build.VERSION.SDK_INT >= 33) {
            suspendCancellableCoroutine { c ->
                geocoder.getFromLocation(local.latitude, local.longitude, 1, object : Geocoder.GeocodeListener {
                    override fun onGeocode(enderecos: MutableList<android.location.Address>) { if (c.isActive) c.resume(cepDoCodigoPostal(enderecos.firstOrNull()?.postalCode)) }
                    override fun onError(mensagem: String?) { if (c.isActive) c.resume(null) }
                })
            }
        } else {
            @Suppress("DEPRECATION")
            cepDoCodigoPostal(geocoder.getFromLocation(local.latitude, local.longitude, 1)?.firstOrNull()?.postalCode)
        }
    }
}

@SuppressLint("MissingPermission")
private suspend fun localAtual(lm: LocationManager, provedor: String): Location? = suspendCancellableCoroutine { c ->
    if (Build.VERSION.SDK_INT >= 30) {
        lm.getCurrentLocation(provedor, null, { it.run() }) { local -> if (c.isActive) c.resume(local) }
    } else {
        val ouvinte = object : LocationListener {
            override fun onLocationChanged(local: Location) { if (c.isActive) c.resume(local) }
            @Deprecated("Deprecated in Java") override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) { if (c.isActive) c.resume(null) }
        }
        @Suppress("DEPRECATION")
        lm.requestSingleUpdate(provedor, ouvinte, Looper.getMainLooper())
        c.invokeOnCancellation { lm.removeUpdates(ouvinte) }
    }
}
