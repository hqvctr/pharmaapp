package br.com.economae

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
fun Selo(texto: String, tipo: TipoSelo, descricao: String? = null, estilo: TextStyle = MaterialTheme.typography.labelSmall) {
    val c = MaterialTheme.colorScheme
    val (fundo, frente) = when (tipo) {
        TipoSelo.Destaque -> c.primary to c.onPrimary
        TipoSelo.Queda -> c.primaryContainer to c.onPrimaryContainer
        TipoSelo.Demonstracao -> c.secondaryContainer to c.onSecondaryContainer
        TipoSelo.Condicao -> c.tertiaryContainer to c.onTertiaryContainer
    }
    val sem = if (descricao != null) Modifier.semantics { contentDescription = descricao } else Modifier
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
