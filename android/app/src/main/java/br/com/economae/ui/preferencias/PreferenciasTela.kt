package br.com.economae.ui.preferencias

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import br.com.economae.ui.Carregando
import br.com.economae.ui.TelaDeErro
import kotlin.math.roundToInt

@Composable
fun PreferenciasRota(viewModel: PreferenciasViewModel, primeiraVez: Boolean) {
    val estado by viewModel.estado.collectAsStateWithLifecycle()
    when (val e = estado) {
        EstadoPreferencias.Carregando -> Carregando()
        is EstadoPreferencias.Erro -> TelaDeErro(e.mensagem, viewModel::carregar)
        is EstadoPreferencias.Pronto -> PreferenciasTela(e, primeiraVez, viewModel::alterar, viewModel::salvar)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PreferenciasTela(
    estado: EstadoPreferencias.Pronto,
    primeiraVez: Boolean,
    onAlterar: ((FormularioPreferencias) -> FormularioPreferencias) -> Unit,
    onSalvar: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val f = estado.formulario
    val config = estado.configuracao
    Column(
        modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(if (primeiraVez) "O que você quer receber?" else "Preferências", style = MaterialTheme.typography.headlineSmall)

        Text("Categorias", style = MaterialTheme.typography.titleMedium)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            config.categorias.forEach { c ->
                FilterChip(
                    selected = c.id in f.categorias,
                    onClick = { onAlterar { it.copy(categorias = if (c.id in it.categorias) it.categorias - c.id else it.categorias + c.id) } },
                    label = { Text(c.nome) },
                )
            }
        }

        if (config.tamanhosFralda.isNotEmpty()) {
            Text("Tamanho da fralda (opcional)", style = MaterialTheme.typography.titleMedium)
            Text("Sem escolha, chegam promoções de todos os tamanhos.", style = MaterialTheme.typography.bodySmall)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                config.tamanhosFralda.forEach { t ->
                    FilterChip(
                        selected = t.id in f.tamanhosFralda,
                        onClick = {
                            onAlterar { it.copy(tamanhosFralda = if (t.id in it.tamanhosFralda) it.tamanhosFralda - t.id else it.tamanhosFralda + t.id) }
                        },
                        label = { Text(t.nome) },
                    )
                }
            }
        }

        Text("CEP de entrega", style = MaterialTheme.typography.titleMedium)
        Text("Só o CEP, nunca o endereço. Atendemos: ${config.regiao.nome}.", style = MaterialTheme.typography.bodySmall)
        f.ceps.forEachIndexed { i, cep ->
            OutlinedTextField(
                value = cep,
                onValueChange = { novo -> onAlterar { it.copy(ceps = it.ceps.toMutableList().also { l -> l[i] = novo.filter(Char::isDigit).take(8) }) } },
                label = { Text(if (i == 0) "CEP" else "Outro CEP (opcional)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Horário de silêncio", style = MaterialTheme.typography.titleMedium)
                Text("Nenhum alerta neste horário.", style = MaterialTheme.typography.bodySmall)
            }
            Switch(checked = f.silencioAtivo, onCheckedChange = { v -> onAlterar { it.copy(silencioAtivo = v) } })
        }
        if (f.silencioAtivo) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = f.silencioInicio,
                    onValueChange = { v -> onAlterar { it.copy(silencioInicio = v.take(5)) } },
                    label = { Text("Das") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = f.silencioFim,
                    onValueChange = { v -> onAlterar { it.copy(silencioFim = v.take(5)) } },
                    label = { Text("Até") },
                    singleLine = true,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Text("Até ${f.limiteDiario} alerta(s) por dia", style = MaterialTheme.typography.titleMedium)
        Slider(
            value = f.limiteDiario.toFloat(),
            onValueChange = { v -> onAlterar { it.copy(limiteDiario = v.roundToInt()) } },
            valueRange = 1f..config.limiteDiarioMaximo.toFloat(),
            steps = (config.limiteDiarioMaximo - 2).coerceAtLeast(0),
        )

        estado.mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Button(onClick = onSalvar, enabled = !estado.salvando, modifier = Modifier.fillMaxWidth()) {
            Text(if (estado.salvando) "Salvando…" else if (primeiraVez) "Ver promoções" else "Salvar")
        }
    }
}
