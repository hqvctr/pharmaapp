package app.promocao.ui.componentes

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.TrendingDown
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LocalShipping
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.formato.Prova
import app.promocao.modelo.AnuncioUi
import app.promocao.modelo.CoberturaUi
import app.promocao.modelo.CondicaoUi
import app.promocao.modelo.Nivel
import app.promocao.modelo.OfertaUi
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.IconeTamanho
import app.promocao.ui.theme.Raio
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Texto da faixa de condição (UX_COPY 4). Nulo para oferta incondicional. */
@Composable
fun textoCondicao(o: OfertaUi): String? = when (val c = o.condicao) {
    is CondicaoUi.LevePague -> stringResource(R.string.condicao_leve_pague, c.leve, c.pague, Formato.reais(o.totalCompraMinimaCentavos))
    is CondicaoUi.QuantidadeMinima -> stringResource(R.string.condicao_quantidade, c.quantidade, Formato.reais(o.totalCompraMinimaCentavos))
    is CondicaoUi.Cartao -> stringResource(R.string.condicao_cartao, c.programa)
    CondicaoUi.AppDaLoja -> stringResource(R.string.condicao_app, o.loja)
    null -> null
}

@Composable
fun textoCobertura(c: CoberturaUi): String = when (c) {
    is CoberturaUi.EntregaCep -> stringResource(R.string.cobertura_entrega, c.prazoDias)
    CoberturaUi.EntregaAConfirmar -> stringResource(R.string.cobertura_entrega_confirmar)
    is CoberturaUi.Retirada -> stringResource(R.string.cobertura_retirada, Formato.km(c.distanciaKm))
}

/** Uma frase completa por cartão, na ordem condição → produto → preço → prova → cobertura (A04, A07). */
@Composable
fun descricaoOferta(o: OfertaUi): String {
    val partes = mutableListOf<String>()
    if (o.nivel == Nivel.EXCEPCIONAL) partes += stringResource(R.string.a11y_excepcional)
    textoCondicao(o)?.let { partes += "$it." }
    partes += stringResource(R.string.a11y_na_loja, "${o.nomeCurto}, ${o.embalagem.rotulo}", o.loja)
    val cada = if (o.embalagensCompraMinima > 1) " " + stringResource(R.string.preco_cada) else ""
    partes += Formato.reais(o.precoEfetivoCentavos) + cada + "."
    partes += stringResource(R.string.a11y_normal, Formato.reais(o.prova.precoNormalCentavos))
    partes += stringResource(R.string.a11y_economia, Formato.reais(o.economiaCentavos))
    partes += textoSelo(Prova.selo(o)) + "."
    partes += textoCobertura(o.cobertura) + "."
    partes += stringResource(R.string.a11y_conferido, Formato.hora(o.conferidoEm))
    return partes.joinToString(" ")
}

/** Faixa de condição: sempre acima do nome e do preço (princípio 4). Ícone + texto, nunca só cor. */
@Composable
fun FaixaCondicao(texto: String, modifier: Modifier = Modifier) {
    val cores = Tema.cores
    Row(
        modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .background(cores.condicaoContainer),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(4.dp).fillMaxHeight().background(cores.condicaoBorda))
        Icon(
            Icons.Rounded.Info, contentDescription = null, tint = cores.sobreCondicaoContainer,
            modifier = Modifier.padding(start = Espaco.e4).size(IconeTamanho.pequeno),
        )
        Text(
            texto, style = Tipo.rotulo, color = cores.sobreCondicaoContainer,
            modifier = Modifier.padding(horizontal = Espaco.e3, vertical = Espaco.e3),
        )
    }
}

/** Economia em reais com peso próprio (princípio 2). */
@Composable
fun ChipEconomia(centavos: Long, levando: Int = 1, modifier: Modifier = Modifier) {
    val cores = Tema.cores
    Row(
        modifier
            .clip(RoundedCornerShape(Raio.sm))
            .background(cores.economiaContainer)
            .padding(horizontal = Espaco.e3, vertical = Espaco.e2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espaco.e2),
    ) {
        Icon(Icons.AutoMirrored.Rounded.TrendingDown, contentDescription = null, tint = cores.sobreEconomiaContainer, modifier = Modifier.size(IconeTamanho.pequeno))
        Text(
            if (levando > 1) stringResource(R.string.economia_chip_levando, Formato.reais(centavos), levando)
            else stringResource(R.string.economia_chip, Formato.reais(centavos)),
            style = Tipo.economia, color = cores.sobreEconomiaContainer,
        )
    }
}

