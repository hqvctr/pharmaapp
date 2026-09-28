package app.promocao.formato

import app.promocao.modelo.OfertaUi

/** Qual texto de selo a oferta sustenta (ux/PROPOSTA_UX.md 4.2). Nunca promete mais do que foi medido. */
data class Selo(val tipo: Tipo, /** Nulo = 180 dias ou mais medidos ("6 meses"). */ val dias: Int?) {
    enum class Tipo { MENOR, QUASE }
}

object Prova {
    const val DIAS_SEIS_MESES = 180

    fun selo(oferta: OfertaUi): Selo {
        val p = oferta.prova
        val tipo = if (oferta.precoEfetivoCentavos <= p.menorPeriodoCentavos) Selo.Tipo.MENOR else Selo.Tipo.QUASE
        return Selo(tipo, if (p.diasMedidos >= DIAS_SEIS_MESES) null else p.diasMedidos)
    }

    /** Quanto o preço de hoje está acima do menor do período (0 quando é o menor). */
    fun distanciaDoMenor(oferta: OfertaUi): Double {
        val menor = oferta.prova.menorPeriodoCentavos
        return ((oferta.precoEfetivoCentavos - menor).toDouble() / menor).coerceAtLeast(0.0)
    }

    /**
     * Posições na Régua de preço, de 0 (menor do período, contando hoje) a 1 (maior do período).
     * Hoje pode ser menor que o piso anterior: a régua começa no menor dos dois.
     */
    data class Posicoes(val minimoCentavos: Long, val maximoCentavos: Long, val normal: Float, val hoje: Float)

    fun posicoes(oferta: OfertaUi): Posicoes {
        val p = oferta.prova
        val min = minOf(p.menorPeriodoCentavos, oferta.precoEfetivoCentavos)
        val max = maxOf(p.maiorPeriodoCentavos, p.precoNormalCentavos)
        val faixa = (max - min).coerceAtLeast(1).toFloat()
        return Posicoes(
            minimoCentavos = min,
            maximoCentavos = max,
            normal = ((p.precoNormalCentavos - min) / faixa).coerceIn(0f, 1f),
            hoje = ((oferta.precoEfetivoCentavos - min) / faixa).coerceIn(0f, 1f),
        )
    }
}
