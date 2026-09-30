package br.com.economae.ui.oferta

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.ErroApi
import br.com.economae.dados.Oferta
import br.com.economae.dados.PontoHistorico
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.ui.Carregando
import br.com.economae.ui.TelaDeErro
import br.com.economae.ui.diaCurto
import br.com.economae.ui.prova.AvisoLegal
import br.com.economae.ui.prova.BlocoPreco
import br.com.economae.ui.prova.FaixaCondicao
import br.com.economae.ui.prova.ReguaPreco
import br.com.economae.ui.prova.SeloProva
import br.com.economae.ui.prova.embalagensNaCompra
import br.com.economae.ui.prova.textoCondicao
import br.com.economae.ui.tema.Semantica
import br.com.economae.ui.precoPorUnidadeTexto
import br.com.economae.ui.reais
import coil3.compose.AsyncImage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface EstadoOferta {
    data object Carregando : EstadoOferta
    data class Erro(val mensagem: String) : EstadoOferta
    data class Pronto(val oferta: Oferta) : EstadoOferta
}

class OfertaViewModel(private val repositorio: RepositorioEconomae, private val id: String) : ViewModel() {
    private val _estado = MutableStateFlow<EstadoOferta>(EstadoOferta.Carregando)
    val estado: StateFlow<EstadoOferta> = _estado.asStateFlow()

    init {
        carregar()
    }

    fun carregar() {
        _estado.value = EstadoOferta.Carregando
        viewModelScope.launch {
            _estado.value = try {
                EstadoOferta.Pronto(repositorio.oferta(id))
            } catch (e: ErroApi) {
                EstadoOferta.Erro(if (e.codigo == "OFERTA_NAO_ENCONTRADA") "Esta oferta não existe mais." else e.message ?: "Erro inesperado.")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfertaRota(viewModel: OfertaViewModel, onVoltar: () -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("Oferta") }, navigationIcon = { TextButton(onClick = onVoltar) { Text("Voltar") } }) }) { m ->
        when (val e = estado) {
            EstadoOferta.Carregando -> Carregando(Modifier.padding(m))
            is EstadoOferta.Erro -> TelaDeErro(e.mensagem, viewModel::carregar, Modifier.padding(m))
            is EstadoOferta.Pronto -> OfertaConteudo(e.oferta, Modifier.padding(m))
        }
    }
}

