package br.com.economae

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import coil.compose.SubcomposeAsyncImage
import kotlinx.coroutines.launch
import org.json.JSONObject
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

sealed interface Carga<out T> {
    data object Carregando : Carga<Nothing>
    data class Falha(val mensagem: String) : Carga<Nothing>
    data class Ok<T>(val valor: T) : Carga<T>
}

/** Executa `buscar` quando `chave` muda (ou ao tentar de novo) e mostra carregando, erro ou o conteúdo. */
@Composable
fun <T> Carregar(chave: Any?, buscar: suspend () -> T, conteudo: @Composable (T, () -> Unit) -> Unit) {
    var tentativa by remember { mutableIntStateOf(0) }
    var estado by remember { mutableStateOf<Carga<T>>(Carga.Carregando) }
    LaunchedEffect(chave, tentativa) {
        estado = try { Carga.Ok(buscar()) } catch (e: SemConexao) { Carga.Falha(e.message ?: "Sem conexão.") } catch (e: Exception) { Carga.Falha(e.message ?: "Erro inesperado.") }
    }
    when (val s = estado) {
        is Carga.Carregando -> Column(Modifier.fillMaxSize(), Arrangement.Center, Alignment.CenterHorizontally) { CircularProgressIndicator() }
        is Carga.Falha -> Erro(s.mensagem) { estado = Carga.Carregando; tentativa += 1 }
        is Carga.Ok -> conteudo(s.valor) { tentativa += 1 }
    }
}

@Composable
fun Erro(mensagem: String, tentar: (() -> Unit)? = null) {
    Column(Modifier.fillMaxSize().padding(24.dp), Arrangement.Center, Alignment.CenterHorizontally) {
        Text(mensagem, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
        if (tentar != null) {
            Spacer(Modifier.height(12.dp))
            OutlinedButton(onClick = tentar) { Text("Tentar de novo") }
        }
    }
}

/** Estado vazio com uma arte do KV (decorativa: o texto já diz tudo, então o leitor de tela pula a imagem). */
@Composable
fun Vazio(texto: String, arte: Int = R.drawable.arte_vazio) {
    Column(Modifier.fillMaxSize().padding(32.dp), Arrangement.spacedBy(16.dp, Alignment.CenterVertically), Alignment.CenterHorizontally) {
        Image(painterResource(arte), contentDescription = null, modifier = Modifier.size(120.dp))
        Text(texto, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

@Composable
fun Titulo(texto: String, modifier: Modifier = Modifier) = Text(texto, style = MaterialTheme.typography.titleMedium, modifier = modifier.padding(top = 16.dp, bottom = 4.dp))

@Composable
fun Linha(rotulo: String, valor: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), Arrangement.SpaceBetween) {
        Text(rotulo, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
        Text(valor, style = MaterialTheme.typography.bodyMedium)
    }
}

/** Botão principal: o "Começar" do KV (rosa, cantos de 18, 52 de altura). */
@Composable
fun Botao(texto: String, habilitado: Boolean = true, onClick: () -> Unit) =
    Button(onClick = onClick, enabled = habilitado, shape = MaterialTheme.shapes.large, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text(texto) }

/** Cartão do KV: branco sobre o creme (no escuro, um tom acima do fundo), borda fina, cantos de 16. */
@Composable
fun Cartao(modifier: Modifier = Modifier, aoTocar: (() -> Unit)? = null, conteudo: @Composable ColumnScope.() -> Unit) {
    val cores = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow)
    val borda = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    if (aoTocar != null) Card(aoTocar, modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium, colors = cores, border = borda, content = conteudo)
    else Card(modifier.fillMaxWidth(), shape = MaterialTheme.shapes.medium, colors = cores, border = borda, content = conteudo)
}

enum class TipoSelo { Destaque, Queda, Demonstracao, Condicao }

/** O selo do `rotulo_condicao`: "DEMONSTRAÇÃO" (alerta de teste, ver DECISIONS 88) ganha cor própria. */
fun tipoDoRotulo(rotulo: String): TipoSelo = if (rotulo.trim().equals("DEMONSTRAÇÃO", ignoreCase = true)) TipoSelo.Demonstracao else TipoSelo.Condicao

/** Selo pequeno do KV (o "-32%" e afins): cantos de 8, texto em negrito. `descricao` é o que o leitor de tela fala. */
@Composable
fun Selo(texto: String, tipo: TipoSelo, descricao: String? = null, estilo: TextStyle = MaterialTheme.typography.labelSmall, modifier: Modifier = Modifier) {
    val c = MaterialTheme.colorScheme
    val (fundo, frente) = when (tipo) {
        TipoSelo.Destaque -> c.primary to c.onPrimary
        TipoSelo.Queda -> c.primaryContainer to c.onPrimaryContainer
        TipoSelo.Demonstracao -> c.secondaryContainer to c.onSecondaryContainer
        TipoSelo.Condicao -> c.tertiaryContainer to c.onTertiaryContainer
    }
    val sem = if (descricao != null) modifier.semantics { contentDescription = descricao } else modifier
    Surface(color = fundo, contentColor = frente, shape = MaterialTheme.shapes.extraSmall, modifier = sem) {
        Text(texto, Modifier.padding(horizontal = 8.dp, vertical = 3.dp), style = estilo)
    }
}

/** Logotipo: o coração do KV e o nome em Inter negrito, no lilás escuro do KV (o nome é texto: o leitor de tela lê). */
@Composable
fun Logotipo(modifier: Modifier = Modifier, estilo: TextStyle = MaterialTheme.typography.titleLarge) {
    val altura = with(LocalDensity.current) { estilo.fontSize.toDp() }
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Image(painterResource(R.drawable.marca_coracao), contentDescription = null, modifier = Modifier.height(altura * 0.8f).width(altura * 0.97f))
        Spacer(Modifier.width(altura * 0.3f))
        Text("economae", style = estilo, color = MaterialTheme.colorScheme.secondary)
    }
}

/**
 * Foto do produto, carregada da loja (`imagem_url`, só https). Sem foto, ou se a loja não responder, aparece um espaço neutro com o
 * carrinho: o produto continua utilizável. É decorativa para o leitor de tela (o nome do produto vem logo ao lado).
 */
@Composable
fun FotoProduto(url: String?, modifier: Modifier = Modifier, descricao: String? = null) {
    val neutro: @Composable () -> Unit = {
        Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.tertiaryContainer), Alignment.Center) {
            Icon(Icons.Rounded.ShoppingCart, contentDescription = null, tint = MaterialTheme.colorScheme.onTertiaryContainer.copy(alpha = 0.6f), modifier = Modifier.size(28.dp))
        }
    }
    Box(modifier.clip(MaterialTheme.shapes.small)) {
        if (url == null) neutro()
        else SubcomposeAsyncImage(model = url, contentDescription = descricao, contentScale = ContentScale.Fit, modifier = Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Color.White),
            loading = { neutro() }, error = { neutro() })
    }
}

