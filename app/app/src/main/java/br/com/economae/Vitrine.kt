package br.com.economae

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridItemScope
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.automirrored.rounded.List
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

// ------------------------------------------------------------------------------------------------ cartão
/**
 * Cartão de produto da grade e das fileiras (como os da Shopee e do Mercado Livre): foto quadrada com o selo de queda num canto e o
 * coração no outro, nome em duas linhas, preço, o "antes" riscado (só com queda verificada), preço por unidade, em quantas lojas e o
 * selo de menor preço em 180 dias. `p` é um `ProdutoBusca` da API 1.3.0.
 */
@Composable
fun CartaoProduto(m: Modelo, p: JSONObject, modifier: Modifier = Modifier, aoAbrir: () -> Unit) {
    val escopo = rememberCoroutineScope()
    var seguido by remember(p) { mutableStateOf(p.optBoolean("seguido")) }
    var erro by remember(p) { mutableStateOf<String?>(null) }
    val nome = p.getString("nome")
    Cartao(modifier = modifier, aoTocar = aoAbrir) {
        Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box {
                FotoProduto(p.textoOuNulo("imagem_url"), Modifier.fillMaxWidth().aspectRatio(1f))
                quedaDoCartao(p)?.let { q -> Selo("-$q", TipoSelo.Destaque, descricao = "queda de $q", modifier = Modifier.align(Alignment.TopStart).padding(4.dp)) }
                Surface(shape = androidx.compose.foundation.shape.CircleShape, color = MaterialTheme.colorScheme.surfaceContainerLowest.copy(alpha = 0.9f),
                    modifier = Modifier.align(Alignment.TopEnd).padding(2.dp)) {
                    IconButton({
                        escopo.launch {
                            try {
                                val e = alternarSeguir(m, p.getString("id"), seguido)
                                if (e == null) { seguido = !seguido; erro = null } else erro = e
                            } catch (e: SemConexao) { erro = e.message }
                        }
                    }, Modifier.size(40.dp)) {
                        Icon(if (seguido) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, tint = MaterialTheme.colorScheme.primary,
                            contentDescription = if (seguido) "Deixar de seguir $nome" else "Seguir $nome", modifier = Modifier.size(20.dp))
                    }
                }
            }
            Text(nome, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.heightIn(min = 40.dp))
            PrecoDoCartao(p)
            if (p.optBoolean("menor_preco_180d")) Selo("Menor preço em 180 dias", TipoSelo.Condicao)
            erro?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
        }
    }
}

/** "32%" quando a oferta mais barata tem queda verificada; null sem queda (oferta manual, sem histórico, queda de outra loja). */
fun quedaDoCartao(p: JSONObject): String? {
    if (p.isNull("queda") || !p.has("queda")) return null
    val q = p.getDouble("queda")
    return if (q > 0.0) percentual(q) else null
}

