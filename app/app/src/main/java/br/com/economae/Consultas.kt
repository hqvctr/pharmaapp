package br.com.economae

import org.json.JSONObject
import java.net.URLEncoder

/** Ordem da lista de produtos (`ordem` de GET /v1/produtos). `parametro` null não manda o parâmetro: a API usa a relevância da pesquisa. */
enum class Ordem(val parametro: String?, val rotulo: String) {
    Relevancia(null, "Relevância"),
    Novidades("mais_novos", "Mais novos"),
    MaiorQueda("maior_queda", "Maior queda"),
    MenorPreco("menor_preco", "Menor preço"),
    MenorPrecoUnidade("menor_preco_unidade", "Menor preço por unidade"),
    MaiorPreco("maior_preco", "Maior preço"),
    Nome("nome", "A a Z"),
    ParaVoce("para_voce", "Para você");

    companion object {
        /** O que o "Ordenar" oferece na categoria e nas listas (a primeira é a padrão). */
        val daCategoria = listOf(Novidades, MaiorQueda, MenorPreco, MenorPrecoUnidade, MaiorPreco, Nome)
        /** O que o "Ordenar" oferece na pesquisa. */
        val daPesquisa = listOf(Relevancia, MaiorQueda, MenorPreco, MenorPrecoUnidade, MaiorPreco, Nome)
        fun doParametro(p: String?): Ordem = entries.firstOrNull { it.parametro == p } ?: Novidades
    }
}

/** Filtros da folha "Filtros" (os nomes de loja e marca só servem para o chip mostrar). Vazio = nenhum filtro. */
data class Filtros(
    val comQueda: Boolean = false,
    val menorPreco180d: Boolean = false,
    val precoMin: Int? = null,
    val precoMax: Int? = null,
    val lojaId: String? = null,
    val lojaNome: String? = null,
    val marca: String? = null,
    val marcaNome: String? = null,
) {
    /** Quantos filtros estão ligados (o número do botão "Filtros"). */
    val ativos: Int get() = listOf(comQueda, menorPreco180d, precoMin != null || precoMax != null, lojaId != null, marca != null).count { it }
}

private fun cod(v: String) = URLEncoder.encode(v, "UTF-8")

/**
 * Pedido de produtos sem o cursor (o cursor entra a cada página). `q` vazio = navegação por categoria; com `q` = pesquisa.
 * `subcategoria` só vale com `categoria` (a API recusa sem ela). `facetas` pede as lojas e marcas do resultado para a folha de filtros.
 */
fun consultaProdutos(q: String? = null, categoria: String? = null, subcategoria: String? = null, ordem: Ordem = Ordem.Relevancia, limite: Int = 20,
                     filtros: Filtros = Filtros(), facetas: Boolean = false): String {
    val partes = mutableListOf("limite=$limite")
    if (!q.isNullOrBlank()) partes += "q=${cod(q.trim())}"
    if (categoria != null) {
        partes += "categoria=${cod(categoria)}"
        if (subcategoria != null) partes += "subcategoria=${cod(subcategoria)}"
    }
    ordem.parametro?.let { partes += "ordem=$it" }
    if (filtros.comQueda) partes += "com_queda=true"
    if (filtros.menorPreco180d) partes += "menor_preco_180d=true"
    filtros.precoMin?.let { partes += "preco_min=$it" }
    filtros.precoMax?.let { partes += "preco_max=$it" }
    filtros.lojaId?.let { partes += "loja_id=${cod(it)}" }
    filtros.marca?.let { partes += "marca=${cod(it)}" }
    if (facetas) partes += "facetas=true"
    return "/v1/produtos?" + partes.joinToString("&")
}

/** "Ver todas" de uma fileira do Início: os parâmetros de `ver_todas` viram categoria, ordem e filtros da lista. */
data class VerTodas(val categoria: String?, val subcategoria: String?, val ordem: Ordem, val filtros: Filtros)

fun verTodasDe(j: JSONObject): VerTodas = VerTodas(
    categoria = j.textoOuNulo("categoria"),
    subcategoria = j.textoOuNulo("subcategoria"),
    ordem = Ordem.doParametro(j.textoOuNulo("ordem")),
    filtros = Filtros(comQueda = j.optBoolean("com_queda"), menorPreco180d = j.optBoolean("menor_preco_180d")),
)

/** Os "vistos recentemente": o id aberto vai para a frente, sem repetir, até `max`. */
fun registrarVisto(vistos: List<String>, id: String, max: Int = 20): List<String> = (listOf(id) + vistos.filter { it != id }).take(max)

/** Põe os produtos que a API devolveu na ordem dos vistos (a API devolve na ordem dela). */
fun naOrdemDosVistos(vistos: List<String>, itens: List<JSONObject>): List<JSONObject> {
    val porId = itens.associateBy { it.getString("id") }
    return vistos.mapNotNull { porId[it] }
}

/** Alerta com queda de verdade: oferta manual (sem histórico verificado) vem com queda 0 e não ganha selo de "-0%". */
fun temQueda(a: JSONObject): Boolean = a.optDouble("queda", 0.0) > 0.0

/** "Fraldas, Higiene e Alimentação" a partir dos rótulos das subcategorias (no máximo 3; mais que isso vira "e mais"). */
fun resumoDeSubcategorias(rotulos: List<String>): String = when {
    rotulos.isEmpty() -> ""
    rotulos.size == 1 -> rotulos[0]
    rotulos.size == 2 -> "${rotulos[0]} e ${rotulos[1]}"
    rotulos.size == 3 -> "${rotulos[0]}, ${rotulos[1]} e ${rotulos[2]}"
    else -> "${rotulos[0]}, ${rotulos[1]}, ${rotulos[2]} e mais"
}