/** Campo de busca do KV que só abre a tela de busca (a digitação acontece lá). */
@Composable
fun CampoBuscaFalso(dica: String, modifier: Modifier = Modifier, aoTocar: () -> Unit) {
    val c = MaterialTheme.colorScheme
    Surface(onClick = aoTocar, modifier = modifier.fillMaxWidth().heightIn(min = 52.dp), shape = MaterialTheme.shapes.small, color = c.surfaceContainerLow,
        border = BorderStroke(1.dp, c.outlineVariant)) {
        Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Rounded.Search, contentDescription = null, tint = c.onSurface)
            Text(dica, style = MaterialTheme.typography.bodyMedium, color = c.onSurfaceVariant)
        }
    }
}

/** Faixa de destaque das telas do KV (a do topo do Início e das categorias): fundo pastel, título, subtítulo e, se houver, um botão. */
@Composable
fun Faixa(titulo: String, subtitulo: String, fundo: androidx.compose.ui.graphics.Color, texto: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier, botao: Pair<String, () -> Unit>? = null) {
    Surface(modifier.fillMaxWidth(), shape = MaterialTheme.shapes.large, color = fundo, contentColor = texto) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(titulo, style = MaterialTheme.typography.titleLarge)
            Text(subtitulo, style = MaterialTheme.typography.bodyMedium)
            if (botao != null) {
                Spacer(Modifier.height(6.dp))
                Button(botao.second, shape = MaterialTheme.shapes.small, colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)) { Text(botao.first) }
            }
        }
    }
}

/**
 * Linha de produto das listas do KV (categoria, busca, favoritos): foto à esquerda, nome, preço em verde e o coração para
 * seguir. `p` é um ProdutoResumo com `menor_preco_centavos` e `seguido` (como em GET /v1/produtos).
 */
@Composable
fun LinhaProduto(m: Modelo, p: JSONObject, aoAbrir: () -> Unit, aoMudarSeguido: ((Boolean) -> Unit)? = null) {
    val escopo = rememberCoroutineScope()
    var seguido by remember(p) { mutableStateOf(p.optBoolean("seguido")) }
    var erro by remember(p) { mutableStateOf<String?>(null) }
    val preco = p.inteiroOuNulo("menor_preco_centavos")
    Cartao(aoTocar = aoAbrir) {
        Row(Modifier.padding(10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            FotoProduto(p.textoOuNulo("imagem_url"), Modifier.size(88.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(p.getString("nome"), style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(embalagemTexto(p), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (preco != null) Text(reais(preco), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary)
                else Text("sem oferta na sua região", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                erro?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
            }
            IconButton({
                escopo.launch {
                    try {
                        val e = alternarSeguir(m, p.getString("id"), seguido)
                        if (e == null) { seguido = !seguido; erro = null; aoMudarSeguido?.invoke(seguido) } else erro = e
                    } catch (e: SemConexao) { erro = e.message }
                }
            }) {
                Icon(if (seguido) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, tint = MaterialTheme.colorScheme.primary,
                    contentDescription = if (seguido) "Deixar de seguir ${p.getString("nome")}" else "Seguir ${p.getString("nome")}")
            }
        }
    }
}

/** Cartão da vitrine "Ofertas em destaque" do Início: selo de queda, foto, nome, preço e o botão "Ver oferta". */
@Composable
fun CartaoDestaque(d: Destaque, modifier: Modifier = Modifier, aoAbrir: () -> Unit) {
    Cartao(modifier = modifier, aoTocar = aoAbrir) {
        Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Box {
                FotoProduto(d.imagem, Modifier.fillMaxWidth().aspectRatio(1f))
                d.queda?.let { Selo(it, TipoSelo.Destaque, descricao = "queda de ${it.removePrefix("-")}", modifier = Modifier.align(Alignment.TopStart).padding(4.dp)) }
            }
            Text(d.nome, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.heightIn(min = 40.dp))
            if (d.precoCentavos != null) Text(reais(d.precoCentavos), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary)
            Button(aoAbrir, shape = MaterialTheme.shapes.small, modifier = Modifier.fillMaxWidth()) { Text("Ver oferta") }
        }
    }
}
