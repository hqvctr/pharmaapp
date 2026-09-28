package app.promocao.formato

import app.promocao.modelo.Embalagem
import app.promocao.modelo.UnidadeBase
import java.time.LocalDate
import java.time.LocalTime
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToLong

/**
 * Formatação pt-BR feita à mão, igual em todo aparelho (a do sistema varia com versão e usa espaço
 * não separável, que conta diferente no limite de caracteres da notificação). Mesmo critério do
 * backend (`backend/src/curadoria/formato.ts`).
 */
object Formato {

    /**
     * 123456 → "R$ 1.234,56", com espaço não separável depois de "R$": o símbolo nunca fica numa
     * linha e o número na outra (fonte a 200%). Conta como 1 caractere no limite da notificação.
     */
    fun reais(centavos: Long): String {
        val negativo = centavos < 0
        val inteiro = abs(centavos)
        return (if (negativo) "-" else "") + "R$\u00A0" + milhar(inteiro / 100) + "," + (inteiro % 100).toString().padStart(2, '0')
    }

    /** 1284 → "1.284". */
    fun milhar(n: Long): String = n.toString().reversed().chunked(3).joinToString(".").reversed()

    fun milhar(n: Int): String = milhar(n.toLong())

    /** 0,3339 → "33%". */
    fun percentual(fracao: Double): String = "${(fracao * 100).roundToLong()}%"

    fun hora(t: LocalTime): String = String.format(Locale.ROOT, "%02d:%02d", t.hour, t.minute)

    fun data(d: LocalDate): String = String.format(Locale.ROOT, "%02d/%02d", d.dayOfMonth, d.monthValue)

    /** 1.234 → "1,2 km". */
    fun km(distancia: Double): String = String.format(Locale.ROOT, "%.1f", distancia).replace('.', ',') + " km"

    /** "01310100" → "01310-100". Aceita parcial, para a máscara do campo. */
    fun cep(digitos: String): String = if (digitos.length <= 5) digitos else digitos.take(5) + "-" + digitos.drop(5).take(3)

    enum class UnidadeExibicao { POR_100ML, POR_100G, POR_UNIDADE }

    /**
     * Preço por unidade na escala do produto (S-18): por 100 ml, por 100 g ou por unidade.
     * Nunca por litro de protetor (U05).
     */
    fun precoPorUnidade(precoCentavos: Long, embalagem: Embalagem): Pair<UnidadeExibicao, Long> = when (embalagem.unidade) {
        UnidadeBase.L -> UnidadeExibicao.POR_100ML to (precoCentavos * 0.1 / embalagem.quantidade).roundToLong()
        UnidadeBase.KG -> UnidadeExibicao.POR_100G to (precoCentavos * 0.1 / embalagem.quantidade).roundToLong()
        UnidadeBase.UN -> UnidadeExibicao.POR_UNIDADE to (precoCentavos / embalagem.quantidade).roundToLong()
    }
}

/** Validação do CEP digitado. Região inicial: estado de SP (DECISIONS.md 19). */
object Cep {
    private const val INICIO_SP = 1_000_000
    private const val FIM_SP = 19_999_999

    sealed interface Resultado {
        data object Incompleto : Resultado
        data class ForaDaRegiao(val digitos: String) : Resultado
        data class Valido(val digitos: String) : Resultado
    }

    fun somenteDigitos(texto: String): String = texto.filter(Char::isDigit).take(8)

    fun validar(texto: String): Resultado {
        val d = somenteDigitos(texto)
        if (d.length < 8) return Resultado.Incompleto
        return if (d.toInt() in INICIO_SP..FIM_SP) Resultado.Valido(d) else Resultado.ForaDaRegiao(d)
    }
}
