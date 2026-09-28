package app.promocao.ui.telas

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.formato.Prova
import app.promocao.formato.Selo
import app.promocao.modelo.EstadoDetalhe
import app.promocao.modelo.OfertaUi
import app.promocao.ui.componentes.BlocoPreco
import app.promocao.ui.componentes.EsqueletoCartao
import app.promocao.ui.componentes.EstadoTela
import app.promocao.ui.componentes.EtiquetaExcepcional
import app.promocao.ui.componentes.FaixaAviso
import app.promocao.ui.componentes.FaixaCondicao
import app.promocao.ui.componentes.GraficoPreco
import app.promocao.ui.componentes.IconeProduto
import app.promocao.ui.componentes.LinhaCobertura
import app.promocao.ui.componentes.LinhaIconeTexto
import app.promocao.ui.componentes.ReguaPreco
import app.promocao.ui.componentes.SeloProva
import app.promocao.ui.componentes.textoCondicao
import app.promocao.ui.componentes.textoPeriodo
import app.promocao.modelo.Nivel
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.Raio
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DetalheTela(
    estado: EstadoDetalhe,
    aoVoltar: () -> Unit,
    aoAbrirLoja: (OfertaUi) -> Unit,
    aoCompartilhar: (OfertaUi) -> Unit,
    aoVerHoje: () -> Unit,
    aoComo: () -> Unit,
    aoTentarDeNovo: () -> Unit,
) {
    val cores = Tema.cores
    Column(Modifier.fillMaxSize().background(cores.superficie)) {
        TopAppBar(
            title = {},
            navigationIcon = {
                IconButton(onClick = aoVoltar) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = stringResource(R.string.a11y_voltar)) }
            },
            actions = {
                if (estado is EstadoDetalhe.Pronto) {
                    IconButton(onClick = { aoCompartilhar(estado.oferta) }) {
                        Icon(Icons.Rounded.Share, contentDescription = stringResource(R.string.detalhe_compartilhar))
                    }
                }
            },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = cores.superficie, navigationIconContentColor = cores.texto, actionIconContentColor = cores.texto),
        )
        when (estado) {
            EstadoDetalhe.Carregando -> Column(Modifier.padding(Espaco.e5)) { EsqueletoCartao() }
            is EstadoDetalhe.Erro -> {
                if (estado.parcial != null) {
                    FaixaAviso(
                        Icons.Rounded.CloudOff, stringResource(R.string.erro_texto),
                        fundo = cores.superficieContainerAlta, conteudo = cores.texto,
                        acao = stringResource(R.string.erro_acao), aoAgir = aoTentarDeNovo,
                    )
                    Conteudo(estado.parcial, aoAbrirLoja, aoVerHoje, aoComo)
                } else {
                    EstadoTela(
                        Icons.Rounded.CloudOff, stringResource(R.string.erro_titulo), stringResource(R.string.erro_texto),
                        corIcone = cores.erro, acao = stringResource(R.string.erro_acao), aoAgir = aoTentarDeNovo,
                    )
                }
            }
            is EstadoDetalhe.Pronto -> {
                if (estado.offline) {
                    FaixaAviso(
                        Icons.Rounded.CloudOff, stringResource(R.string.offline_faixa, Formato.hora(estado.oferta.conferidoEm)),
                        fundo = cores.superficieContainerAlta, conteudo = cores.texto,
                    )
                }
                Conteudo(estado.oferta, aoAbrirLoja, aoVerHoje, aoComo)
            }
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.ColumnScope.Conteudo(
    o: OfertaUi,
    aoAbrirLoja: (OfertaUi) -> Unit,
    aoVerHoje: () -> Unit,
    aoComo: () -> Unit,
) {
    val cores = Tema.cores
    var verDias by rememberSaveable { mutableStateOf(false) }
    Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
        // 1. O que mudou depois do aviso vem antes de tudo (R8, R9).
        o.encerrada?.let {
            Column(Modifier.fillMaxWidth().background(cores.erroContainer).padding(Espaco.e5), verticalArrangement = Arrangement.spacedBy(Espaco.e2)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
                    Icon(Icons.Rounded.EventBusy, contentDescription = null, tint = cores.sobreErroContainer)
                    Text(stringResource(R.string.detalhe_encerrada_titulo), style = Tipo.tituloSecao, color = cores.sobreErroContainer)
                }
                Text(
                    stringResource(R.string.detalhe_encerrada_texto, Formato.data(it.dia), Formato.hora(it.hora), Formato.reais(it.precoVoltouCentavos)),
                    style = Tipo.corpo, color = cores.sobreErroContainer,
                )
            }
        }
        o.precoMudou?.let {
            FaixaCondicao(stringResource(R.string.detalhe_mudou, Formato.reais(it.novoPrecoCentavos), Formato.hora(it.hora)))
        }
        // 2. Condição antes do preço (princípio 4).
        textoCondicao(o)?.let { FaixaCondicao(it) }

        Column(Modifier.padding(Espaco.e5), verticalArrangement = Arrangement.spacedBy(Espaco.e4)) {
            Row(horizontalArrangement = Arrangement.spacedBy(Espaco.e4)) {
                IconeProduto(o, 64.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Espaco.e1)) {
                    if (o.nivel == Nivel.EXCEPCIONAL && !o.ehRemedio) EtiquetaExcepcional()
                    Text(o.nomeCurto, style = Tipo.tituloSecao, color = cores.texto, modifier = Modifier.semantics { heading() })
                    Text(stringResource(R.string.detalhe_embalagem, o.embalagem.rotulo), style = Tipo.apoio, color = cores.textoSecundario)
                    Text(o.loja, style = Tipo.apoio, color = cores.textoSecundario)
                }
            }
            if (o.ehRemedio) {
                // Remédio: lista de preço + advertência, sem prova promocional (S-27).
                Text(Formato.reais(o.precoCentavos), style = Tipo.precoDestaque, color = cores.texto)
                Text(stringResource(R.string.remedio_advertencia), style = Tipo.rotulo, color = cores.texto)
            } else {
                BlocoPreco(o, destaque = true)
                val (unidade, valor) = Formato.precoPorUnidade(o.precoEfetivoCentavos, o.embalagem)
                Text(
                    when (unidade) {
                        Formato.UnidadeExibicao.POR_100ML -> stringResource(R.string.unidade_por_100ml, Formato.reais(valor))
                        Formato.UnidadeExibicao.POR_100G -> stringResource(R.string.unidade_por_100g, Formato.reais(valor))
                        Formato.UnidadeExibicao.POR_UNIDADE -> stringResource(R.string.unidade_por_un, Formato.reais(valor))
                    },
                    style = Tipo.apoio, color = cores.textoSecundario,
                )
                // 3. Prova na primeira dobra, não numa aba (R13).
                BlocoProva(o, verDias, aoAlternarDias = { verDias = !verDias }, aoComo = aoComo)
            }
            LinhaCobertura(o)
            LinhaIconeTexto(Icons.Rounded.Schedule, stringResource(R.string.detalhe_conferido, Formato.hora(o.conferidoEm)))
            Text(stringResource(R.string.detalhe_afiliado), style = Tipo.apoio, color = cores.textoSecundario)
        }
    }
    // 4. Ação principal presa embaixo, sempre visível.
    Column(Modifier.fillMaxWidth().background(cores.superficie).navigationBarsPadding().padding(Espaco.e5)) {
        if (o.encerrada != null) {
            Button(onClick = aoVerHoje, modifier = Modifier.fillMaxWidth().heightIn(min = Alvo.botaoPrincipalAltura)) {
                Text(stringResource(R.string.detalhe_encerrada_acao), style = Tipo.rotulo)
            }
        } else {
            val rotuloA11y = stringResource(R.string.a11y_abrir_loja, o.loja)
            Button(
                onClick = { aoAbrirLoja(o) },
                modifier = Modifier.fillMaxWidth().heightIn(min = Alvo.botaoPrincipalAltura).semantics { contentDescription = rotuloA11y },
            ) {
                Text(stringResource(R.string.detalhe_ver_loja, o.loja), style = Tipo.rotulo)
                Icon(Icons.AutoMirrored.Rounded.OpenInNew, contentDescription = null, modifier = Modifier.padding(start = Espaco.e3).size(18.dp))
            }
        }
    }
}

