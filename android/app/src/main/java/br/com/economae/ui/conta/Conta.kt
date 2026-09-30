package br.com.economae.ui.conta

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.Configuracao
import br.com.economae.dados.ErroApi
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.dados.Usuario
import br.com.economae.push.FontePush
import br.com.economae.ui.Carregando
import br.com.economae.ui.TelaDeErro
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface EstadoConta {
    data object Carregando : EstadoConta
    data class Erro(val mensagem: String) : EstadoConta
    data class Pronto(
        val usuario: Usuario,
        val configuracao: Configuracao,
        val pushDisponivel: Boolean,
        val ocupado: Boolean = false,
        val mensagem: String? = null,
    ) : EstadoConta
}

class ContaViewModel(private val repositorio: RepositorioEconomae, private val push: FontePush) : ViewModel() {
    private val _estado = MutableStateFlow<EstadoConta>(EstadoConta.Carregando)
    val estado: StateFlow<EstadoConta> = _estado.asStateFlow()

    init {
        carregar()
    }

    fun carregar() {
        _estado.value = EstadoConta.Carregando
        viewModelScope.launch {
            _estado.value = try {
                EstadoConta.Pronto(repositorio.usuario(), repositorio.configuracao(), push.disponivel)
            } catch (e: ErroApi) {
                EstadoConta.Erro(e.message ?: "Erro inesperado.")
            }
        }
    }

    /** Consentimento (LGPD) primeiro; depois o aparelho entra no despacho. */
    fun definirNotificacoes(ativar: Boolean) = acao {
        val u = repositorio.definirNotificacoes(ativar)
        if (ativar) push.tokenAtual()?.let { repositorio.registrarDispositivo(it) }
        u
    }

    fun permissaoNegada() {
        val atual = _estado.value as? EstadoConta.Pronto ?: return
        _estado.value = atual.copy(mensagem = "Sem permissão de notificação no Android, os alertas não aparecem. Dá para liberar nas configurações do aparelho.")
    }

    fun sair() = acao { repositorio.sair(); null }

    fun excluirConta() = acao { repositorio.excluirConta(); null }

    private fun acao(bloco: suspend () -> Usuario?) {
        val atual = _estado.value as? EstadoConta.Pronto ?: return
        _estado.value = atual.copy(ocupado = true, mensagem = null)
        viewModelScope.launch {
            try {
                val u = bloco()
                _estado.value = atual.copy(usuario = u ?: atual.usuario, ocupado = false)
            } catch (e: ErroApi) {
                _estado.value = atual.copy(ocupado = false, mensagem = e.message)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContaRota(viewModel: ContaViewModel, onVoltar: () -> Unit, onPreferencias: () -> Unit) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    Scaffold(topBar = { TopAppBar(title = { Text("Conta") }, navigationIcon = { TextButton(onClick = onVoltar) { Text("Voltar") } }) }) { m ->
        when (val e = estado) {
            EstadoConta.Carregando -> Carregando(Modifier.padding(m))
            is EstadoConta.Erro -> TelaDeErro(e.mensagem, viewModel::carregar, Modifier.padding(m))
            is EstadoConta.Pronto -> ContaConteudo(e, viewModel, onPreferencias, Modifier.padding(m))
        }
    }
}

@Composable
private fun ContaConteudo(e: EstadoConta.Pronto, viewModel: ContaViewModel, onPreferencias: () -> Unit, modifier: Modifier) {
    val contexto = LocalContext.current
    val abrir = LocalUriHandler.current
    var confirmarExclusao by remember { mutableStateOf(false) }
    val pedirPermissao = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { concedida ->
        if (concedida) viewModel.definirNotificacoes(true) else viewModel.permissaoNegada()
    }
    fun ativar() {
        val precisaPedir = Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(contexto, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        if (precisaPedir) pedirPermissao.launch(Manifest.permission.POST_NOTIFICATIONS) else viewModel.definirNotificacoes(true)
    }

    Column(modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(e.usuario.email, style = MaterialTheme.typography.titleMedium)
        Text("Plano ${if (e.usuario.plano == "premium") "premium" else "gratuito"} · até ${e.usuario.limites.maxCeps} CEP(s)")
        HorizontalDivider()

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Alertas de promoção", style = MaterialTheme.typography.titleMedium)
                Text(
                    if (e.pushDisponivel) "Só promoção excepcional, respeitando seu horário de silêncio e o limite do dia."
                    else "Este build do app ainda não tem notificações configuradas.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Switch(
                checked = e.usuario.notificacoes.consentidas,
                enabled = e.pushDisponivel && !e.ocupado,
                onCheckedChange = { ligar -> if (ligar) ativar() else viewModel.definirNotificacoes(false) },
            )
        }
        OutlinedButton(onClick = onPreferencias, modifier = Modifier.fillMaxWidth()) { Text("Categorias, CEP e horários") }
        HorizontalDivider()

        e.configuracao.documentos.termos.url?.let { TextButton(onClick = { abrir.openUri(it) }) { Text("Termos de uso") } }
        e.configuracao.documentos.privacidade.url?.let { TextButton(onClick = { abrir.openUri(it) }) { Text("Política de privacidade") } }
        OutlinedButton(onClick = viewModel::sair, enabled = !e.ocupado, modifier = Modifier.fillMaxWidth()) { Text("Sair") }
        TextButton(onClick = { confirmarExclusao = true }, enabled = !e.ocupado) {
            Text("Excluir minha conta", color = MaterialTheme.colorScheme.error)
        }
        e.mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }

    if (confirmarExclusao) {
        AlertDialog(
            onDismissRequest = { confirmarExclusao = false },
            title = { Text("Excluir a conta?") },
            text = { Text("Apagamos seu e-mail, CEPs, preferências e histórico de alertas. Não tem volta.") },
            confirmButton = {
                TextButton(onClick = { confirmarExclusao = false; viewModel.excluirConta() }) {
                    Text("Excluir", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { confirmarExclusao = false }) { Text("Cancelar") } },
        )
    }
}
