package br.com.economae

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

/** Resposta da API: `corpo` é o JSON (objeto) quando houve; `codigo` e `mensagem` vêm do erro único do contrato. */
class Resposta(val status: Int, val corpo: JSONObject?, val bruto: String) {
    val ok get() = status in 200..299
    val codigo: String? get() = if (ok) null else corpo?.optString("codigo")
    val mensagem: String
        get() = when {
            ok -> ""
            corpo?.has("campos") == true -> {
                val c = corpo.optJSONArray("campos")
                (0 until (c?.length() ?: 0)).joinToString(" ") { c!!.getJSONObject(it).optString("mensagem") }
                    .ifBlank { corpo.optString("mensagem") }
            }
            else -> corpo?.optString("mensagem")?.takeIf { it.isNotBlank() } ?: "Erro $status"
        }
}

class SemConexao(mensagem: String) : IOException(mensagem)

/** Guarda servidor e sessão. Só para a prévia: os tokens ficam em SharedPreferences comum. */
class Armazenamento(contexto: Context) {
    private val p = contexto.getSharedPreferences("economae", Context.MODE_PRIVATE)
    var servidor: String
        get() = p.getString("servidor", "") ?: ""
        set(v) = p.edit().putString("servidor", v.trim().trimEnd('/')).apply()
    var access: String?
        get() = p.getString("access", null)
        set(v) = p.edit().putString("access", v).apply()
    var refresh: String?
        get() = p.getString("refresh", null)
        set(v) = p.edit().putString("refresh", v).apply()
    fun limparSessao() = p.edit().remove("access").remove("refresh").apply()
    /** Produtos abertos por último (ids, o mais recente primeiro): a fileira "Vistos recentemente" do Início. Fica só no aparelho. */
    var vistos: List<String>
        get() = (p.getString("vistos", "") ?: "").split(',').filter { it.isNotBlank() }
        set(v) = p.edit().putString("vistos", v.joinToString(",")).apply()
}

class Api(private val arm: Armazenamento) {
    private val renovando = Mutex()

    suspend fun get(caminho: String, auth: Boolean = true) = chamar("GET", caminho, null, auth)
    suspend fun post(caminho: String, corpo: JSONObject? = null, auth: Boolean = true, extra: Map<String, String> = emptyMap()) = chamar("POST", caminho, corpo, auth, extra)
    suspend fun put(caminho: String, corpo: JSONObject? = null) = chamar("PUT", caminho, corpo, true)
    suspend fun delete(caminho: String, corpo: JSONObject? = null) = chamar("DELETE", caminho, corpo, true)

    suspend fun chamar(metodo: String, caminho: String, corpo: JSONObject?, auth: Boolean, extra: Map<String, String> = emptyMap()): Resposta {
        val r = uma(metodo, caminho, corpo, auth, extra)
        // Access vence em 1 h: renova uma vez com o refresh e repete.
        if (auth && r.status == 401 && r.codigo == "sessao_expirada" && renovar()) return uma(metodo, caminho, corpo, auth, extra)
        return r
    }

    private suspend fun renovar(): Boolean = renovando.withLock {
        val refresh = arm.refresh ?: return false
        val r = uma("POST", "/v1/auth/renovar", JSONObject().put("refresh_token", refresh), false, emptyMap())
        if (!r.ok || r.corpo == null) { arm.limparSessao(); return false }
        guardarSessao(r.corpo)
        true
    }

    fun guardarSessao(s: JSONObject) {
        arm.access = s.getString("access_token")
        arm.refresh = s.getString("refresh_token")
    }

    private suspend fun uma(metodo: String, caminho: String, corpo: JSONObject?, auth: Boolean, extra: Map<String, String>): Resposta = withContext(Dispatchers.IO) {
        if (arm.servidor.isBlank()) throw SemConexao("Informe o endereço do servidor.")
        val c = try {
            (URL(arm.servidor + caminho).openConnection() as HttpURLConnection)
        } catch (e: Exception) {
            throw SemConexao("Endereço do servidor inválido.")
        }
        try {
            c.requestMethod = metodo
            c.connectTimeout = 10_000
            c.readTimeout = 20_000
            c.setRequestProperty("Accept", "application/json")
            c.setRequestProperty("X-Tenant", BuildConfig.TENANT)
            if (auth) arm.access?.let { c.setRequestProperty("Authorization", "Bearer $it") }
            extra.forEach { (k, v) -> c.setRequestProperty(k, v) }
            if (corpo != null) {
                c.doOutput = true
                c.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                c.outputStream.use { it.write(corpo.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = c.responseCode
            val fluxo = if (status >= 400) c.errorStream else c.inputStream
            val texto = fluxo?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val json = try { if (texto.isBlank()) null else JSONObject(texto) } catch (e: Exception) { null }
            Resposta(status, json, texto)
        } catch (e: SemConexao) {
            throw e
        } catch (e: IOException) {
            throw SemConexao("Sem conexão com o servidor (${arm.servidor}). Confira o endereço e se o servidor está ligado.")
        } finally {
            c.disconnect()
        }
    }

    companion object {
        fun novaChave(): Map<String, String> = mapOf("Idempotency-Key" to UUID.randomUUID().toString())
    }
}

fun JSONObject.textoOuNulo(chave: String): String? = if (isNull(chave) || !has(chave)) null else getString(chave)
fun JSONObject.inteiroOuNulo(chave: String): Int? = if (isNull(chave) || !has(chave)) null else getInt(chave)
fun JSONArray.objetos(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
fun JSONArray.textos(): List<String> = (0 until length()).map { getString(it) }
fun JSONObject.lista(chave: String): List<JSONObject> = optJSONArray(chave)?.objetos() ?: emptyList()
