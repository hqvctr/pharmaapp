package br.com.economae.ui.entrada

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.com.economae.ui.tema.EconomaeTema
import kotlinx.coroutines.launch

@Composable
fun EntradaRota(viewModel: EntradaViewModel) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    val contexto = LocalContext.current
    val escopo = rememberCoroutineScope()
    EntradaTela(
        estado = estado,
        onEmail = viewModel::alterarEmail,
        onCodigo = viewModel::alterarCodigo,
        onPedirCodigo = viewModel::pedirCodigo,
        onVerificar = viewModel::verificarCodigo,
        onVoltar = viewModel::voltarAoEmail,
        onGoogle = {
            escopo.launch {
                when (val r = obterIdTokenGoogle(contexto)) {
                    is ResultadoGoogle.Token -> viewModel.entrarComGoogle(r.idToken)
                    is ResultadoGoogle.Falha -> viewModel.avisar(r.mensagem)
                    ResultadoGoogle.Cancelado -> Unit
                }
            }
        },
    )
}

@Composable
fun EntradaTela(
    estado: EstadoEntrada,
    onEmail: (String) -> Unit,
    onCodigo: (String) -> Unit,
    onPedirCodigo: () -> Unit,
    onVerificar: () -> Unit,
    onVoltar: () -> Unit,
    onGoogle: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text("economae", style = MaterialTheme.typography.displaySmall, color = MaterialTheme.colorScheme.primary)
        Text(
            "Só as promoções que valem a pena, de fralda a papinha, da gestação aos primeiros anos.",
            style = MaterialTheme.typography.bodyLarge,
        )
        when (estado.etapa) {
            EtapaEntrada.Email -> {
                OutlinedTextField(
                    value = estado.email,
                    onValueChange = onEmail,
                    label = { Text("Seu e-mail") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { onPedirCodigo() }),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = onPedirCodigo, enabled = !estado.enviando, modifier = Modifier.fillMaxWidth()) {
                    Text(if (estado.enviando) "Enviando…" else "Receber código por e-mail")
                }
                if (estado.googleDisponivel) {
                    HorizontalDivider()
                    OutlinedButton(onClick = onGoogle, enabled = !estado.enviando, modifier = Modifier.fillMaxWidth()) {
                        Text("Entrar com Google")
                    }
                }
            }
            EtapaEntrada.Codigo -> {
                Text(
                    "Enviamos um código de 6 números para ${estado.email}. Ele vale por ${estado.validadeMinutos ?: 10} minutos.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                OutlinedTextField(
                    value = estado.codigo,
                    onValueChange = onCodigo,
                    label = { Text("Código") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { onVerificar() }),
                    modifier = Modifier.fillMaxWidth(),
                )
                Button(onClick = onVerificar, enabled = !estado.enviando, modifier = Modifier.fillMaxWidth()) {
                    Text(if (estado.enviando) "Conferindo…" else "Entrar")
                }
                TextButton(onClick = onVoltar) { Text("Usar outro e-mail") }
                TextButton(onClick = onPedirCodigo, enabled = !estado.enviando) { Text("Enviar outro código") }
            }
        }
        estado.mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}

@Preview(showBackground = true)
@Composable
private fun EntradaPreview() {
    EconomaeTema {
        EntradaTela(EstadoEntrada(googleDisponivel = true), {}, {}, {}, {}, {}, {})
    }
}