@Composable
fun EtiquetaExcepcional(modifier: Modifier = Modifier) {
    Row(
        modifier
            .clip(RoundedCornerShape(Raio.total))
            .background(Tema.cores.primariaContainer)
            .padding(horizontal = Espaco.e3, vertical = Espaco.e1),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espaco.e2),
    ) {
        Icon(Icons.Rounded.Notifications, contentDescription = null, tint = Tema.cores.sobrePrimariaContainer, modifier = Modifier.size(16.dp))
        Text(stringResource(R.string.etiqueta_excepcional), style = Tipo.rotuloPequeno, color = Tema.cores.sobrePrimariaContainer)
    }
}

@Composable
fun LinhaIconeTexto(icone: androidx.compose.ui.graphics.vector.ImageVector, texto: String, modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
        Icon(icone, contentDescription = null, tint = Tema.cores.textoSecundario, modifier = Modifier.size(IconeTamanho.pequeno))
        Text(texto, style = Tipo.apoio, color = Tema.cores.textoSecundario)
    }
}

@Composable
fun LinhaCobertura(o: OfertaUi, modifier: Modifier = Modifier) {
    val icone = if (o.cobertura is CoberturaUi.Retirada) Icons.Rounded.Storefront else Icons.Rounded.LocalShipping
    LinhaIconeTexto(icone, textoCobertura(o.cobertura), modifier)
}

/** Foto do produto quando houver; senão, ícone da categoria (S-09). A foto entra na fase 3. */
@Composable
fun IconeProduto(o: OfertaUi, tamanho: androidx.compose.ui.unit.Dp = 56.dp) {
    Box(
        Modifier.size(tamanho).clip(RoundedCornerShape(Raio.md)).background(Tema.cores.provaContainer),
        contentAlignment = Alignment.Center,
    ) {
        Icon(o.categoria.icone, contentDescription = null, tint = Tema.cores.sobreProvaContainer, modifier = Modifier.size(IconeTamanho.categoria))
    }
}

/** Preço herói + chip de economia. Empilham quando não cabem (fonte a 200%, A05). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun BlocoPreco(o: OfertaUi, destaque: Boolean) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(Espaco.e4),
        verticalArrangement = Arrangement.spacedBy(Espaco.e3),
        itemVerticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(Espaco.e2)) {
            Text(Formato.reais(o.precoEfetivoCentavos), style = if (destaque) Tipo.precoDestaque else Tipo.precoCartao, color = Tema.cores.texto)
            if (o.embalagensCompraMinima > 1) {
                Text(stringResource(R.string.preco_cada), style = Tipo.apoio, color = Tema.cores.textoSecundario, modifier = Modifier.padding(bottom = 6.dp))
            }
        }
        ChipEconomia(o.economiaCentavos, levando = o.embalagensCompraMinima)
    }
    Text(stringResource(R.string.preco_normal, Formato.reais(o.prova.precoNormalCentavos)), style = Tipo.precoNormal, color = Tema.cores.textoSecundario)
}

/** Cartão de oferta do feed (PROPOSTA 4.1). O cartão inteiro é o alvo de toque. */
@Composable
fun CartaoOferta(o: OfertaUi, aoTocar: () -> Unit, modifier: Modifier = Modifier) {
    val cores = Tema.cores
    val descricao = descricaoOferta(o)
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Raio.lg))
            .clickable(onClick = aoTocar)
            .clearAndSetSemantics { contentDescription = descricao; role = Role.Button },
        shape = RoundedCornerShape(Raio.lg),
        color = cores.superficieCartao,
        border = BorderStroke(1.dp, cores.contornoSuave),
    ) {
        Column {
            textoCondicao(o)?.let { FaixaCondicao(it) }
            Column(Modifier.padding(Espaco.e5), verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
                Row(horizontalArrangement = Arrangement.spacedBy(Espaco.e4)) {
                    IconeProduto(o)
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Espaco.e1)) {
                        if (o.nivel == Nivel.EXCEPCIONAL) EtiquetaExcepcional()
                        Text(
                            "${o.nomeCurto} · ${o.embalagem.rotulo}", style = Tipo.nomeProduto, color = cores.texto,
                            maxLines = 3, overflow = TextOverflow.Ellipsis,
                        )
                        Text(o.loja, style = Tipo.apoio, color = cores.textoSecundario)
                    }
                }
                BlocoPreco(o, destaque = false)
                SeloProva(o)
                ReguaPreco(o, compacta = true)
                LinhaCobertura(o)
                LinhaIconeTexto(Icons.Rounded.Schedule, stringResource(R.string.conferido_curto, Formato.hora(o.conferidoEm)))
            }
        }
    }
}

