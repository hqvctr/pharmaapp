package br.com.economae.dados

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

/** Erro com o código estável do contrato; o app decide pelo código, nunca pela mensagem. */
class ErroApi(val status: Int, val codigo: String, mensagem: String) : Exception(mensagem) {
    companion object {
        const val SEM_CONEXAO = "SEM_CONEXAO"
        const val RESPOSTA_INVALIDA = "RESPOSTA_INVALIDA"
    }
}

val JsonEconomae = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

private val TIPO_JSON = "application/json; charset=utf-8".toMediaType()

/** Cliente HTTP da API v1. Toda chamada leva X-Tenant; as autenticadas, o token da sessão. */
class ApiEconomae(
    private val base: HttpUrl,
    private val tenant: String,
    private val cliente: OkHttpClient,
    private val token: suspend () -> String?,
) {
    suspend fun configuracao(): Configuracao = chamar("GET", "v1/configuracao", Configuracao.serializer())

    suspend fun pedirCodigo(email: String): CodigoEnviado =
        chamar("POST", "v1/auth/email/codigo", CodigoEnviado.serializer(), corpo(PedidoCodigo.serializer(), PedidoCodigo(email)))

    suspend fun verificarCodigo(email: String, codigo: String): Sessao =
        chamar("POST", "v1/auth/email/verificar", Sessao.serializer(), corpo(VerificacaoCodigo.serializer(), VerificacaoCodigo(email, codigo)))

    suspend fun entrarComGoogle(idToken: String): Sessao =
        chamar("POST", "v1/auth/google", Sessao.serializer(), corpo(LoginGoogle.serializer(), LoginGoogle(idToken)))

    suspend fun sair() = chamarSemCorpo("POST", "v1/auth/sair")

    suspend fun usuario(): Usuario = chamar("GET", "v1/eu", Usuario.serializer())

    suspend fun aceitarTermos(versao: String): Usuario =
        chamar("PUT", "v1/eu/termos", Usuario.serializer(), corpo(AceiteTermos.serializer(), AceiteTermos(versao)))

    suspend fun definirNotificacoes(consentidas: Boolean): Usuario =
        chamar("PUT", "v1/eu/notificacoes", Usuario.serializer(), corpo(Consentimento.serializer(), Consentimento(consentidas)))

    suspend fun excluirConta() = chamarSemCorpo("DELETE", "v1/eu")

    suspend fun preferencias(): Preferencias = chamar("GET", "v1/preferencias", Preferencias.serializer())

    suspend fun salvarPreferencias(p: PreferenciasEnvio): Preferencias =
        chamar("PUT", "v1/preferencias", Preferencias.serializer(), corpo(PreferenciasEnvio.serializer(), p))

    suspend fun feed(cursor: String? = null, categoria: String? = null, limite: Int? = null): PaginaFeed {
        val consulta = buildList {
            cursor?.let { add("cursor" to it) }
            categoria?.let { add("categoria" to it) }
            limite?.let { add("limite" to it.toString()) }
        }
        return chamar("GET", "v1/feed", PaginaFeed.serializer(), consulta = consulta)
    }

    suspend fun oferta(id: String): Oferta = chamar("GET", "v1/ofertas/$id", Oferta.serializer())

    suspend fun registrarDispositivo(tokenFcm: String) =
        chamarSemCorpo("PUT", "v1/dispositivos", corpo(RegistroDispositivo.serializer(), RegistroDispositivo(tokenFcm)))

    suspend fun registrarAbertura(entregaId: String) = chamarSemCorpo("POST", "v1/entregas/$entregaId/abertura")

    private fun <T> corpo(s: KSerializer<T>, valor: T): String = JsonEconomae.encodeToString(s, valor)

    private suspend fun chamarSemCorpo(metodo: String, caminho: String, corpo: String? = null) {
        executar(metodo, caminho, corpo, emptyList())
    }

    private suspend fun <T> chamar(
        metodo: String,
        caminho: String,
        serializer: KSerializer<T>,
        corpo: String? = null,
        consulta: List<Pair<String, String>> = emptyList(),
    ): T {
        val texto = executar(metodo, caminho, corpo, consulta)
        return try {
            JsonEconomae.decodeFromString(serializer, texto)
        } catch (e: IllegalArgumentException) {
            throw ErroApi(0, ErroApi.RESPOSTA_INVALIDA, "Resposta inesperada do servidor.")
        }
    }

    private suspend fun executar(metodo: String, caminho: String, corpo: String?, consulta: List<Pair<String, String>>): String {
        val url = base.newBuilder().addPathSegments(caminho).apply {
            consulta.forEach { (k, v) -> addQueryParameter(k, v) }
        }.build()
        val pedido = Request.Builder()
            .url(url)
            .header("X-Tenant", tenant)
            .header("Accept", "application/json")
            .apply { token()?.let { header("Authorization", "Bearer $it") } }
            .method(metodo, corpo?.toRequestBody(TIPO_JSON) ?: if (metodo == "GET" || metodo == "DELETE") null else ByteArray(0).toRequestBody(null))
            .build()
        return withContext(Dispatchers.IO) {
            try {
                cliente.newCall(pedido).execute().use { r ->
                    val texto = r.body.string()
                    if (r.isSuccessful) return@use texto
                    val erro = runCatching { JsonEconomae.decodeFromString(CorpoErro.serializer(), texto).erro }.getOrNull()
                    throw ErroApi(r.code, erro?.codigo ?: "HTTP_${r.code}", erro?.mensagem ?: "Erro no servidor (${r.code}).")
                }
            } catch (e: IOException) {
                throw ErroApi(0, ErroApi.SEM_CONEXAO, "Sem conexão com o servidor. Tente de novo.")
            }
        }
    }
}
