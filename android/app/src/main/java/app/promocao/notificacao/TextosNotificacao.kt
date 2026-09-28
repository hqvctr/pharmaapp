package app.promocao.notificacao

import android.content.Context
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.formato.Prova
import app.promocao.formato.Selo
import app.promocao.modelo.CoberturaUi
import app.promocao.modelo.CondicaoUi
import app.promocao.modelo.OfertaUi

/** Modelos de texto da notificação (strings.xml, seção 1). Separados do Context para o teste JVM. */
data class ModelosNotificacao(
    val titulo: String,
    val tituloLeve: String,
    val menorMeses: String,
    val menorDias: String,
    val menorCurto: String,
    val abaixoNormal: String,
    val quaseMenor: String,
    val levePague: String,
    val cartao: String,
    val cartaoCurto: String,
    val appLoja: String,
    val quantidade: String,
    val caiuMais: String,
    val retirada: String,
) {
    companion object {
        fun de(context: Context) = ModelosNotificacao(
            titulo = context.getString(R.string.notif_titulo),
            tituloLeve = context.getString(R.string.notif_titulo_condicao_leve),
            menorMeses = context.getString(R.string.notif_texto_menor_meses),
            menorDias = context.getString(R.string.notif_texto_menor_dias),
            menorCurto = context.getString(R.string.notif_texto_menor_curto),
            abaixoNormal = context.getString(R.string.notif_texto_abaixo_normal),
            quaseMenor = context.getString(R.string.notif_texto_quase_menor),
            levePague = context.getString(R.string.notif_texto_leve_pague),
            cartao = context.getString(R.string.notif_texto_cartao),
            cartaoCurto = context.getString(R.string.notif_texto_cartao_curto),
            appLoja = context.getString(R.string.notif_texto_app_loja),
            quantidade = context.getString(R.string.notif_texto_quantidade),
            caiuMais = context.getString(R.string.notif_texto_caiu_mais),
            retirada = context.getString(R.string.notif_texto_retirada),
        )
    }
}

/**
 * Título (≤ 30) e texto recolhido (≤ 40) da notificação — limites da diretriz Android.
 * O título começa pelo preço e só o nome é cortado. O texto tenta modelos em ordem e usa o
 * primeiro que cabe; a condição vem antes da prova (princípio 4).
 */
object TextosNotificacao {
    const val MAX_TITULO = 30
    const val MAX_TEXTO = 40
    private const val RETICENCIAS = "…"

    fun titulo(o: OfertaUi, m: ModelosNotificacao): String {
        val condicao = o.condicao
        return if (condicao is CondicaoUi.LevePague) {
            encaixarNome(o.nomeCurto) { nome -> m.tituloLeve.format(Formato.reais(o.totalCompraMinimaCentavos), condicao.leve, nome) }
        } else {
            encaixarNome(o.nomeCurto) { nome -> m.titulo.format(Formato.reais(o.precoCentavos), nome) }
        }
    }

    fun texto(o: OfertaUi, m: ModelosNotificacao): String {
        val econ = Formato.reais(o.economiaCentavos)
        val candidatos = mutableListOf<String>()
        o.precoAnteriorAvisoCentavos?.let { candidatos += m.caiuMais.format(Formato.reais(it)) }
        when (val c = o.condicao) {
            is CondicaoUi.LevePague -> candidatos += m.levePague.format(c.leve, c.pague, econ)
            is CondicaoUi.QuantidadeMinima -> candidatos += m.quantidade.format(c.quantidade, econ)
            is CondicaoUi.Cartao -> {
                candidatos += m.cartao.format(c.programa, econ)
                candidatos += m.cartaoCurto.format(econ)
            }
            CondicaoUi.AppDaLoja -> {
                candidatos += m.appLoja.format(o.loja, econ)
                candidatos += m.cartaoCurto.format(econ)
            }
            null -> Unit
        }
        val cobertura = o.cobertura
        if (o.condicao == null && cobertura is CoberturaUi.Retirada) {
            candidatos += m.retirada.format(Formato.km(cobertura.distanciaKm), econ)
        }
        val selo = Prova.selo(o)
        candidatos += when {
            selo.tipo == Selo.Tipo.MENOR && selo.dias == null -> listOf(m.menorMeses.format(econ), m.menorCurto.format(econ))
            selo.tipo == Selo.Tipo.MENOR -> listOf(m.menorDias.format(selo.dias, econ))
            selo.dias == null -> listOf(m.quaseMenor.format(econ))
            else -> emptyList()
        }
        candidatos += m.abaixoNormal.format(econ)
        return candidatos.firstOrNull { it.length <= MAX_TEXTO } ?: (candidatos.last().take(MAX_TEXTO - 1) + RETICENCIAS)
    }

    /** Monta o título com o maior pedaço do nome que couber; o resto do título nunca é cortado. */
    private fun encaixarNome(nome: String, montar: (String) -> String): String {
        val inteiro = montar(nome)
        if (inteiro.length <= MAX_TITULO) return inteiro
        val fixo = montar("").length
        val espaco = MAX_TITULO - fixo - RETICENCIAS.length
        if (espaco < 3) return montar("").trimEnd(' ', '·').trimEnd()
        // Corta na última palavra inteira que couber ("Protetor Solare…", não "Protetor Solare FP…").
        val corte = nome.take(espaco)
        val limpo = if (nome.length > espaco && nome[espaco] != ' ' && corte.contains(' ')) corte.substringBeforeLast(' ') else corte
        return montar(limpo.trimEnd() + RETICENCIAS)
    }
}