/** Remédio sem receita: formato de lista de preço, sem selo, régua, chip ou etiqueta (S-27). */
@Composable
fun ItemRemedio(o: OfertaUi, aoTocar: () -> Unit) {
    val cores = Tema.cores
    val texto = "${o.nomeCurto} · ${o.embalagem.rotulo}, ${o.loja}, ${Formato.reais(o.precoCentavos)}"
    Row(
        Modifier
            .fillMaxWidth()
            .heightIn(min = Alvo.toqueMinimo)
            .clickable(onClick = aoTocar)
            .semantics(mergeDescendants = true) { contentDescription = texto }
            .padding(vertical = Espaco.e4),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("${o.nomeCurto} · ${o.embalagem.rotulo}", style = Tipo.nomeProduto, color = cores.texto)
            Text(o.loja, style = Tipo.apoio, color = cores.textoSecundario)
        }
        Text(Formato.reais(o.precoCentavos), style = Tipo.tituloSecao, color = cores.texto)
    }
}

/** Anúncio: forma própria (fundo cinza, contorno tracejado, rótulo), nunca igual ao cartão (princípio 9). */
@Composable
fun CartaoAnuncio(a: AnuncioUi, aoTocar: () -> Unit, modifier: Modifier = Modifier) {
    val cores = Tema.cores
    val descricao = stringResource(R.string.a11y_anuncio, "${a.anunciante}. ${a.texto}")
    val rotulo = stringResource(R.string.anuncio_rotulo)
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Raio.md))
            .background(cores.anuncioContainer)
            .tracejado(cores.anuncioBorda)
            .clickable(onClick = aoTocar)
            .clearAndSetSemantics { contentDescription = descricao; role = Role.Button }
            .padding(Espaco.e5),
        verticalArrangement = Arrangement.spacedBy(Espaco.e2),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
            Icon(Icons.Rounded.Campaign, contentDescription = null, tint = cores.sobreAnuncioContainer, modifier = Modifier.size(IconeTamanho.pequeno))
            Text("$rotulo · ${a.anunciante}", style = Tipo.rotulo, color = cores.sobreAnuncioContainer)
        }
        Text(a.texto, style = Tipo.corpo, color = cores.sobreAnuncioContainer)
        Text(stringResource(R.string.anuncio_descricao), style = Tipo.apoio, color = cores.sobreAnuncioContainer)
    }
}

private fun Modifier.tracejado(cor: androidx.compose.ui.graphics.Color): Modifier = drawBehind {
    val traco = 1.5.dp.toPx()
    drawRoundRect(
        color = cor,
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(Raio.md.toPx()),
        style = Stroke(width = traco, pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f))),
    )
}

/** Esqueleto estático com a forma do cartão (sem brilho animado: custo em aparelho de entrada). */
@Composable
fun EsqueletoCartao() {
    val c = Tema.cores.esqueleto
    Column(
        Modifier
            .fillMaxWidth()
            .border(1.dp, Tema.cores.contornoSuave, RoundedCornerShape(Raio.lg))
            .padding(Espaco.e5),
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Espaco.e4)) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(Raio.md)).background(c))
            Column(verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
                Box(Modifier.fillMaxWidth(0.8f).height(16.dp).clip(RoundedCornerShape(Raio.xs)).background(c))
                Box(Modifier.fillMaxWidth(0.4f).height(14.dp).clip(RoundedCornerShape(Raio.xs)).background(c))
            }
        }
        Box(Modifier.fillMaxWidth(0.5f).height(32.dp).clip(RoundedCornerShape(Raio.xs)).background(c))
        Box(Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(Raio.total)).background(c))
    }
}
