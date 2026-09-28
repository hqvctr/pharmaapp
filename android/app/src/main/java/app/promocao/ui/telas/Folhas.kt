package app.promocao.ui.telas

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import app.promocao.R
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Números da conferência vindos da configuração do tenant (backend/config/tenants/padrao.json). */
data class RegrasConferencia(val limiarPercentual: Int = 25, val limiarPereciveisPercentual: Int = 35, val diasMinimos: Int = 14)

/** "Como a gente confere" — linguagem simples, sem jargão (UX_COPY 3). */
@Composable
fun ComoConferimos(regras: RegrasConferencia = RegrasConferencia()) {
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(Espaco.e5).navigationBarsPadding(),
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Text(stringResource(R.string.como_titulo), style = Tipo.tituloTela, color = Tema.cores.texto, modifier = Modifier.semantics { heading() })
        listOf(
            stringResource(R.string.como_1),
            stringResource(R.string.como_2, regras.limiarPercentual, regras.limiarPereciveisPercentual),
            stringResource(R.string.como_3),
            stringResource(R.string.como_4),
            stringResource(R.string.como_5),
            stringResource(R.string.como_6, regras.diasMinimos),
        ).forEach { texto ->
            Row(horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
                Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = Tema.cores.prova)
                Text(texto, style = Tipo.corpo, color = Tema.cores.texto, modifier = Modifier.weight(1f))
            }
        }
    }
}

/**
 * Premium (segundo CEP). Preço, período e renovação vêm da Google Play Billing, nunca de texto fixo
 * (S-11, S-14). Tudo aparece antes do botão.
 */
@Composable
fun PremiumFolha(precoFormatadoPelaPlay: String, periodo: String, aoAssinar: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().padding(Espaco.e5).navigationBarsPadding(),
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Text(stringResource(R.string.premium_titulo), style = Tipo.tituloTela, color = Tema.cores.texto, modifier = Modifier.semantics { heading() })
        Text(stringResource(R.string.premium_texto), style = Tipo.corpo, color = Tema.cores.textoSecundario)
        Text(stringResource(R.string.premium_preco, precoFormatadoPelaPlay, periodo), style = Tipo.tituloSecao, color = Tema.cores.texto)
        Text(stringResource(R.string.premium_renovacao), style = Tipo.apoio, color = Tema.cores.textoSecundario)
        Button(onClick = aoAssinar, modifier = Modifier.fillMaxWidth().heightIn(min = Alvo.botaoPrincipalAltura)) {
            Text(stringResource(R.string.premium_acao, precoFormatadoPelaPlay), style = Tipo.rotulo)
        }
    }
}
