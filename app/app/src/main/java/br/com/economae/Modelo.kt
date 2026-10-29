package br.com.economae

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import org.json.JSONObject

sealed interface Tela {
    data object Entrar : Tela
    data object Termos : Tela
    data object Preferencias : Tela
    data class Principal(val aba: Int = 0) : Tela
    data class Alerta(val id: String, val origem: String = "feed") : Tela
    data class Produto(val id: String) : Tela
    /** Página de uma categoria do app (slug de /v1/configuracao), já numa subcategoria se `sub` vier. */
    data class Categoria(val slug: String, val sub: String? = null) : Tela
    /** Pesquisa de produto; com `categoria`, só dentro dela. */
    data class Busca(val categoria: String? = null) : Tela
    /** Todas as promoções verificadas (o feed de alertas, que também mostra os produtos com aviso legal). */
    data object Feed : Tela
    /** "Ver todas" de uma fileira do Início: a lista completa, com ordenar e filtrar. */
    data class Lista(val titulo: String, val v: VerTodas) : Tela
}

/** Abas da barra de baixo, na ordem do KV (Cupons ficou de fora: não há dado). */
object Abas {
    const val INICIO = 0
    const val CATEGORIAS = 1
    const val FAVORITOS = 2
    const val AVISOS = 3
    const val PERFIL = 4
}

/** Estado do app inteiro (prévia): servidor, sessão, configuração do tenant, conta e a pilha de telas. */
class Modelo(contexto: Context) {
    val arm = Armazenamento(contexto)
    val api = Api(arm)

    var config by mutableStateOf<JSONObject?>(null)
    var usuario by mutableStateOf<JSONObject?>(null)
    var naoLidos by mutableIntStateOf(0)
    var pilha by mutableStateOf<List<Tela>>(listOf(Tela.Entrar))
    /** Contador que as telas observam para recarregar listas depois de uma mudança (seguir, silenciar, preferências). */
    var versao by mutableIntStateOf(0)

    val tela: Tela get() = pilha.last()

    /** Categorias do app, na ordem da configuração do servidor (Gestação, Mamãe, Bebê, Infantil). */
    val categorias: List<JSONObject> get() = config?.optJSONArray("categorias")?.objetos() ?: emptyList()
    fun categoria(slug: String): JSONObject? = categorias.firstOrNull { it.getString("slug") == slug }

    fun ir(t: Tela) { pilha = pilha + t }
    fun voltar(): Boolean { if (pilha.size <= 1) return false; pilha = pilha.dropLast(1); return true }
    fun raiz(t: Tela) { pilha = listOf(t) }
    fun mudou() { versao += 1 }

    fun sair() {
        arm.limparSessao()
        usuario = null
        naoLidos = 0
        raiz(Tela.Entrar)
    }

    /** Depois de entrar ou abrir o app: termos pendentes → termos; sem categoria ou CEP → preferências; senão o feed. */
    suspend fun seguirFluxo() {
        val me = api.get("/v1/me")
        if (!me.ok || me.corpo == null) { sair(); return }
        usuario = me.corpo
        if (me.corpo.getBoolean("termos_pendentes")) { raiz(Tela.Termos); return }
        val pref = api.get("/v1/preferencias")
        val p = pref.corpo
        if (pref.ok && p != null && (p.getJSONArray("categorias").length() == 0 || p.getJSONArray("ceps").length() == 0)) { raiz(Tela.Preferencias); return }
        raiz(Tela.Principal())
        atualizarNaoLidos()
    }

    suspend fun atualizarNaoLidos() {
        val r = api.get("/v1/avisos?limite=1")
        if (r.ok && r.corpo != null) naoLidos = r.corpo.optInt("nao_lidos", 0)
    }

    suspend fun recarregarUsuario() {
        val r = api.get("/v1/me")
        if (r.ok && r.corpo != null) usuario = r.corpo
    }
}
