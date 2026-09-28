package app.promocao.ui.componentes

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.IconeTamanho
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Estado de tela (vazio, erro, medindo...). Ícone, título, texto e no máximo uma ação. */
@Composable
fun EstadoTela(
    icone: ImageVector,
    titulo: String,
    texto: String?,
    modifier: Modifier = Modifier,
    corIcone: Color = Tema.cores.prova,
    acao: String? = null,
    aoAgir: () -> Unit = {},
    extra: @Composable () -> Unit = {},
) {
    Column(
        modifier.fillMaxWidth().padding(horizontal = Espaco.e7, vertical = Espaco.e9),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Icon(icone, contentDescription = null, tint = corIcone, modifier = Modifier.size(IconeTamanho.grande * 1.5f))
        Text(titulo, style = Tipo.tituloTela, color = Tema.cores.texto, textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() })
        texto?.let { Text(it, style = Tipo.corpo, color = Tema.cores.textoSecundario, textAlign = TextAlign.Center) }
        extra()
        acao?.let {
            Button(onClick = aoAgir, modifier = Modifier.heightIn(min = Alvo.toqueMinimo)) { Text(it, style = Tipo.rotulo) }
        }
    }
}

/** Faixa de aviso no topo (sem internet, avisos desligados). Ícone + texto + ação opcional. */
@Composable
fun FaixaAviso(
    icone: ImageVector,
    texto: String,
    fundo: Color,
    conteudo: Color,
    acao: String? = null,
    aoAgir: () -> Unit = {},
) {
    Row(
        Modifier.fillMaxWidth().background(fundo).padding(horizontal = Espaco.e5, vertical = Espaco.e3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Espaco.e3),
    ) {
        Icon(icone, contentDescription = null, tint = conteudo, modifier = Modifier.size(IconeTamanho.padrao))
        Text(texto, style = Tipo.apoio, color = conteudo, modifier = Modifier.weight(1f))
        acao?.let {
            TextButton(onClick = aoAgir, modifier = Modifier.heightIn(min = Alvo.toqueMinimo)) {
                Text(it, style = Tipo.rotulo, color = conteudo)
            }
        }
    }
}

@Composable
fun CabecalhoSecao(titulo: String, texto: String?) {
    Column(Modifier.fillMaxWidth().padding(top = Espaco.e5, bottom = Espaco.e2), verticalArrangement = Arrangement.spacedBy(Espaco.e1)) {
        Text(titulo, style = Tipo.tituloSecao, color = Tema.cores.texto, modifier = Modifier.semantics { heading() })
        texto?.let { Text(it, style = Tipo.apoio, color = Tema.cores.textoSecundario) }
    }
}