/** Preço, "antes" riscado, preço por unidade e lojas (ou a embalagem, com uma loja só). */
@Composable
fun PrecoDoCartao(p: JSONObject) {
    val preco = p.inteiroOuNulo("menor_preco_centavos")
    if (preco == null) {
        Text("sem oferta na sua região", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        return
    }
    val lojas = p.optInt("lojas", 1)
    if (lojas > 1) Text("a partir de", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text(reais(preco), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary)
    val antes = if (quedaDoCartao(p) != null) p.inteiroOuNulo("preco_referencia_centavos") else null
    antes?.let { Text("antes ${reais(it)}", style = MaterialTheme.typography.bodySmall.copy(textDecoration = TextDecoration.LineThrough), color = MaterialTheme.colorScheme.onSurfaceVariant) }
    p.inteiroOuNulo("preco_ao_seguir_centavos")?.takeIf { it > preco }?.let {
        Text("era ${reais(it)} quando você favoritou", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
    }
    val detalhe = listOfNotNull(precoPorUnidadeTexto(p), if (lojas > 1) "em $lojas lojas" else embalagemTexto(p)).joinToString(" · ")
    Text(detalhe, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
}

// ------------------------------------------------------------------------------------------------ fileira do Início
/** Uma fileira do Início: título, "Ver todas" (se houver lista) e os cartões rolando de lado. */
fun LazyGridScope.fileira(m: Modelo, titulo: String, itens: List<JSONObject>, chave: String, verTodas: (() -> Unit)?) {
    item(key = "fileira-$chave", span = { GridItemSpan(maxLineSpan) }, contentType = "fileira") {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                Text(titulo, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                if (verTodas != null) TextButton(verTodas) { Text("Ver todas →") }
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(end = 8.dp)) {
                items(itens, key = { it.getString("id") }) { p -> CartaoProduto(m, p, Modifier.width(160.dp)) { m.ir(Tela.Produto(p.getString("id"))) } }
            }
        }
    }
}

/** Item que ocupa a linha inteira da grade (cabeçalhos, faixas, fileiras). */
fun LazyGridScope.linhaInteira(chave: Any? = null, conteudo: @Composable LazyGridItemScope.() -> Unit) =
    item(key = chave, span = { GridItemSpan(maxLineSpan) }, content = conteudo)

// ------------------------------------------------------------------------------------------------ ordenar e filtrar
/** "Ordenar: Mais novos ▾" e "Filtros (2)", como a barra do Mercado Livre. As facetas (lojas e marcas) vêm da primeira página. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BarraOrdemFiltros(ordem: Ordem, opcoes: List<Ordem>, filtros: Filtros, facetas: JSONObject?, aoOrdenar: (Ordem) -> Unit, aoFiltrar: (Filtros) -> Unit) {
    var menu by remember { mutableStateOf(false) }
    var folha by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
        Box {
            TextButton({ menu = true }) {
                Text("Ordenar: ${ordem.rotulo}")
                Icon(Icons.Rounded.KeyboardArrowDown, contentDescription = null)
            }
            DropdownMenu(menu, { menu = false }) {
                opcoes.forEach { o -> DropdownMenuItem({ Text(o.rotulo) }, { menu = false; aoOrdenar(o) }) }
            }
        }
        TextButton({ folha = true }, Modifier.semantics { contentDescription = if (filtros.ativos > 0) "Filtros, ${filtros.ativos} ligados" else "Filtros" }) {
            BadgedBox(badge = { if (filtros.ativos > 0) Badge { Text("${filtros.ativos}") } }) { Icon(Icons.AutoMirrored.Rounded.List, contentDescription = null) }
            Text("  Filtros")
        }
    }
    if (filtros.ativos > 0) ChipsDosFiltros(filtros, aoFiltrar)
    if (folha) {
        val estado = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet({ folha = false }, sheetState = estado) {
            FolhaDeFiltros(filtros, facetas) { novos -> folha = false; aoFiltrar(novos) }
        }
    }
}

/** Os filtros ligados como chips; tocar tira o filtro. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ChipsDosFiltros(f: Filtros, aoFiltrar: (Filtros) -> Unit) {
    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        val chip = @Composable { texto: String, sem: Filtros -> FilterChip(true, { aoFiltrar(sem) }, { Text("$texto  ✕") }) }
        if (f.comQueda) chip("Com queda de preço", f.copy(comQueda = false))
        if (f.menorPreco180d) chip("Menor preço em 180 dias", f.copy(menorPreco180d = false))
        if (f.precoMin != null || f.precoMax != null) chip(faixaDePrecoTexto(f.precoMin, f.precoMax), f.copy(precoMin = null, precoMax = null))
        if (f.lojaId != null) chip(f.lojaNome ?: "Loja", f.copy(lojaId = null, lojaNome = null))
        if (f.marca != null) chip(f.marcaNome ?: "Marca", f.copy(marca = null, marcaNome = null))
    }
}

fun faixaDePrecoTexto(min: Int?, max: Int?): String = when {
    min != null && max != null -> "${reais(min)} a ${reais(max)}"
    min != null -> "A partir de ${reais(min)}"
    max != null -> "Até ${reais(max)}"
    else -> ""
}

/** "59,90" ou "59" → 5990 centavos; vazio ou inválido → null. */
fun centavosDoTexto(t: String): Int? {
    val limpo = t.trim().replace(".", "").replace(',', '.')
    if (limpo.isEmpty()) return null
    val v = limpo.toDoubleOrNull() ?: return null
    return if (v < 0) null else Math.round(v * 100).toInt()
}

/** A folha "Filtros": queda, 180 dias, faixa de preço e, das facetas, loja e marca. Só aplica ao tocar em "Ver resultados". */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FolhaDeFiltros(inicial: Filtros, facetas: JSONObject?, aoAplicar: (Filtros) -> Unit) {
    var f by remember { mutableStateOf(inicial) }
    var min by remember { mutableStateOf(inicial.precoMin?.let { (it / 100).toString() } ?: "") }
    var max by remember { mutableStateOf(inicial.precoMax?.let { (it / 100).toString() } ?: "") }
    val coresChip = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary)
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(16.dp, 0.dp, 16.dp, 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Filtros", style = MaterialTheme.typography.titleLarge)
        LinhaDeChave("Só com queda de preço", "Queda verificada pelo histórico da loja.", f.comQueda) { f = f.copy(comQueda = it) }
        LinhaDeChave("Menor preço em 180 dias", "O preço de agora é o menor do semestre.", f.menorPreco180d) { f = f.copy(menorPreco180d = it) }
        Text("Faixa de preço (R$)", style = MaterialTheme.typography.titleSmall)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(min, { min = it.filter { c -> c.isDigit() || c == ',' } }, label = { Text("Mínimo") }, singleLine = true, modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            OutlinedTextField(max, { max = it.filter { c -> c.isDigit() || c == ',' } }, label = { Text("Máximo") }, singleLine = true, modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
        }
        val lojas = facetas?.lista("lojas") ?: emptyList()
        if (lojas.isNotEmpty()) {
            Text("Loja", style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                lojas.forEach { l ->
                    val id = l.getString("id")
                    FilterChip(f.lojaId == id, { f = if (f.lojaId == id) f.copy(lojaId = null, lojaNome = null) else f.copy(lojaId = id, lojaNome = l.getString("nome")) },
                        { Text("${l.getString("nome")} (${l.getInt("quantidade")})") }, colors = coresChip)
                }
            }
        }
        val marcas = facetas?.lista("marcas") ?: emptyList()
        if (marcas.isNotEmpty()) {
            Text("Marca", style = MaterialTheme.typography.titleSmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                marcas.forEach { b ->
                    val chave = b.getString("chave")
                    FilterChip(f.marca == chave, { f = if (f.marca == chave) f.copy(marca = null, marcaNome = null) else f.copy(marca = chave, marcaNome = b.getString("nome")) },
                        { Text("${b.getString("nome")} (${b.getInt("quantidade")})") }, colors = coresChip)
                }
            }
        }
        val pMin = centavosDoTexto(min)
        val pMax = centavosDoTexto(max)
        val faixaRuim = pMin != null && pMax != null && pMin > pMax
        if (faixaRuim) Text("O máximo está menor que o mínimo.", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedButton({ aoAplicar(Filtros()) }, Modifier.weight(1f)) { Text("Limpar") }
            androidx.compose.material3.Button({ aoAplicar(f.copy(precoMin = pMin, precoMax = pMax)) }, Modifier.weight(1f), enabled = !faixaRuim) { Text("Ver resultados") }
        }
    }
}

@Composable
private fun LinhaDeChave(titulo: String, explicacao: String, ligado: Boolean, aoMudar: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(titulo, style = MaterialTheme.typography.bodyLarge)
            Text(explicacao, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(ligado, aoMudar)
    }
}

// ------------------------------------------------------------------------------------------------ "Ver todas"
/** A lista completa de uma fileira do Início ("Ver todas"): grade com ordenar e filtrar, começando pelo que a fileira mostrava. */
@Composable
fun TelaLista(m: Modelo, titulo: String, v: VerTodas) {
    var ordem by remember { mutableStateOf(v.ordem) }
    var filtros by remember { mutableStateOf(v.filtros) }
    var facetas by remember { mutableStateOf<JSONObject?>(null) }
    val opcoes = if (ordem in Ordem.daCategoria) Ordem.daCategoria else listOf(ordem) + Ordem.daCategoria
    Moldura(titulo, { m.voltar() }) {
        ListaProdutos(m, consultaProdutos(categoria = v.categoria, subcategoria = v.subcategoria, ordem = ordem, filtros = filtros, facetas = true),
            "Nenhum produto com esses filtros agora.", grade = true, aoFacetas = { facetas = it }) {
            linhaInteira("barra") { BarraOrdemFiltros(ordem, opcoes, filtros, facetas, { ordem = it }, { filtros = it }) }
        }
    }
}
