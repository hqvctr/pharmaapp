package br.com.economae

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import org.json.JSONObject

/** Aba Favoritos (08 do KV): os produtos que a pessoa segue, com foto e o menor preço de agora. */
@Composable
fun AbaFavoritos(m: Modelo) {
    Column(Modifier.fillMaxSize()) {
        Text("Favoritos", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp))
        Carregar(m.versao, { todosOsSeguidos(m) }, puxar = true) { r, recarregar ->
            val itens = r.second
            if (r.first != null) { Erro(r.first!!, recarregar); return@Carregar }
            if (itens.isEmpty()) { Vazio("Você ainda não tem favoritos. Toque no coração de um produto para acompanhar o preço dele."); return@Carregar }
            LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(itens, key = { it.getString("id") }) { p -> LinhaProduto(m, p, { m.ir(Tela.Produto(p.getString("id"))) }) }
            }
        }
    }
}

/** Todos os seguidos (o teto é 100, em páginas de 50) como produtos prontos para `LinhaProduto`: a mensagem de erro (ou null) e a lista. */
suspend fun todosOsSeguidos(m: Modelo): Pair<String?, List<JSONObject>> {
    val saida = mutableListOf<JSONObject>()
    var cursor: String? = null
    repeat(4) {
        val r = m.api.get("/v1/seguidos?limite=50" + (cursor?.let { "&cursor=$it" } ?: ""))
        val corpo = r.corpo
        if (!r.ok || corpo == null) return r.mensagem to emptyList()
        saida += corpo.lista("itens").map { s -> seguidoComoProduto(s) }
        cursor = corpo.textoOuNulo("proximo_cursor")
        if (cursor == null) return null to saida
    }
    return null to saida
}

/** Um `Seguimento` da API vira o formato de produto das listas: o coração já nasce cheio. */
fun seguidoComoProduto(s: JSONObject): JSONObject {
    val p = JSONObject(s.getJSONObject("produto").toString())
    p.put("menor_preco_centavos", if (s.isNull("menor_preco_centavos") || !s.has("menor_preco_centavos")) JSONObject.NULL else s.getInt("menor_preco_centavos"))
    p.put("seguido", true)
    return p
}
