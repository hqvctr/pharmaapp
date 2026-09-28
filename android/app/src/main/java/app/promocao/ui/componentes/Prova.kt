package app.promocao.ui.componentes

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.formato.Prova
import app.promocao.formato.Selo
import app.promocao.modelo.OfertaUi
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.IconeTamanho
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Texto do selo de prova, escolhido pelo que foi medido (PROPOSTA 4.2). */
@Composable
fun textoSelo(selo: Selo): String = when {
    selo.tipo == Selo.Tipo.MENOR && selo.dias == null -> stringResource(R.string.selo_menor_meses)
    selo.tipo == Selo.Tipo.MENOR -> stringResource(R.string.selo_menor_dias, selo.dias!!)
    selo.dias == null -> stringResource(R.string.selo_quase_meses)
    else -> stringResource(R.string.selo_quase_dias, selo.dias)
}

@Composable
fun textoPeriodo(selo: Selo): String =
    if (selo.dias == null) stringResource(R.string.periodo_6_meses) else stringResource(R.string.periodo_dias, selo.dias)

/** Selo de prova: ícone + texto em `prova`. Nunca só cor. */
@Composable
fun SeloProva(oferta: OfertaUi, modifier: Modifier = Modifier) {
    val selo = Prova.selo(oferta)
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
        Icon(Icons.Rounded.Verified, contentDescription = null, tint = Tema.cores.prova, modifier = Modifier.size(IconeTamanho.pequeno))
        Text(textoSelo(selo), style = Tipo.rotulo, color = Tema.cores.prova)
    }
}

/**
 * Régua de preço (a invenção visual do produto): faixa mín.–máx. do período, losango no preço
 * normal, círculo cheio no preço de hoje. Rótulos em texto embaixo; o leitor de tela recebe uma frase.
 */
@Composable
fun ReguaPreco(oferta: OfertaUi, compacta: Boolean, modifier: Modifier = Modifier) {
    val pos = Prova.posicoes(oferta)
    val cores = Tema.cores
    val selo = Prova.selo(oferta)
    val descricao = stringResource(
        R.string.regua_descricao,
        textoPeriodo(selo),
        Formato.reais(pos.minimoCentavos),
        Formato.reais(pos.maximoCentavos),
        Formato.reais(oferta.prova.precoNormalCentavos),
        Formato.reais(oferta.precoEfetivoCentavos),
    )
    val espessura = if (compacta) 6.dp else 10.dp
    Column(modifier.clearAndSetSemantics { contentDescription = descricao }) {
        Canvas(Modifier.fillMaxWidth().height(if (compacta) 20.dp else 28.dp)) {
            val h = espessura.toPx()
            val y = size.height / 2
            val raio = CornerRadius(h / 2, h / 2)
            val xNormal = size.width * pos.normal
            // Trecho acima do normal: contorno suave. Do mínimo ao normal: régua de prova.
            drawRoundRect(cores.contornoSuave, topLeft = Offset(0f, y - h / 2), size = Size(size.width, h), cornerRadius = raio)
            drawRoundRect(cores.provaRegua, topLeft = Offset(0f, y - h / 2), size = Size(xNormal, h), cornerRadius = raio)
            // Losango = preço normal.
            val l = h * 1.3f
            val losango = Path().apply {
                moveTo(xNormal, y - l); lineTo(xNormal + l, y); lineTo(xNormal, y + l); lineTo(xNormal - l, y); close()
            }
            drawPath(losango, cores.superficieCartao)
            drawPath(losango, cores.texto, style = Stroke(width = 2.dp.toPx()))
            // Círculo cheio = hoje.
            val xHoje = (size.width * pos.hoje).coerceIn(l, size.width - l)
            drawCircle(cores.superficieCartao, radius = l + 2.dp.toPx(), center = Offset(xHoje, y))
            drawCircle(cores.prova, radius = l, center = Offset(xHoje, y))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(
                stringResource(R.string.regua_hoje) + " " + Formato.reais(oferta.precoEfetivoCentavos),
                style = Tipo.apoio, color = cores.prova,
            )
            Text(
                stringResource(R.string.regua_normal) + " " + Formato.reais(oferta.prova.precoNormalCentavos),
                style = Tipo.apoio, color = cores.textoSecundario, textAlign = TextAlign.End,
            )
        }
    }
}

/** Gráfico de 90 dias do detalhe. Linha do menor preço de cada dia, normal tracejado, hoje em destaque. */
@Composable
fun GraficoPreco(oferta: OfertaUi, modifier: Modifier = Modifier) {
    val cores = Tema.cores
    val pontos = oferta.prova.serieDiaria.map { it.centavos } + oferta.precoEfetivoCentavos
    val min = pontos.min().toFloat()
    val max = pontos.max().toFloat()
    val faixa = (max - min).coerceAtLeast(1f)
    Canvas(modifier.fillMaxWidth().height(140.dp).clearAndSetSemantics { }) {
        val margem = 8.dp.toPx()
        val altura = size.height - 2 * margem
        fun x(i: Int) = size.width * i / (pontos.size - 1).coerceAtLeast(1)
        fun y(c: Float) = margem + altura * (1 - (c - min) / faixa)
        val yNormal = y(oferta.prova.precoNormalCentavos.toFloat())
        drawLine(
            cores.textoSecundario, Offset(0f, yNormal), Offset(size.width, yNormal),
            strokeWidth = 1.5.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f)),
        )
        val linha = Path().apply {
            pontos.forEachIndexed { i, c -> if (i == 0) moveTo(x(i), y(c.toFloat())) else lineTo(x(i), y(c.toFloat())) }
        }
        drawPath(linha, cores.contorno, style = Stroke(width = 2.dp.toPx()))
        drawCircle(cores.prova, radius = 6.dp.toPx(), center = Offset(x(pontos.lastIndex), y(pontos.last().toFloat())))
    }
}