@Composable
private fun BlocoProva(o: OfertaUi, verDias: Boolean, aoAlternarDias: () -> Unit, aoComo: () -> Unit) {
    val cores = Tema.cores
    val selo = Prova.selo(o)
    val periodo = textoPeriodo(selo)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(Raio.lg)).background(cores.provaContainer).padding(Espaco.e5),
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) {
        Text(stringResource(R.string.prova_titulo), style = Tipo.tituloSecao, color = cores.sobreProvaContainer, modifier = Modifier.semantics { heading() })
        SeloProva(o)
        val abaixo = Formato.reais(o.prova.precoNormalCentavos - o.precoEfetivoCentavos)
        Checagem(
            if (o.embalagensCompraMinima > 1) stringResource(R.string.prova_check_abaixo_cada, abaixo)
            else stringResource(R.string.prova_check_abaixo, abaixo),
        )
        Checagem(
            if (selo.tipo == Selo.Tipo.MENOR) stringResource(R.string.prova_check_menor, periodo)
            else stringResource(R.string.prova_check_quase, Formato.percentual(Prova.distanciaDoMenor(o)), periodo),
        )
        Checagem(stringResource(R.string.prova_check_sem_aumento))
        Column(Modifier.clip(RoundedCornerShape(Raio.md)).background(cores.superficieCartao).padding(Espaco.e4), verticalArrangement = Arrangement.spacedBy(Espaco.e3)) {
            ReguaPreco(o, compacta = false)
            Text(stringResource(R.string.prova_grafico_titulo), style = Tipo.rotulo, color = cores.texto)
            GraficoPreco(o)
            TextButton(onClick = aoAlternarDias, modifier = Modifier.heightIn(min = Alvo.toqueMinimo)) {
                Text(stringResource(if (verDias) R.string.prova_ocultar_dias else R.string.prova_ver_dias), style = Tipo.rotulo)
            }
            // Alternativa em texto ao gráfico (A04): do mais recente para o mais antigo.
            if (verDias) {
                o.prova.serieDiaria.asReversed().take(30).forEach {
                    Text(stringResource(R.string.prova_dia_linha, Formato.data(it.dia), Formato.reais(it.centavos)), style = Tipo.apoio, color = cores.texto)
                }
            }
        }
        OutlinedButton(onClick = aoComo, modifier = Modifier.heightIn(min = Alvo.toqueMinimo)) {
            Text(stringResource(R.string.prova_como), style = Tipo.rotulo, color = cores.sobreProvaContainer)
        }
    }
}

@Composable
private fun Checagem(texto: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(Espaco.e3)) {
        Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = Tema.cores.prova)
        Text(texto, style = Tipo.corpo, color = Tema.cores.sobreProvaContainer, modifier = Modifier.weight(1f))
    }
}
