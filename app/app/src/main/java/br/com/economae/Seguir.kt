package br.com.economae

import org.json.JSONObject

/** Avisos de um produto recém-seguido pela estrela ou pelo coração: só a promoção excepcional, como na prévia anterior. */
fun avisosPadrao(): JSONObject = JSONObject().put("promocao_excepcional", true).put("queda_percentual", JSONObject.NULL)
    .put("voltou_estoque", false).put("menor_preco_180d", false).put("promocao_acabando", false)

const val MENSAGEM_NAO_SEGUE = "Este produto não pode ser seguido (por regra legal, só aparece nas promoções)."

/** Segue ou deixa de seguir. Devolve null se deu certo, ou a mensagem para mostrar. */
suspend fun alternarSeguir(m: Modelo, produtoId: String, seguido: Boolean): String? {
    val r = if (seguido) m.api.delete("/v1/seguidos/$produtoId") else m.api.put("/v1/seguidos/$produtoId", JSONObject().put("avisos", avisosPadrao()))
    if (r.ok) { m.mudou(); return null }
    return if (r.status == 404) MENSAGEM_NAO_SEGUE else r.mensagem
}
