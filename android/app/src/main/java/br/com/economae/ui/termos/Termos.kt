package br.com.economae.ui.termos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.Configuracao
import br.com.economae.dados.ErroApi
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.ui.Carregando
import br.com.economae.ui.TelaDeErro
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface EstadoTermos {
    data object Carregando : EstadoTermos
    data class Erro(val mensagem: String) : EstadoTermos
    data class Pronto(val configuracao: Configuracao, val enviando: Boolean = false, val mensagem: String? = null) : EstadoTermos
}

class TermosViewModel(private val repositorio: RepositorioEconomae, private val onAceito: () -> Unit) : ViewModel() {
    private val _estado = MutableStateFlow<EstadoTermos>(EstadoTermos.Carregando)
    val estado: StateFlow<EstadoTermos> = _estado.asStateFlow()

    init {
        carregar()
    }

    fun carregar() {
        _estado.value = EstadoTermos.Carregando
        viewModelScope.launch {
            _estado.value = try {
                EstadoTermos.Pronto(repositorio.configuracao())
            } catch (e: ErroApi) {
                EstadoTermos.Erro(e.message ?: "Erro inesperado.")
            }
        }
    }

    fun aceitar() {
        val atual = _estado.value as? EstadoTermos.Pronto ?: return
        _estado.value = atual.copy(enviando = true, mensagem = null)
        viewModelScope.launch {
            try {
                repositorio.aceitarTermos(atual.configuracao.documentos.termos.versao)
                onAceito()
            } catch (e: ErroApi) {
                _estado.value = atual.copy(enviando = false, mensagem = e.message)
            }
        }
    }
}

@Composable
fun TermosRota(viewModel: TermosViewModel, onSair: () -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    when (val e = estado) {
        EstadoTermos.Carregando -> Carregando()
        is EstadoTermos.Erro -> TelaDeErro(e.mensagem, viewModel::carregar)
        is EstadoTermos.Pronto -> TermosTela(e, onAceitar = viewModel::aceitar, onSair = onSair)
    }
}

@Composable
fun TermosTela(estado: EstadoTermos.Pronto, onAceitar: () -> Unit, onSair: () -> Unit, modifier: Modifier = Modifier) {
    val docs = estado.configuracao.documentos
    val abrir = LocalUriHandler.current
    var concordo by remember { mutableStateOf(false) }
    Column(
        modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("Antes de começar", style = MaterialTheme.typography.headlineSmall)
        Text(
            "O ${estado.configuracao.nome} mostra promoções de lojas parceiras. Não vendemos nada: preço, estoque e " +
                "entrega são da loja. Quando você compra por um link nosso, podemos receber comissão.",
        )
        Text("Termos de uso, versão ${docs.termos.versao}", style = MaterialTheme.typography.titleSmall)
        if (docs.termos.url != null) {
            TextButton(onClick = { abrir.openUri(docs.termos.url) }) { Text("Ler os termos de uso") }
        } else {
            Text("O texto dos termos está em revisão e será publicado antes do lançamento.", style = MaterialTheme.typography.bodySmall)
        }
        if (docs.privacidade.url != null) {
            TextButton(onClick = { abrir.openUri(docs.privacidade.url) }) { Text("Ler a política de privacidade") }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = concordo, onCheckedChange = { concordo = it })
            Text("Tenho 18 anos ou mais e aceito os termos de uso.")
        }
        Button(onClick = onAceitar, enabled = concordo && !estado.enviando, modifier = Modifier.fillMaxWidth()) {
            Text(if (estado.enviando) "Salvando…" else "Continuar")
        }
        TextButton(onClick = onSair) { Text("Sair") }
        estado.mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}
