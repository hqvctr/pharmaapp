package app.promocao.ui.telas

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import app.promocao.R
import app.promocao.modelo.AvisoUi
import app.promocao.modelo.EstadoAvisos
import app.promocao.modelo.Exemplos
import app.promocao.modelo.OfertaUi
import app.promocao.ui.componentes.CabecalhoSecao
import app.promocao.ui.componentes.CartaoOferta
import app.promocao.ui.componentes.EsqueletoCartao
import app.promocao.ui.componentes.EstadoTela
import app.promocao.ui.componentes.FaixaAviso
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.Raio
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo
import app.promocao.formato.Formato

/** Tudo o que já foi avisado, por dia. Existe porque a notificação some (review Promobit, DOSSIE 2.1). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AvisosTela(estado: EstadoAvisos, avisosLigados: Boolean, aoAbrir: (OfertaUi) -> Unit, aoLigarAvisos: () -> Unit) {
    val cores = Tema.cores
    Column(Modifier.fillMaxSize().background(cores.superficie)) {
        TopAppBar(
            title = { Text(stringResource(R.string.avisos_titulo), style = Tipo.tituloTela) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = cores.superficie, titleContentColor = cores.texto),
        )
        if (!avisosLigados) {
            FaixaAviso(
                Icons.Rounded.NotificationsOff, stringResource(R.string.avisos_desligados_faixa),
                fundo = cores.condicaoContainer, conteudo = cores.sobreCondicaoContainer,
                acao = stringResource(R.string.avisos_desligados_acao), aoAgir = aoLigarAvisos,
            )
        }
        when (estado) {
            EstadoAvisos.Carregando -> Column(Modifier.padding(Espaco.e5), verticalArrangement = Arrangement.spacedBy(Espaco.e4)) {
                repeat(2) { EsqueletoCartao() }
            }
            EstadoAvisos.Vazio -> EstadoTela(
                Icons.Rounded.Notifications, stringResource(R.string.avisos_vazio_titulo), stringResource(R.string.avisos_vazio_texto),
            )
            EstadoAvisos.Erro -> EstadoTela(Icons.Rounded.Error, stringResource(R.string.avisos_erro), null, corIcone = cores.erro)
            is EstadoAvisos.Lista -> {
                val porDia = estado.avisos.groupBy { it.dia }
                val hoje = stringResource(R.string.avisos_hoje)
                val ontem = stringResource(R.string.avisos_ontem)
                LazyColumn(
                    contentPadding = PaddingValues(start = Espaco.e5, end = Espaco.e5, bottom = Espaco.e8),
                    verticalArrangement = Arrangement.spacedBy(Espaco.e4),
                ) {
                    porDia.forEach { (dia, avisos) ->
                        item(key = dia.toString()) {
                            val titulo = when (dia) {
                                Exemplos.hoje -> hoje
                                Exemplos.hoje.minusDays(1) -> ontem
                                else -> Formato.data(dia)
                            }
                            CabecalhoSecao(titulo, null)
                        }
                        items(avisos, key = { it.oferta.id }) { Aviso(it, aoAbrir) }
                    }
                }
            }
        }
    }
}

@Composable
private fun Aviso(a: AvisoUi, aoAbrir: (OfertaUi) -> Unit) {
    val cores = Tema.cores
    Column(verticalArrangement = Arrangement.spacedBy(Espaco.e2)) {
        Row(
            Modifier.clip(RoundedCornerShape(Raio.total))
                .background(if (a.ativa) cores.economiaContainer else cores.superficieContainerAlta)
                .padding(horizontal = Espaco.e3, vertical = Espaco.e1),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Espaco.e2),
        ) {
            if (!a.ativa) Icon(Icons.Rounded.EventBusy, contentDescription = null, tint = cores.texto)
            Text(
                stringResource(if (a.ativa) R.string.avisos_ativa else R.string.avisos_encerrada),
                style = Tipo.rotulo, color = if (a.ativa) cores.sobreEconomiaContainer else cores.texto,
            )
        }
        // Encerrada não é atenuada (opacidade derrubaria o contraste abaixo de 4,5:1); a etiqueta comunica.
        CartaoOferta(a.oferta, aoTocar = { aoAbrir(a.oferta) }, modifier = Modifier.fillMaxWidth())
    }
}
