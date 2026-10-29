package br.com.economae

import org.json.JSONObject
import java.text.NumberFormat
import java.util.Locale

private val reais = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))

/** 5990 → "R$ 59,90" (o contrato fala sempre em centavos inteiros). */
fun reais(centavos: Number): String = reais.format(centavos.toDouble() / 100.0)

fun percentual(fracao: Double): String = "${Math.round(fracao * 100)}%"

fun cepBonito(cep: String): String = if (cep.length == 8) "${cep.substring(0, 5)}-${cep.substring(5)}" else cep

/** "2026-10-27T12:00:05Z" → "27/10 12:00" (hora de Brasília). */
fun dataHora(iso: String?): String {
    if (iso == null) return ""
    return try {
        val t = java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo"))
        t.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm"))
    } catch (e: Exception) { iso }
}

fun dataCurta(iso: String?): String {
    if (iso == null) return ""
    return try {
        java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.of("America/Sao_Paulo"))
            .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))
    } catch (e: Exception) { iso }
}

fun embalagemTexto(p: JSONObject): String {
    val e = p.getJSONObject("embalagem")
    val q = e.getDouble("quantidade")
    val qs = if (q == Math.floor(q)) q.toLong().toString() else q.toString().replace('.', ',')
    return "$qs ${e.getString("unidade")}"
}

fun freteTexto(f: JSONObject): String = when (f.getString("status")) {
    "conhecido" -> "Frete ${reais(f.getInt("centavos"))}"
    "nao_se_aplica" -> "Sem frete"
    else -> "Frete a confirmar"
}

/**
 * Preço por unidade do cartão a partir de `menor_preco_por_unidade_centavos` (centavos por un, por kg ou por l):
 * "R$ 0,45/un"; peso e volume por 100 g e 100 ml, que é como a gôndola mostra. Null quando não ajuda: sem preço ou item avulso.
 */
fun precoPorUnidadeTexto(p: JSONObject): String? {
    if (p.isNull("menor_preco_por_unidade_centavos") || !p.has("menor_preco_por_unidade_centavos")) return null
    val v = p.getDouble("menor_preco_por_unidade_centavos")
    val e = p.getJSONObject("embalagem")
    return when (e.getString("unidade")) {
        "un" -> if (e.getDouble("quantidade") > 1.0) "${reais(v)}/un" else null
        "kg" -> "${reais(v / 10.0)}/100 g"
        "l" -> "${reais(v / 10.0)}/100 ml"
        else -> null
    }
}
