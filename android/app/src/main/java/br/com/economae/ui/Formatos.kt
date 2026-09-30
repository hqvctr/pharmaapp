package br.com.economae.ui

import kotlin.math.abs
import kotlin.math.roundToLong

/** Igual ao backend (curadoria/formato.ts): não depende da localidade do aparelho. */
fun reais(centavos: Long): String {
    val negativo = centavos < 0
    val valor = abs(centavos)
    val inteiro = (valor / 100).toString().reversed().chunked(3).joinToString(".").reversed()
    val cents = (valor % 100).toString().padStart(2, '0')
    return "${if (negativo) "-" else ""}R$ $inteiro,$cents"
}

fun reais(centavos: Double): String = reais(centavos.roundToLong())

/**
 * Preço por unidade como a mãe compara na prateleira: por 100 ml ou 100 g, ou por unidade (fralda).
 * O backend manda em centavos por litro, quilo ou unidade.
 */
fun precoPorUnidadeTexto(centavosPorUnidadeBase: Double, unidade: String): String = when (unidade) {
    "l" -> "${reais(centavosPorUnidadeBase / 10)} por 100 ml"
    "kg" -> "${reais(centavosPorUnidadeBase / 10)} por 100 g"
    "un" -> "${reais(centavosPorUnidadeBase)} por unidade"
    else -> "${reais(centavosPorUnidadeBase)} por $unidade"
}

fun percentualAbaixo(queda: Double): String = "${(queda * 100).roundToLong()}% abaixo"

/** "2026-09-30" → "30/09". */
fun diaCurto(isoDia: String): String = isoDia.split("-").let { if (it.size == 3) "${it[2]}/${it[1]}" else isoDia }

fun cepFormatado(cep: String): String = if (cep.length == 8) "${cep.take(5)}-${cep.drop(5)}" else cep

fun emailValido(email: String): Boolean = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$").matches(email.trim())

fun horaValida(hora: String): Boolean = Regex("^([01][0-9]|2[0-3]):[0-5][0-9]$").matches(hora)
