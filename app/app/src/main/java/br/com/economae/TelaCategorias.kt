package br.com.economae

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import org.json.JSONObject

// ------------------------------------------------------------------------------------------------ aba Categorias
/** Aba "Categorias": as quatro categorias do KV em cartões pastel (2 por linha); tocar abre a página da categoria. */
@Composable
fun AbaCategorias(m: Modelo) {
    val cats = m.categorias
    Column(Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Categorias", style = MaterialTheme.typography.titleLarge)
        CampoBuscaFalso("Buscar produtos, marcas ou categorias…") { m.ir(Tela.Busca()) }
        if (cats.isEmpty()) { Vazio("As categorias não carregaram. Volte e entre de novo."); return@Column }
        cats.chunked(2).forEach { par ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                par.forEach { c -> CartaoCategoria(c, Modifier.weight(1f)) { m.ir(Tela.Categoria(c.getString("slug"))) } }
                if (par.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun CartaoCategoria(c: JSONObject, modifier: Modifier = Modifier, aoAbrir: () -> Unit) {
    val slug = c.getString("slug")
    val cores = coresDaCategoria(slug)
    val subs = resumoDeSubcategorias(c.lista("subcategorias").map { it.getString("rotulo") })
    Surface(onClick = aoAbrir, modifier = modifier.height(150.dp), shape = MaterialTheme.shapes.large, color = cores.fundo, contentColor = cores.texto) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Icon(iconeDaCategoria(slug), contentDescription = null, modifier = Modifier.size(32.dp))
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(c.getString("rotulo"), style = MaterialTheme.typography.titleMedium)
                if (subs.isNotBlank()) Text(subs, style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
        }
    }
}

// ------------------------------------------------------------------------------------------------ página da categoria
/** Página de uma categoria (03 do KV): busca, faixa, chips das subcategorias, ordenar e filtrar e a grade de produtos com foto. */
@Composable
fun TelaCategoria(m: Modelo, slug: String, subInicial: String?) {
    val cat = m.categoria(slug)
    val rotulo = cat?.getString("rotulo") ?: slug
    val subs = cat?.lista("subcategorias") ?: emptyList()
    var sub by remember(slug) { mutableStateOf(subInicial) }
    var ordem by remember(slug) { mutableStateOf(Ordem.Novidades) }
    var filtros by remember(slug) { mutableStateOf(Filtros()) }
    var facetas by remember(slug) { mutableStateOf<JSONObject?>(null) }
    val cores = coresDaCategoria(slug)
    Moldura(rotulo, { m.voltar() }) {
        ListaProdutos(m, consultaProdutos(categoria = slug, subcategoria = sub, ordem = ordem, filtros = filtros, facetas = true),
            "Nenhum produto disponível agora${if (sub != null) " nesta subcategoria" else ""}${if (filtros.ativos > 0) " com esses filtros" else ""}. Os produtos aparecem quando alguma loja entrega no seu CEP.",
            grade = true, aoFacetas = { facetas = it },
            cabecalho = {
                linhaInteira("busca") { CampoBuscaFalso("Buscar em ${rotulo.lowercase()}…") { m.ir(Tela.Busca(slug)) } }
                linhaInteira("faixa") { Faixa(chamadaDaCategoria(slug, rotulo), "Qualidade, carinho e economia.", cores.fundo, cores.texto) }
                if (subs.isNotEmpty()) linhaInteira("subcategorias") {
                    val coresChip = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        item { FilterChip(sub == null, { sub = null }, { Text("Todos") }, colors = coresChip) }
                        items(subs, key = { it.getString("slug") }) { s -> FilterChip(sub == s.getString("slug"), { sub = s.getString("slug") }, { Text(s.getString("rotulo")) }, colors = coresChip) }
                    }
                }
                linhaInteira("barra") { BarraOrdemFiltros(ordem, Ordem.daCategoria, filtros, facetas, { ordem = it }, { filtros = it }) }
            })
    }
}

// ------------------------------------------------------------------------------------------------ busca
/** Pesquisa de produto (05 do KV). A consulta sai só ao tocar em buscar no teclado: a API limita a 30 pesquisas por minuto. */
@Composable
fun TelaBusca(m: Modelo, categoria: String?) {
    var texto by remember { mutableStateOf("") }
    var consulta by remember { mutableStateOf("") }
    var ordem by remember { mutableStateOf(Ordem.Relevancia) }
    var filtros by remember { mutableStateOf(Filtros()) }
    var facetas by remember { mutableStateOf<JSONObject?>(null) }
    val foco = remember { FocusRequester() }
    val rotulo = categoria?.let { m.categoria(it)?.getString("rotulo") }
    LaunchedEffect(Unit) { foco.requestFocus() }
    Moldura(if (rotulo != null) "Buscar em ${rotulo.lowercase()}" else "Buscar", { m.voltar() }) {
        Column(Modifier.fillMaxSize()) {
            OutlinedTextField(texto, { texto = it }, label = { Text("Nome, marca ou código de barras") }, singleLine = true,
                modifier = Modifier.fillMaxWidth().padding(16.dp, 8.dp).focusRequester(foco), shape = MaterialTheme.shapes.small,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { consulta = texto.trim() }))
            if (consulta.length < 2) { Vazio("Digite pelo menos 2 letras e toque em buscar."); return@Column }
            // A pesquisa fica em lista (como a da Amazon): o nome inteiro ajuda a escolher entre resultados parecidos.
            ListaProdutos(m, consultaProdutos(q = consulta, categoria = categoria, ordem = ordem, filtros = filtros, facetas = true), "Nenhum produto encontrado para \"$consulta\"${if (filtros.ativos > 0) " com esses filtros" else ""}.",
                aoFacetas = { facetas = it }) {
                linhaInteira("barra") { BarraOrdemFiltros(ordem, Ordem.daPesquisa, filtros, facetas, { ordem = it }, { filtros = it }) }
            }
        }
    }
}

// ------------------------------------------------------------------------------------------------ lista paginada
private enum class Estado { Carregando, Pronto, Falha }

/**
 * Lista de produtos paginada por cursor: carrega a primeira página quando `consulta` muda e a próxima ao chegar perto do fim.
 * `grade` = duas colunas de `CartaoProduto` (categoria, Início); sem grade, uma coluna de `LinhaProduto` (pesquisa, favoritos).
 * `cabecalho` entra antes dos produtos, dentro da mesma grade (rola junto; use `linhaInteira`). `aoFacetas` recebe as lojas e marcas da
 * primeira página. Trocar de consulta começa de novo do topo.
 */
@Composable
fun ListaProdutos(m: Modelo, consulta: String, vazio: String, grade: Boolean = false, aoFacetas: ((JSONObject?) -> Unit)? = null,
                  rodapeVazio: (LazyGridScope.() -> Unit)? = null, cabecalho: LazyGridScope.() -> Unit = {}) {
    var itens by remember(consulta) { mutableStateOf<List<JSONObject>>(emptyList()) }
    var cursor by remember(consulta) { mutableStateOf<String?>(null) }
    var estado by remember(consulta) { mutableStateOf(Estado.Carregando) }
    var mensagem by remember(consulta) { mutableStateOf("") }
    var maisCarregando by remember(consulta) { mutableStateOf(false) }
    var erroMais by remember(consulta) { mutableStateOf<String?>(null) }
    var tentativa by remember(consulta) { mutableStateOf(0) }
    val lista = rememberLazyGridState()

    /** Pede uma página. Na primeira, falha troca a tela por "tentar de novo"; nas seguintes, a lista já carregada fica e o erro aparece no fim. */
    suspend fun pagina(depoisDe: String?) {
        val resposta = try { m.api.get(if (depoisDe == null) consulta else "$consulta&cursor=$depoisDe") } catch (e: SemConexao) {
            if (depoisDe == null) { mensagem = e.message ?: "Sem conexão."; estado = Estado.Falha } else erroMais = e.message ?: "Sem conexão."
            return
        }
        val corpo = resposta.corpo
        if (!resposta.ok || corpo == null) {
            if (depoisDe == null) { mensagem = resposta.mensagem; estado = Estado.Falha } else erroMais = resposta.mensagem
            return
        }
        // A paginação é por posição: se o catálogo mudar entre duas páginas, um produto pode vir de novo. A chave da lista tem de ser única.
        itens = if (depoisDe == null) corpo.lista("itens") else itens + corpo.lista("itens").filter { n -> itens.none { it.getString("id") == n.getString("id") } }
        if (depoisDe == null) aoFacetas?.invoke(corpo.optJSONObject("facetas"))
        cursor = corpo.textoOuNulo("proximo_cursor")
        estado = Estado.Pronto
    }

    LaunchedEffect(consulta, tentativa) { estado = Estado.Carregando; pagina(null) }
    LaunchedEffect(consulta, estado, erroMais) {
        // Perto do fim da lista: pede a próxima página (uma de cada vez; depois de um erro, só ao tocar em tentar de novo).
        snapshotFlow { lista.layoutInfo.visibleItemsInfo.lastOrNull()?.index to lista.layoutInfo.totalItemsCount }.collect { (ultimo, total) ->
            val c = cursor
            if (estado == Estado.Pronto && c != null && erroMais == null && !maisCarregando && ultimo != null && ultimo >= total - 3) {
                maisCarregando = true
                try { pagina(c) } finally { maisCarregando = false } // se o efeito for cancelado no meio, o giro não fica preso
            }
        }
    }

    LazyVerticalGrid(GridCells.Fixed(if (grade) 2 else 1), Modifier.fillMaxSize(), lista, contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        cabecalho()
        when (estado) {
            Estado.Carregando -> linhaInteira("carregando") { Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) { CircularProgressIndicator() } }
            Estado.Falha -> linhaInteira("falha") {
                Column(Modifier.fillMaxWidth().padding(16.dp), Arrangement.spacedBy(8.dp), Alignment.CenterHorizontally) {
                    Text(mensagem, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
                    OutlinedButton({ tentativa += 1 }) { Text("Tentar de novo") }
                }
            }
            Estado.Pronto -> {
                if (itens.isEmpty()) {
                    linhaInteira("vazio") { Text(vazio, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 24.dp)) }
                    rodapeVazio?.invoke(this)
                }
                items(itens, key = { it.getString("id") }) { p ->
                    if (grade) CartaoProduto(m, p) { m.ir(Tela.Produto(p.getString("id"))) } else LinhaProduto(m, p, { m.ir(Tela.Produto(p.getString("id"))) })
                }
                if (maisCarregando) linhaInteira("mais") { Box(Modifier.fillMaxWidth().padding(16.dp), Alignment.Center) { CircularProgressIndicator(Modifier.size(24.dp)) } }
                erroMais?.let { msg ->
                    linhaInteira("erro-mais") {
                        Column(Modifier.fillMaxWidth().padding(8.dp), Arrangement.spacedBy(8.dp), Alignment.CenterHorizontally) {
                            Text(msg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                            OutlinedButton({ erroMais = null }) { Text("Tentar de novo") }
                        }
                    }
                }
            }
        }
    }
}
