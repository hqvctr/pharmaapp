package br.com.economae.ui.feed

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.com.economae.dados.Oferta
import br.com.economae.ui.Carregando
import br.com.economae.ui.prova.AvisoLegal
import br.com.economae.ui.prova.BlocoPreco
import br.com.economae.ui.prova.FaixaCondicao
import br.com.economae.ui.prova.ReguaPreco
import br.com.economae.ui.prova.SeloProva
import br.com.economae.ui.prova.textoCondicao
import coil3.compose.AsyncImage

@Composable
fun FeedRota(viewModel: FeedViewModel, onOferta: (String) -> Unit, onConta: () -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    FeedTela(estado, onOferta, onConta, viewModel::atualizar, viewModel::carregarMais, viewModel::filtrar)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedTela(
    estado: EstadoFeed,
    onOferta: (String) -> Unit,
    onConta: () -> Unit,
    onAtualizar: () -> Unit,
    onCarregarMais: () -> Unit,
    onFiltrar: (String?) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("economae") },
                actions = { TextButton(onClick = onConta) { Text("Conta") } },
            )
        },
    ) { margens ->
        PullToRefreshBox(
            isRefreshing = estado.carregando && estado.itens.isNotEmpty(),
            onRefresh = onAtualizar,
            modifier = Modifier.padding(margens).fillMaxSize(),
        ) {
            val lista = rememberLazyListState()
            val perto by remember { derivedStateOf { (lista.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) >= estado.itens.size - 3 } }
            LaunchedEffect(perto, estado.itens.size) { if (perto) onCarregarMais() }

            LazyColumn(state = lista, contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (!estado.notificacoesAtivas) {
                    item(key = "alertas") {
                        Card(Modifier.fillMaxWidth().clickable(onClick = onConta)) {
                            Text(
                                "Ative os alertas para saber na hora quando uma promoção excepcional aparecer.",
                                modifier = Modifier.padding(16.dp),
                            )
                        }
                    }
                }
                if (estado.categorias.size > 1) {
                    item(key = "filtros") {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            item { FilterChip(selected = estado.filtro == null, onClick = { onFiltrar(null) }, label = { Text("Tudo") }) }
                            items(estado.categorias, key = { it.id }) { c ->
                                FilterChip(selected = estado.filtro == c.id, onClick = { onFiltrar(c.id) }, label = { Text(c.nome) })
                            }
                        }
                    }
                }
                when {
                    estado.carregando && estado.itens.isEmpty() -> item(key = "carregando") { Box(Modifier.fillMaxWidth().padding(48.dp)) { Carregando() } }
                    estado.erro != null && estado.itens.isEmpty() -> item(key = "erro") {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(24.dp)) {
                            Text(estado.erro)
                            TextButton(onClick = onAtualizar) { Text("Tentar de novo") }
                        }
                    }
                    estado.itens.isEmpty() -> item(key = "vazio") {
                        Text(
                            "Nada passou no teste agora. Só mostramos quando o preço é o menor dos últimos meses; " +
                                "quando for, a gente avisa.",
                            modifier = Modifier.padding(24.dp),
                        )
                    }
                    else -> items(estado.itens, key = { it.ofertaId }) { o -> CartaoOferta(o, onClick = { onOferta(o.ofertaId) }) }
                }
                if (estado.carregandoMais) item(key = "mais") { Box(Modifier.fillMaxWidth().padding(16.dp)) { Carregando() } }
            }
        }
    }
}

/**
 * Cartão de oferta da proposta de UX (seção 4.1). Ordem visual e de leitura: condição → produto →
 * preço → economia → preço normal → prova → entrega → aviso legal. O cartão inteiro é o alvo.
 */
@Composable
fun CartaoOferta(o: Oferta, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier.fillMaxWidth().clickable(onClick = onClick).semantics(mergeDescendants = true) {}) {
        textoCondicao(o)?.let { FaixaCondicao(it) }
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AsyncImage(
                    model = o.imagemUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    // Fundo neutro: sem foto (ou foto que não carregou) não vira buraco em branco.
                    modifier = Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant),
                )
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    if (o.decisao == "notificar") Etiqueta("Excepcional")
                    Text(o.produto.nome, style = MaterialTheme.typography.titleSmall, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    o.produto.tamanhoFralda?.let { Text("Tamanho $it", style = MaterialTheme.typography.labelLarge) }
                    Text(o.loja.nome, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            BlocoPreco(o, destaque = false)
            SeloProva(o)
            ReguaPreco(o)
            o.prazoEntregaDias?.let { Text("Entrega no seu CEP em até $it dias", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }
            // Aviso legal (NBCAL): sempre visível, inteiro.
            o.avisos.forEach { AvisoLegal(it) }
        }
    }
}

@Composable
private fun Etiqueta(texto: String) {
    Text(
        texto,
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onPrimaryContainer,
        modifier = Modifier.clip(RoundedCornerShape(50)).background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = 8.dp, vertical = 2.dp),
    )
}
