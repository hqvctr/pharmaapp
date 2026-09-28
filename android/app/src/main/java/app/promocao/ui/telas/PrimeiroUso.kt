package app.promocao.ui.telas

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.promocao.R
import app.promocao.formato.Cep
import app.promocao.formato.Formato
import app.promocao.modelo.Categoria
import app.promocao.modelo.Exemplos
import app.promocao.modelo.OfertaUi
import app.promocao.notificacao.ModelosNotificacao
import app.promocao.notificacao.TextosNotificacao
import app.promocao.ui.componentes.exemplo
import app.promocao.ui.componentes.icone
import app.promocao.ui.componentes.rotulo
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.IconeTamanho
import app.promocao.ui.theme.Raio
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo
import androidx.compose.ui.platform.LocalContext

/** Esqueleto comum do primeiro uso: conteúdo rolável e botões presos embaixo (cabem com fonte a 200%). */
@Composable
private fun PassoPrimeiroUso(
    titulo: String,
    texto: String?,
    acaoPrincipal: String,
    habilitada: Boolean = true,
    aoAcaoPrincipal: () -> Unit,
    acaoSecundaria: String? = null,
    aoAcaoSecundaria: () -> Unit = {},
    conteudo: @Composable () -> Unit = {},
) {
    Column(Modifier.fillMaxSize().background(Tema.cores.superficie).statusBarsPadding().navigationBarsPadding().imePadding()) {
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = Espaco.e5, vertical = Espaco.e7),
            verticalArrangement = Arrangement.spacedBy(Espaco.e5),
        ) {
            Text(titulo, style = Tipo.tituloTela, color = Tema.cores.texto, modifier = Modifier.semantics { heading() })
            texto?.let { Text(it, style = Tipo.corpo, color = Tema.cores.textoSecundario) }
            conteudo()
        }
        Column(Modifier.fillMaxWidth().padding(Espaco.e5), verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
            Button(
                onClick = aoAcaoPrincipal, enabled = habilitada,
                modifier = Modifier.fillMaxWidth().heightIn(min = Alvo.botaoPrincipalAltura),
            ) { Text(acaoPrincipal, style = Tipo.rotulo) }
            acaoSecundaria?.let {
                TextButton(onClick = aoAcaoSecundaria, modifier = Modifier.fillMaxWidth().heightIn(min = Alvo.toqueMinimo)) {
                    Text(it, style = Tipo.rotulo)
                }
            }
        }
    }
}

@Composable
fun BoasVindasTela(aoComecar: () -> Unit, aoComo: () -> Unit) {
    PassoPrimeiroUso(
        titulo = stringResource(R.string.boas_vindas_titulo),
        texto = stringResource(R.string.boas_vindas_texto),
        acaoPrincipal = stringResource(R.string.boas_vindas_acao),
        aoAcaoPrincipal = aoComecar,
        acaoSecundaria = stringResource(R.string.boas_vindas_como),
        aoAcaoSecundaria = aoComo,
    ) {
        Icon(Icons.Rounded.Verified, contentDescription = null, tint = Tema.cores.prova, modifier = Modifier.size(72.dp))
    }
}

@Composable
fun CategoriasTela(selecionadas: Set<Categoria>, aoAlternar: (Categoria) -> Unit, aoContinuar: () -> Unit) {
    val n = selecionadas.size
    PassoPrimeiroUso(
        titulo = stringResource(R.string.categorias_titulo),
        texto = stringResource(R.string.categorias_texto),
        acaoPrincipal = if (n == 0) stringResource(R.string.categorias_nenhuma) else stringResource(R.string.categorias_acao_contagem, n),
        habilitada = n > 0,
        aoAcaoPrincipal = aoContinuar,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
            Categoria.entries.forEach { c -> LinhaCategoria(c, c in selecionadas) { aoAlternar(c) } }
        }
    }
}

