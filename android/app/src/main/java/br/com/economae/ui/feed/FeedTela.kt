package br.com.economae.ui.feed

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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.com.economae.dados.Oferta
import br.com.economae.ui.Carregando
import br.com.economae.ui.percentualAbaixo
import br.com.economae.ui.reais
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
                            "Nenhuma promoção excepcional agora. O app só mostra quando o preço cai de verdade; " +
                                "quando aparecer, avisamos.",
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

@Composable
fun CartaoOferta(o: Oferta, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(Modifier.padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AsyncImage(
                model = o.imagemUrl,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Modifier.size(88.dp).clip(RoundedCornerShape(8.dp)),
            )
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(o.produto.nome, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(o.loja.nome, style = MaterialTheme.typography.bodySmall)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(reais(o.precoEfetivoCentavos), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                    Text(reais(o.precoReferenciaCentavos), style = MaterialTheme.typography.bodySmall, textDecoration = TextDecoration.LineThrough)
                }
                Text(percentualAbaixo(o.queda), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                o.condicao?.let { AssistChip(onClick = onClick, label = { Text(it) }) }
                o.prazoEntregaDias?.let { Text("Entrega em até $it dia(s)", style = MaterialTheme.typography.bodySmall) }
                // Aviso legal (NBCAL): sempre visível, sem cortar.
                o.avisos.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.tertiary) }
            }
        }
    }
}
