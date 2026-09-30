package br.com.economae

import android.content.Context
import br.com.economae.dados.ApiEconomae
import br.com.economae.dados.ArmazemSessao
import br.com.economae.dados.ArmazemSessaoDataStore
import br.com.economae.dados.ErroApi
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.dados.RepositorioRemoto
import br.com.economae.push.FontePush
import br.com.economae.push.FontePushFirebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/** Injeção de dependência manual: poucas peças, sem gerador de código. */
class Container(contexto: Context, apiUrl: String = BuildConfig.API_URL) {
    val escopo = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()
    val sessao: ArmazemSessao = ArmazemSessaoDataStore(contexto.applicationContext)
    val repositorio: RepositorioEconomae = RepositorioRemoto(
        ApiEconomae(apiUrl.toHttpUrl(), BuildConfig.TENANT, httpClient) { sessao.tokenAtual() },
        sessao,
    )
    val push: FontePush = FontePushFirebase(contexto.applicationContext)

    /**
     * Token novo do FCM, ou app aberto com sessão: registra o aparelho (idempotente no servidor).
     * Só com consentimento: sem ele o token do aparelho nem sai do celular.
     */
    suspend fun registrarAparelhoSeLogado(token: String? = null) {
        if (sessao.tokenAtual() == null || !push.disponivel) return
        try {
            if (!repositorio.usuario().notificacoes.consentidas) return
            val fcm = token ?: push.tokenAtual() ?: return
            repositorio.registrarDispositivo(fcm)
        } catch (_: ErroApi) {
            // Sem rede, termos pendentes ou sessão recusada: tenta de novo na próxima abertura.
        }
    }
}