/** Linha de categoria: alvo inteiro ≥ 48 dp, estado dito por ícone e texto, não só por cor. */
@Composable
fun LinhaCategoria(c: Categoria, marcada: Boolean, aoAlternar: () -> Unit) {
    val cores = Tema.cores
    Surface(
        shape = RoundedCornerShape(Raio.md),
        color = if (marcada) cores.primariaContainer else cores.superficieCartao,
        border = BorderStroke(if (marcada) 2.dp else 1.dp, if (marcada) cores.primaria else cores.contornoSuave),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Raio.md))
            .toggleable(value = marcada, role = Role.Checkbox, onValueChange = { aoAlternar() }),
    ) {
        Row(
            Modifier.heightIn(min = Alvo.toqueMinimo).padding(Espaco.e4),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espaco.e4),
        ) {
            Icon(c.icone, contentDescription = null, tint = if (marcada) cores.sobrePrimariaContainer else cores.textoSecundario, modifier = Modifier.size(IconeTamanho.categoria))
            Column(Modifier.weight(1f)) {
                Text(stringResource(c.rotulo), style = Tipo.nomeProduto, color = if (marcada) cores.sobrePrimariaContainer else cores.texto)
                Text(stringResource(c.exemplo), style = Tipo.apoio, color = if (marcada) cores.sobrePrimariaContainer else cores.textoSecundario)
            }
            Icon(
                if (marcada) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (marcada) cores.primaria else cores.contorno,
            )
        }
    }
}

@Composable
fun CepTela(texto: String, aoMudar: (String) -> Unit, tentou: Boolean, aoContinuar: (Cep.Resultado) -> Unit, aoNaoSei: () -> Unit) {
    val resultado = Cep.validar(texto)
    val digitos = Cep.somenteDigitos(texto)
    PassoPrimeiroUso(
        titulo = stringResource(R.string.cep_titulo),
        texto = stringResource(R.string.cep_texto),
        acaoPrincipal = stringResource(R.string.cep_acao),
        aoAcaoPrincipal = { aoContinuar(resultado) },
        acaoSecundaria = stringResource(R.string.cep_nao_sei),
        aoAcaoSecundaria = aoNaoSei,
    ) {
        val erro = tentou && resultado is Cep.Resultado.Incompleto
        OutlinedTextField(
            value = Formato.cep(digitos),
            onValueChange = { aoMudar(Cep.somenteDigitos(it)) },
            label = { Text(stringResource(R.string.cep_rotulo), style = Tipo.apoio) },
            placeholder = { Text(stringResource(R.string.cep_exemplo), style = Tipo.corpo) },
            isError = erro,
            supportingText = if (erro) ({ Text(stringResource(R.string.cep_erro_incompleto), style = Tipo.apoio) }) else null,
            textStyle = Tipo.tituloSecao,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )
        if (tentou && resultado is Cep.Resultado.ForaDaRegiao) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(Raio.md)).background(Tema.cores.superficieContainer).padding(Espaco.e5),
                verticalArrangement = Arrangement.spacedBy(Espaco.e2),
            ) {
                Text(stringResource(R.string.cep_fora_regiao_titulo), style = Tipo.tituloSecao, color = Tema.cores.texto)
                Text(stringResource(R.string.cep_fora_regiao_texto), style = Tipo.corpo, color = Tema.cores.textoSecundario)
            }
        }
    }
}

/** Pedido de permissão em contexto (diretriz Android), com uma notificação de exemplo desenhada. */
@Composable
fun PermissaoTela(negou: Boolean, aoAceitar: () -> Unit, aoDepois: () -> Unit) {
    PassoPrimeiroUso(
        titulo = stringResource(R.string.permissao_titulo),
        texto = if (negou) stringResource(R.string.permissao_negada_texto) else stringResource(R.string.permissao_texto),
        acaoPrincipal = stringResource(R.string.permissao_aceitar),
        aoAcaoPrincipal = aoAceitar,
        acaoSecundaria = stringResource(R.string.permissao_depois),
        aoAcaoSecundaria = aoDepois,
    ) {
        Text(stringResource(R.string.permissao_exemplo_rotulo), style = Tipo.rotulo, color = Tema.cores.textoSecundario)
        ExemploNotificacao(Exemplos.protetor)
        Spacer(Modifier.size(Espaco.e3))
    }
}

/** Desenho de uma notificação recolhida, com os mesmos textos que o sistema vai mostrar. */
@Composable
fun ExemploNotificacao(o: OfertaUi) {
    val m = ModelosNotificacao.de(LocalContext.current)
    val cores = Tema.cores
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Raio.lg)).background(cores.superficieContainer).padding(Espaco.e5),
        horizontalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Espaco.e1)) {
            Text("${stringResource(R.string.app_name)} · ${o.loja}", style = Tipo.rotuloPequeno, color = cores.textoSecundario)
            Text(TextosNotificacao.titulo(o, m), style = Tipo.nomeProduto, color = cores.texto)
            Text(TextosNotificacao.texto(o, m), style = Tipo.apoio, color = cores.textoSecundario)
        }
        app.promocao.ui.componentes.IconeProduto(o, 40.dp)
    }
}
