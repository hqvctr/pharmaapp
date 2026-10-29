package br.com.economae

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.List
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun TelaFeed(m: Modelo) = Moldura("Ofertas em destaque", { m.voltar() }) { FeedConteudo(m) }

@Composable
fun FeedConteudo(m: Modelo) {
    var categoria by remember { mutableStateOf<String?>(null) }
    val cats = m.config?.optJSONArray("categorias")?.objetos() ?: emptyList()
    Column(Modifier.fillMaxSize()) {
        Text("Promoções das categorias que você marcou", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp, 8.dp, 16.dp, 4.dp))
        // Chips do KV: o escolhido em rosa cheio.
        val coresChip = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary)
        LazyRow(contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { FilterChip(categoria == null, { categoria = null }, { Text("Todas") }, colors = coresChip) }
            items(cats) { c -> FilterChip(categoria == c.getString("slug"), { categoria = c.getString("slug") }, { Text(c.getString("rotulo")) }, colors = coresChip) }
        }
        Carregar(listOf(categoria, m.versao), {
            m.api.get("/v1/alertas?limite=30" + (categoria?.let { "&categoria=$it" } ?: ""))
        }) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) {
                val motivo = when (corpo.textoOuNulo("vazio_por")) {
                    "sem_ceps" -> "Você ainda não cadastrou um CEP. Vá em Perfil → Categorias e CEP."
                    "sem_categorias" -> "Você ainda não escolheu categorias. Vá em Perfil → Categorias e CEP."
                    else -> "Nenhuma promoção ativa agora. O feed só mostra ofertas coletadas nas últimas horas, das categorias que você marcou."
                }
                var escolhidas by remember { mutableStateOf<String?>(null) }
                LaunchedEffect(m.versao) {
                    try {
                        val p = m.api.get("/v1/preferencias")
                        val rotulos = m.config?.optJSONArray("categorias")?.objetos()?.associate { it.getString("slug") to it.getString("rotulo") } ?: emptyMap()
                        if (p.ok && p.corpo != null) escolhidas = p.corpo.getJSONArray("categorias").textos().joinToString(", ") { rotulos[it] ?: it }
                    } catch (_: SemConexao) {}
                }
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), Arrangement.spacedBy(12.dp), Alignment.CenterHorizontally) {
                    // Decorativa: o texto abaixo explica o vazio.
                    Image(painterResource(R.drawable.arte_vazio_feed), contentDescription = null, modifier = Modifier.size(120.dp))
                    Text(motivo, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
                    escolhidas?.takeIf { it.isNotBlank() }?.let {
                        Text("Categorias que você acompanha: $it.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                        Text("Se nenhuma delas tem oferta coletada agora, a lista fica vazia. Troque em Perfil → Categorias e CEP.", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                    Botao("Mudar categorias e CEP") { m.ir(Tela.Preferencias) }
                    OutlinedButton({ m.raiz(Tela.Principal(Abas.CATEGORIAS)) }, Modifier.fillMaxWidth()) { Text("Ver produtos por categoria") }
                    OutlinedButton(recarregar, Modifier.fillMaxWidth()) { Text("Atualizar") }
                }
                return@Carregar
            }
            LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(itens, key = { it.getString("id") }) { a -> CartaoAlerta(a) { m.ir(Tela.Alerta(a.getString("id"))) } }
                item { OutlinedButton(recarregar, Modifier.fillMaxWidth()) { Text("Atualizar") } }
            }
        }
    }
}

@Composable
fun CartaoAlerta(a: JSONObject, aoAbrir: () -> Unit) {
    val p = a.getJSONObject("produto")
    val loja = a.getJSONObject("loja")
    val queda = percentual(a.getDouble("queda"))
    // Cartão das listas do KV: selos no topo, nome, loja, preço em verde e o de antes em cinza.
    Cartao(aoTocar = aoAbrir) {
      Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        FotoProduto(p.textoOuNulo("imagem_url"), Modifier.size(88.dp))
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                if (a.optBoolean("destaque")) Selo("DESTAQUE", TipoSelo.Destaque)
                a.textoOuNulo("rotulo_condicao")?.let { Selo(it, tipoDoRotulo(it)) }
                Spacer(Modifier.weight(1f))
                if (temQueda(a)) Selo("-$queda", TipoSelo.Queda, descricao = "queda de $queda")
            }
            Text(p.getString("nome"), style = MaterialTheme.typography.titleSmall)
            Text("${loja.getString("nome")} · ${embalagemTexto(p)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(reais(a.getInt("preco_centavos")), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.tertiary)
                if (temQueda(a)) Text("antes ${reais(a.getInt("preco_referencia_centavos"))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp))
            }
            if (a.getString("situacao") != "ativa") Text("Esta promoção já acabou ou está em revisão", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
      }
    }
}

// ------------------------------------------------------------------------------------------------ buscar
@Composable
fun AbaBuscar(m: Modelo) {
    var texto by remember { mutableStateOf("") }
    var consulta by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(12.dp)) {
        OutlinedTextField(texto, { texto = it }, label = { Text("Nome, marca ou código de barras") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { consulta = texto.trim() }))
        Spacer(Modifier.height(8.dp))
        if (consulta.length < 2) { Vazio("Digite pelo menos 2 letras e toque em buscar."); return@Column }
        Carregar(listOf(consulta, m.versao), { m.api.get("/v1/produtos?limite=30&q=" + java.net.URLEncoder.encode(consulta, "UTF-8")) }) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) { Vazio("Nenhum produto encontrado para \"$consulta\"."); return@Carregar }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(itens, key = { it.getString("id") }) { p ->
                    Cartao(aoTocar = { m.ir(Tela.Produto(p.getString("id"))) }) {
                        Column(Modifier.padding(14.dp)) {
                            Text(p.getString("nome"), style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text(embalagemTexto(p), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val menor = p.inteiroOuNulo("menor_preco_centavos")
                                if (menor != null) Text("a partir de ${reais(menor)}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.tertiary)
                                else Text("sem oferta na sua região", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (p.optBoolean("seguido")) Text("★ seguindo", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}