@Composable
fun OfertaConteudo(o: Oferta, modifier: Modifier = Modifier) {
    val abrir = LocalUriHandler.current
    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (o.imagemUrl != null) {
            AsyncImage(
                model = o.imagemUrl,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
            )
        }
        Text(o.produto.nome, style = MaterialTheme.typography.titleLarge)
        o.produto.tamanhoFralda?.let { Text("Tamanho $it", style = MaterialTheme.typography.labelLarge) }
        Text(o.loja.nome, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)

        if (!o.ativa) {
            Card(colors = CardDefaults.cardColors(containerColor = Semantica.cores.erroContainer)) {
                Text("Esta promoção acabou.", modifier = Modifier.padding(16.dp), style = MaterialTheme.typography.titleMedium, color = Semantica.cores.sobreErroContainer)
            }
        }
        // Condição antes do preço (princípio 4).
        textoCondicao(o)?.let { FaixaCondicao(it) }
        BlocoPreco(o, destaque = true)
        Text(precoPorUnidadeTexto(o.precoPorUnidade.centavos, o.precoPorUnidade.unidade), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        // Aviso legal logo abaixo do preço: visível sem rolar, inteiro (NBCAL).
        o.avisos.forEach { AvisoLegal(it) }

        ProvaDoDesconto(o)
        o.prazoEntregaDias?.let { Text("Entrega no seu CEP em até $it dias", style = MaterialTheme.typography.bodyMedium) }
        Text(
            when (o.frete.status) {
                "conhecido" -> "Frete: ${reais(o.frete.centavos ?: 0L)}"
                "nao_se_aplica" -> "Retirada na loja"
                else -> "Frete a confirmar na loja"
            },
            style = MaterialTheme.typography.bodyMedium,
        )

        if (o.historico.size >= 2) {
            Text("Preço desta embalagem nos últimos dias", style = MaterialTheme.typography.titleSmall)
            GraficoHistorico(o.historico, o.precoEfetivoCentavos)
        }

        if (o.ativa && o.link != null) {
            Button(
                onClick = { abrir.openUri(o.link) },
                modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).semantics { contentDescription = "Ver na ${o.loja.nome}. Abre fora do app." },
            ) { Text("Ver na ${o.loja.nome}") }
            if (o.linkAfiliado) {
                Text(
                    "Link de afiliado: se você comprar por ele, o economae pode receber comissão. O preço para você é o mesmo.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
        Text("Preço coletado em ${o.coletadaEm.take(16).replace('T', ' ')} (UTC). Confira na loja antes de comprar.", style = MaterialTheme.typography.bodySmall)
    }
}

/**
 * "Por que é promoção de verdade" (proposta de UX, seção 4.2): as três checagens do motor em linguagem
 * de gente, com o selo e a régua. Na primeira dobra, não numa aba.
 */
@Composable
fun ProvaDoDesconto(o: Oferta) {
    val c = Semantica.cores
    val abaixo = reais(o.precoReferenciaCentavos - o.precoEfetivoCentavos)
    val cada = embalagensNaCompra(o.condicao) > 1
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.provaContainer).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("Por que é promoção de verdade", style = MaterialTheme.typography.titleMedium, color = c.sobreProvaContainer, modifier = Modifier.semantics { heading() })
        SeloProva(o)
        Checagem("${if (cada) "Cada uma sai" else "Está"} $abaixo abaixo do preço normal desta loja, que é a média do que ela cobrou nos últimos 30 dias.")
        o.prova?.let { p ->
            val periodo = if (p.diasMedidos >= 180) "6 meses" else "${p.diasMedidos} dias"
            Checagem(
                if (o.precoEfetivoCentavos <= p.menorPrecoCentavos) "É o menor preço desta loja em $periodo."
                else "Está perto do menor preço desta loja em $periodo (${reais(p.menorPrecoCentavos)}).",
            )
        }
        Checagem("A loja não aumentou o preço antes da promoção.")
        ReguaPreco(o, grande = true, modifier = Modifier.clip(RoundedCornerShape(12.dp)).background(c.superficieCartao).padding(12.dp))
    }
}

@Composable
private fun Checagem(texto: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("✓", color = Semantica.cores.prova, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.clearAndSetSemantics { })
        Text(texto, style = MaterialTheme.typography.bodyLarge, color = Semantica.cores.sobreProvaContainer)
    }
}

/** Linha do menor preço de cada dia, com o preço de hoje como ponto final. */
@Composable
fun GraficoHistorico(pontos: List<PontoHistorico>, precoHoje: Long, modifier: Modifier = Modifier) {
    val valores = pontos.map { it.precoEquivalenteCentavos } + precoHoje
    val min = valores.min()
    val max = valores.max()
    val corLinha = MaterialTheme.colorScheme.primary
    val corHoje = MaterialTheme.colorScheme.secondary
    Column(modifier) {
        Canvas(
            Modifier.fillMaxWidth().height(140.dp).semantics {
                contentDescription = "Menor preço ${reais(min)}, maior ${reais(max)}, hoje ${reais(precoHoje)}"
            },
        ) {
            val faixa = (max - min).coerceAtLeast(1)
            fun ponto(i: Int, v: Long) = Offset(
                x = size.width * i / (valores.size - 1).coerceAtLeast(1),
                y = size.height - size.height * (v - min) / faixa,
            )
            val caminho = Path()
            valores.forEachIndexed { i, v -> if (i == 0) caminho.moveTo(ponto(i, v).x, ponto(i, v).y) else caminho.lineTo(ponto(i, v).x, ponto(i, v).y) }
            drawPath(caminho, corLinha, style = Stroke(width = 4f))
            drawCircle(corHoje, radius = 10f, center = ponto(valores.lastIndex, precoHoje))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(diaCurto(pontos.first().dia), style = MaterialTheme.typography.labelSmall)
            Text("máx ${reais(max)} · mín ${reais(min)}", style = MaterialTheme.typography.labelSmall)
            Text("hoje", style = MaterialTheme.typography.labelSmall)
        }
    }
}
