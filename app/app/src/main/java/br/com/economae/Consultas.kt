package br.com.economae

import org.json.JSONObject
import java.net.URLEncoder

/** Ordem da lista de produtos (`ordem` de GET /v1/produtos). `padrao` não manda o parâmetro: a API decide. */
enum class Ordem(val parametro: String?, val rotulo: String) {
    Novidades(null, "Mais novos"),
    MenorPreco("menor_preco", "Menor preço"),
    MaiorPreco("maior_preco", "Maior preço"),
    Nome("nome", "A a Z"),
}

private fun cod(v: String) = URLEncoder.encode(v, "UTF-8")

/**
 * Pedido de produtos sem o cursor (o cursor entra a cada página). `q` vazio = navegação por categoria; com `q` = pesquisa.
 * `subcategoria` só vale com `categoria` (a API recusa sem ela).
 */
fun consultaProdutos(q: String? = null, categoria: String? = null, subcategoria: String? = null, ordem: Ordem = Ordem.Novidades, limite: Int = 20): String {
    val partes = mutableListOf("limite=$limite")
    if (!q.isNullOrBlank()) partes += "q=${cod(q.trim())}"
    if (categoria != null) {
        partes += "categoria=${cod(categoria)}"
        if (subcategoria != null) partes += "subcategoria=${cod(subcategoria)}"
    }
    ordem.parametro?.let { partes += "ordem=$it" }
    return "/v1/produtos?" + partes.joinToString("&")
}

/** Um cartão da vitrine do Início: de um alerta de queda ou, sem alertas, de um produto do catálogo. */
class Destaque(val tela: Tela, val nome: String, val imagem: String?, val precoCentavos: Int?, val queda: String?)

/** Alerta com queda de verdade: oferta manual (sem histórico verificado) vem com queda 0 e não ganha selo de "-0%". */
fun temQueda(a: JSONObject): Boolean = a.optDouble("queda", 0.0) > 0.0

fun destaqueDeAlerta(a: JSONObject): Destaque {
    val p = a.getJSONObject("produto")
    return Destaque(Tela.Alerta(a.getString("id")), p.getString("nome"), p.textoOuNulo("imagem_url"), a.inteiroOuNulo("preco_centavos"), if (temQueda(a)) "-" + percentual(a.getDouble("queda")) else null)
}

fun destaqueDeProduto(p: JSONObject) = Destaque(Tela.Produto(p.getString("id")), p.getString("nome"), p.textoOuNulo("imagem_url"), p.inteiroOuNulo("menor_preco_centavos"), null)

/** Intercala as listas (uma de cada categoria) para a vitrine mostrar todas: 1º de cada, 2º de cada... até `max`. */
fun <T> intercalar(listas: List<List<T>>, max: Int): List<T> {
    val saida = mutableListOf<T>()
    var i = 0
    while (saida.size < max && listas.any { i < it.size }) {
        for (l in listas) if (i < l.size && saida.size < max) saida += l[i]
        i += 1
    }
    return saida
}

/** "Fraldas, Higiene e Alimentação" a partir dos rótulos das subcategorias (no máximo 3; mais que isso vira "e mais"). */
fun resumoDeSubcategorias(rotulos: List<String>): String = when {
    rotulos.isEmpty() -> ""
    rotulos.size == 1 -> rotulos[0]
    rotulos.size == 2 -> "${rotulos[0]} e ${rotulos[1]}"
    rotulos.size == 3 -> "${rotulos[0]}, ${rotulos[1]} e ${rotulos[2]}"
    else -> "${rotulos[0]}, ${rotulos[1]}, ${rotulos[2]} e mais"
}
