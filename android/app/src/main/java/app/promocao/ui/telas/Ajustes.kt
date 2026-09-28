package app.promocao.ui.telas

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.modelo.Categoria
import app.promocao.modelo.PlanoUi
import app.promocao.modelo.PreferenciasUi
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Opções de limite diário. Padrão 3 (S-17). Nulo = sem limite. */
val OPCOES_LIMITE: List<Int?> = listOf(1, 3, 5, null)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AjustesTela(
    p: PreferenciasUi,
    destacar: Categoria?,
    aoAlternarCategoria: (Categoria) -> Unit,
    aoMudarLimite: (Int?) -> Unit,
    aoTrocarCep: () -> Unit,
    aoAdicionarCep: () -> Unit,
    aoAbrirSistema: () -> Unit,
    aoEntrar: () -> Unit,
    aoComo: () -> Unit,
    aoApagar: () -> Unit,
) {
    val cores = Tema.cores
    var confirmarApagar by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().background(cores.superficie)) {
        TopAppBar(
            title = { Text(stringResource(R.string.ajustes_titulo), style = Tipo.tituloTela) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = cores.superficie, titleContentColor = cores.texto),
        )
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = Espaco.e5).padding(bottom = Espaco.e8)) {
            Titulo(stringResource(R.string.ajustes_avisos))
            Linha(
                stringResource(R.string.ajustes_sistema),
                stringResource(if (p.avisosNoSistema) R.string.ajustes_sistema_ligado else R.string.ajustes_sistema_desligado),
                aoAbrirSistema,
            )
            Text(stringResource(R.string.ajustes_limite), style = Tipo.nomeProduto, color = cores.texto, modifier = Modifier.padding(top = Espaco.e4))
            OPCOES_LIMITE.forEach { n ->
                val rotulo = if (n == null) stringResource(R.string.ajustes_limite_sem) else stringResource(R.string.ajustes_limite_opcao, n)
                Row(
                    Modifier.fillMaxWidth().heightIn(min = Alvo.toqueMinimo)
                        .selectable(selected = p.limiteDiario == n, role = Role.RadioButton, onClick = { aoMudarLimite(n) }),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RadioButton(selected = p.limiteDiario == n, onClick = null)
                    Text(rotulo, style = Tipo.corpo, color = cores.texto, modifier = Modifier.padding(start = Espaco.e3))
                }
            }
            if (p.silencioInicio != null && p.silencioFim != null) {
                Linha(
                    stringResource(R.string.ajustes_silencio),
                    stringResource(R.string.ajustes_silencio_valor, Formato.hora(p.silencioInicio), Formato.hora(p.silencioFim)) + ". " +
                        stringResource(R.string.ajustes_silencio_texto, Formato.hora(p.silencioFim)),
                    {},
                )
            }

            Titulo(stringResource(R.string.ajustes_categorias))
            Column(verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
                // A categoria da notificação que trouxe a pessoa aqui vem primeiro (fluxo F4).
                val ordem = Categoria.entries.sortedBy { if (it == destacar) 0 else 1 }
                ordem.forEach { c -> LinhaCategoria(c, c in p.categorias) { aoAlternarCategoria(c) } }
            }

            Titulo(stringResource(R.string.ajustes_cep))
            p.ceps.forEach { Linha(Formato.cep(it), null, aoTrocarCep) }
            Linha(stringResource(R.string.ajustes_cep_adicionar), textoPlano(p.plano), aoAdicionarCep)

            Titulo(stringResource(R.string.ajustes_conta))
            if (p.contaEmail == null) {
                Text(stringResource(R.string.ajustes_sem_conta), style = Tipo.corpo, color = cores.textoSecundario)
                OutlinedButton(onClick = aoEntrar, modifier = Modifier.padding(top = Espaco.e3).heightIn(min = Alvo.toqueMinimo)) {
                    Text(stringResource(R.string.ajustes_entrar), style = Tipo.rotulo)
                }
            } else {
                Text(p.contaEmail, style = Tipo.corpo, color = cores.texto)
            }

            Titulo("")
            Linha(stringResource(R.string.ajustes_como), null, aoComo)
            Linha(stringResource(R.string.ajustes_termos), null, {})
            Linha(stringResource(R.string.ajustes_privacidade), null, {})
            TextButton(onClick = { confirmarApagar = true }, modifier = Modifier.heightIn(min = Alvo.toqueMinimo)) {
                Text(stringResource(R.string.ajustes_apagar), style = Tipo.rotulo, color = cores.erro)
            }
        }
    }
    if (confirmarApagar) {
        AlertDialog(
            onDismissRequest = { confirmarApagar = false },
            title = { Text(stringResource(R.string.apagar_titulo), style = Tipo.tituloSecao) },
            text = { Text(stringResource(R.string.apagar_texto), style = Tipo.corpo) },
            confirmButton = {
                TextButton(onClick = { confirmarApagar = false; aoApagar() }) {
                    Text(stringResource(R.string.apagar_confirmar), style = Tipo.rotulo, color = cores.erro)
                }
            },
            dismissButton = { TextButton(onClick = { confirmarApagar = false }) { Text(stringResource(R.string.apagar_cancelar), style = Tipo.rotulo) } },
        )
    }
}

@Composable
private fun textoPlano(plano: PlanoUi): String = when (plano) {
    PlanoUi.Gratuito -> stringResource(R.string.premium_titulo)
    is PlanoUi.Premium -> stringResource(R.string.premium_ativo, Formato.data(plano.ate))
    PlanoUi.Pendente -> stringResource(R.string.premium_pendente)
    PlanoUi.Expirado -> stringResource(R.string.premium_expirado)
}

@Composable
private fun Titulo(texto: String) {
    Column(Modifier.padding(top = Espaco.e7, bottom = Espaco.e3)) {
        HorizontalDivider(color = Tema.cores.contornoSuave)
        if (texto.isNotEmpty()) {
            Text(texto, style = Tipo.tituloSecao, color = Tema.cores.texto, modifier = Modifier.padding(top = Espaco.e5).semantics { heading() })
        }
    }
}

@Composable
private fun Linha(titulo: String, apoio: String?, aoTocar: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().heightIn(min = Alvo.toqueMinimo).clickable(onClick = aoTocar).padding(vertical = Espaco.e3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(titulo, style = Tipo.nomeProduto, color = Tema.cores.texto)
            apoio?.let { Text(it, style = Tipo.apoio, color = Tema.cores.textoSecundario) }
        }
        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, tint = Tema.cores.textoSecundario)
    }
}
