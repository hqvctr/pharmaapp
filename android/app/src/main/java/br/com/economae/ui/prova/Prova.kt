package br.com.economae.ui.prova

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import br.com.economae.dados.Oferta
import br.com.economae.ui.reais
import br.com.economae.ui.tema.Semantica

// Componentes do diferencial da proposta de UX (ux/PROPOSTA_UX.md, seção 4): o preço é o herói, a
// economia tem peso próprio em reais, o preço normal fica subordinado e sem risco, a condição vem
// antes do preço, e a prova (selo e régua) é visível sem abrir aba. Nada é comunicado só por cor.

private const val DIAS_SEIS_MESES = 180

/** Embalagens que a condição obriga a comprar, lidas do rótulo que a API manda (preco.ts › rotuloCondicao). */
fun embalagensNaCompra(condicao: String?): Int {
    if (condicao == null) return 1
    Regex("""^Leve (\d+), pague \d+""").find(condicao)?.let { return it.groupValues[1].toInt() }
    Regex("""compra de (\d+) unidades""").find(condicao)?.let { return it.groupValues[1].toInt() }
    return 1
}

/** Economia na compra mínima, como o motor calcula: (normal − efetivo) × embalagens exigidas. */
fun economiaCentavos(o: Oferta): Long = (o.precoReferenciaCentavos - o.precoEfetivoCentavos) * embalagensNaCompra(o.condicao)

/** Texto da faixa de condição: o rótulo da API e, no leve-pague, o que sai do bolso. */
fun textoCondicao(o: Oferta): String? {
    val c = o.condicao ?: return null
    val n = embalagensNaCompra(c)
    return if (n > 1) "$c — ${reais(o.precoEfetivoCentavos * n)} levando $n" else c
}

/**
 * Selo de prova. Nunca promete mais do que foi medido: com menos de 180 dias, diz "em N dias".
 * Null quando a API não mandou a prova (alerta antigo).
 */
fun textoSelo(o: Oferta): String? {
    val p = o.prova ?: return null
    val seisMeses = p.diasMedidos >= DIAS_SEIS_MESES
    return if (o.precoEfetivoCentavos <= p.menorPrecoCentavos) {
        if (seisMeses) "Menor preço em 6 meses" else "Menor preço em ${p.diasMedidos} dias de medição"
    } else {
        if (seisMeses) "Quase o menor preço em 6 meses" else "Quase o menor preço em ${p.diasMedidos} dias"
    }
}

@Composable
fun FaixaCondicao(texto: String, modifier: Modifier = Modifier) {
    val c = Semantica.cores
    Row(modifier.fillMaxWidth().height(IntrinsicSize.Min).background(c.condicaoContainer), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.width(4.dp).fillMaxHeight().background(c.condicaoBorda))
        Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Simbolo("ⓘ", c.sobreCondicaoContainer)
            Text(texto, style = MaterialTheme.typography.labelLarge, color = c.sobreCondicaoContainer)
        }
    }
}

@Composable
fun ChipEconomia(o: Oferta, modifier: Modifier = Modifier) {
    val c = Semantica.cores
    val n = embalagensNaCompra(o.condicao)
    Row(
        modifier.clip(RoundedCornerShape(8.dp)).background(c.economiaContainer).padding(horizontal = 8.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Simbolo("↘", c.sobreEconomiaContainer)
        Text(
            "${reais(economiaCentavos(o))} a menos${if (n > 1) " levando $n" else ""}",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = c.sobreEconomiaContainer,
        )
    }
}

/** Preço herói, chip de economia e preço normal subordinado (sem risco: o leitor de tela não lê risco). */
@Composable
fun BlocoPreco(o: Oferta, destaque: Boolean) {
    val cores = MaterialTheme.colorScheme
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                reais(o.precoEfetivoCentavos),
                style = if (destaque) MaterialTheme.typography.displaySmall else MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = cores.onSurface,
            )
            if (embalagensNaCompra(o.condicao) > 1) Text("cada", style = MaterialTheme.typography.bodyMedium, color = cores.onSurfaceVariant)
        }
        ChipEconomia(o)
        Text("Preço normal nesta loja: ${reais(o.precoReferenciaCentavos)}", style = MaterialTheme.typography.bodyLarge, color = cores.onSurfaceVariant)
    }
}

