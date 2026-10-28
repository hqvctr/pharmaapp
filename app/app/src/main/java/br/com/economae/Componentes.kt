package br.com.economae

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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

@Composable
fun Vazio(texto: String) {
    Column(Modifier.fillMaxSize().padding(32.dp), Arrangement.Center, Alignment.CenterHorizontally) {
        Text(texto, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

@Composable
fun Botao(texto: String, habilitado: Boolean = true, onClick: () -> Unit) = Button(onClick = onClick, enabled = habilitado, modifier = Modifier.fillMaxWidth()) { Text(texto) }