@Composable
fun SeloProva(o: Oferta, modifier: Modifier = Modifier) {
    val texto = textoSelo(o) ?: return
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Simbolo("✓", Semantica.cores.prova)
        Text(texto, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = Semantica.cores.prova)
    }
}

/**
 * Régua de preço: faixa do menor ao maior preço medido, losango no preço normal, círculo no de hoje.
 * Rótulos em texto; o leitor de tela recebe uma frase.
 */
@Composable
fun ReguaPreco(o: Oferta, modifier: Modifier = Modifier, grande: Boolean = false) {
    val p = o.prova ?: return
    val c = Semantica.cores
    val min = minOf(p.menorPrecoCentavos, o.precoEfetivoCentavos)
    val max = maxOf(p.maiorPrecoCentavos, o.precoReferenciaCentavos)
    val faixa = (max - min).coerceAtLeast(1).toFloat()
    val posNormal = ((o.precoReferenciaCentavos - min) / faixa).coerceIn(0f, 1f)
    val posHoje = ((o.precoEfetivoCentavos - min) / faixa).coerceIn(0f, 1f)
    val periodo = if (p.diasMedidos >= DIAS_SEIS_MESES) "6 meses" else "${p.diasMedidos} dias"
    val frase = "Nos últimos $periodo, o preço foi de ${reais(min)} a ${reais(max)}. O normal é ${reais(o.precoReferenciaCentavos)}. Hoje está ${reais(o.precoEfetivoCentavos)}."
    Column(modifier.clearAndSetSemantics { contentDescription = frase }) {
        Canvas(Modifier.fillMaxWidth().height(if (grande) 28.dp else 20.dp)) {
            val h = (if (grande) 10.dp else 6.dp).toPx()
            val y = size.height / 2
            val raio = CornerRadius(h / 2, h / 2)
            val l = h * 1.3f
            // Marcas dentro da largura: o losango e o círculo não são cortados nas pontas.
            val margem = l + 2.dp.toPx()
            val util = size.width - 2 * margem
            val xNormal = margem + util * posNormal
            drawRoundRect(c.contornoSuave, topLeft = Offset(margem, y - h / 2), size = Size(util, h), cornerRadius = raio)
            drawRoundRect(c.provaRegua, topLeft = Offset(margem, y - h / 2), size = Size(xNormal - margem, h), cornerRadius = raio)
            val losango = Path().apply { moveTo(xNormal, y - l); lineTo(xNormal + l, y); lineTo(xNormal, y + l); lineTo(xNormal - l, y); close() }
            drawPath(losango, c.superficieCartao)
            drawPath(losango, c.texto, style = Stroke(width = 2.dp.toPx()))
            val xHoje = margem + util * posHoje
            drawCircle(c.superficieCartao, radius = l + 2.dp.toPx(), center = Offset(xHoje, y))
            drawCircle(c.prova, radius = l, center = Offset(xHoje, y))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("hoje ${reais(o.precoEfetivoCentavos)}", style = MaterialTheme.typography.bodyMedium, color = c.prova)
            Text("normal ${reais(o.precoReferenciaCentavos)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.End)
        }
    }
}

/** Símbolo visual de apoio; o texto ao lado diz tudo, então o leitor de tela o ignora. */
@Composable
private fun Simbolo(s: String, cor: androidx.compose.ui.graphics.Color) {
    Text(s, style = MaterialTheme.typography.labelLarge, color = cor, modifier = Modifier.clearAndSetSemantics { })
}

/** Aviso legal (NBCAL): inteiro, sem cortar, com fundo próprio para não se perder no cartão. */
@Composable
fun AvisoLegal(texto: String, modifier: Modifier = Modifier) {
    val c = Semantica.cores
    Row(modifier.fillMaxWidth().height(IntrinsicSize.Min).clip(RoundedCornerShape(8.dp)).background(c.superficieContainer)) {
        Box(Modifier.width(4.dp).fillMaxHeight().background(c.contorno))
        Text(texto, style = MaterialTheme.typography.bodyMedium, color = c.texto, modifier = Modifier.padding(12.dp))
    }
}
