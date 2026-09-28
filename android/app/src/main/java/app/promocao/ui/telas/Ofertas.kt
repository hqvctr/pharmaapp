package app.promocao.ui.telas

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CloudOff
import androidx.compose.material.icons.rounded.Error
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.modelo.AnuncioUi
import app.promocao.modelo.EstadoOfertas
import app.promocao.modelo.OfertaUi
import app.promocao.ui.componentes.CabecalhoSecao
import app.promocao.ui.componentes.CartaoAnuncio
import app.promocao.ui.componentes.CartaoOferta
import app.promocao.ui.componentes.EsqueletoCartao
import app.promocao.ui.componentes.EstadoTela
import app.promocao.ui.componentes.FaixaAviso
import app.promocao.ui.componentes.ItemRemedio
import app.promocao.ui.theme.Alvo
import app.promocao.ui.theme.Espaco
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Posição mínima e espaçamento do anúncio no feed (PROPOSTA 4.6). */
private const val POSICAO_MINIMA_ANUNCIO = 2 // índice 2 = 3ª posição

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfertasTela(
    estado: EstadoOfertas,
    cep: String?,
    avisosLigados: Boolean,
    aoAbrir: (OfertaUi) -> Unit,
    aoAbrirAnuncio: (AnuncioUi) -> Unit,
    aoLigarAvisos: () -> Unit,
    aoTentarDeNovo: () -> Unit,
    aoEscolherCategorias: () -> Unit,
    aoTrocarCep: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val cores = Tema.cores
    Column(modifier.fillMaxSize().background(cores.superficie)) {
        TopAppBar(
            title = { Text(stringResource(R.string.ofertas_titulo), style = Tipo.tituloTela) },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = cores.superficie, titleContentColor = cores.texto),
        )
        // CEP abaixo do título, não nas ações da barra: com fonte a 200% as ações espremeriam o título (A05).
        if (cep != null) {
            val rotulo = stringResource(R.string.a11y_cep_trocar, Formato.cep(cep))
            AssistChip(
                onClick = aoTrocarCep,
                label = { Text(stringResource(R.string.ofertas_cep, Formato.cep(cep)), style = Tipo.rotulo) },
                leadingIcon = { Icon(Icons.Rounded.Place, contentDescription = null) },
                colors = AssistChipDefaults.assistChipColors(labelColor = cores.texto, leadingIconContentColor = cores.textoSecundario),
                modifier = Modifier.padding(horizontal = Espaco.e5).heightIn(min = Alvo.toqueMinimo).semantics { contentDescription = rotulo },
            )
        }
        if (!avisosLigados) {
            FaixaAviso(
                Icons.Rounded.NotificationsOff, stringResource(R.string.avisos_desligados_faixa),
                fundo = cores.condicaoContainer, conteudo = cores.sobreCondicaoContainer,
                acao = stringResource(R.string.avisos_desligados_acao), aoAgir = aoLigarAvisos,
            )
        }
        when (estado) {
            EstadoOfertas.Carregando -> Carregando()
            is EstadoOfertas.ComOfertas -> Lista(estado, aoAbrir, aoAbrirAnuncio)
            is EstadoOfertas.NadaHoje -> NadaHoje(estado, aoAbrir)
            is EstadoOfertas.Medindo -> EstadoTela(
                Icons.Rounded.HourglassTop,
                stringResource(R.string.medindo_titulo),
                stringResource(R.string.medindo_texto, estado.diasNecessarios, estado.diasNecessarios - estado.diasFeitos),
            ) {
                val progresso = stringResource(R.string.medindo_progresso, estado.diasFeitos, estado.diasNecessarios)
                LinearProgressIndicator(
                    progress = { estado.diasFeitos.toFloat() / estado.diasNecessarios },
                    color = cores.prova, trackColor = cores.provaContainer,
                    modifier = Modifier.fillMaxWidth().semantics { contentDescription = progresso },
                )
                Text(progresso, style = Tipo.rotulo, color = cores.prova)
            }
            EstadoOfertas.SemCategoria -> EstadoTela(
                Icons.Rounded.Tune, stringResource(R.string.sem_categoria_titulo), null,
                acao = stringResource(R.string.sem_categoria_acao), aoAgir = aoEscolherCategorias,
            )
            EstadoOfertas.SemCep -> EstadoTela(
                Icons.Rounded.Home, stringResource(R.string.sem_cep_titulo), stringResource(R.string.cep_texto),
                acao = stringResource(R.string.cep_acao), aoAgir = aoTrocarCep,
            )
            is EstadoOfertas.ForaDaRegiao -> EstadoTela(
                Icons.Rounded.Place, stringResource(R.string.cep_fora_regiao_titulo), stringResource(R.string.cep_fora_regiao_texto),
                acao = stringResource(R.string.cep_fora_regiao_acao), aoAgir = aoTrocarCep,
            )
            is EstadoOfertas.Erro -> {
                val salvas = estado.salvas
                if (salvas?.salvasDesde != null) {
                    FaixaAviso(
                        Icons.Rounded.CloudOff, stringResource(R.string.offline_faixa, Formato.hora(salvas.salvasDesde)),
                        fundo = cores.superficieContainerAlta, conteudo = cores.texto,
                        acao = stringResource(R.string.erro_acao), aoAgir = aoTentarDeNovo,
                    )
                    Lista(salvas, aoAbrir, aoAbrirAnuncio)
                } else {
                    EstadoTela(
                        Icons.Rounded.Error, stringResource(R.string.erro_titulo), stringResource(R.string.erro_texto),
                        corIcone = cores.erro, acao = stringResource(R.string.erro_acao), aoAgir = aoTentarDeNovo,
                    )
                }
            }
        }
    }
}

private val espacamentoLista = PaddingValues(start = Espaco.e5, end = Espaco.e5, bottom = Espaco.e8)

@Composable
private fun Carregando() {
    val descricao = stringResource(R.string.carregando_descricao)
    Column(
        Modifier.fillMaxWidth().padding(Espaco.e5).semantics { contentDescription = descricao },
        verticalArrangement = Arrangement.spacedBy(Espaco.e4),
    ) { repeat(3) { EsqueletoCartao() } }
}

@Composable
private fun Lista(e: EstadoOfertas.ComOfertas, aoAbrir: (OfertaUi) -> Unit, aoAbrirAnuncio: (AnuncioUi) -> Unit) {
    val resumo = if (e.resumo.aprovadas == 1) {
        stringResource(R.string.ofertas_resumo_um, Formato.milhar(e.resumo.precosConferidos))
    } else {
        stringResource(R.string.ofertas_resumo, Formato.milhar(e.resumo.precosConferidos), e.resumo.aprovadas)
    }
    val secaoExc = stringResource(R.string.secao_excepcionais)
    val secaoExcTexto = stringResource(R.string.secao_excepcionais_texto)
    val secaoBoas = stringResource(R.string.secao_boas)
    val secaoBoasTexto = stringResource(R.string.secao_boas_texto)
    LazyColumn(contentPadding = espacamentoLista, verticalArrangement = Arrangement.spacedBy(Espaco.e4)) {
        item { Text(resumo, style = Tipo.apoio, color = Tema.cores.textoSecundario, modifier = Modifier.padding(top = Espaco.e2)) }
        // Anúncio entra no fluxo só a partir da 3ª posição e nunca antes de haver ofertas.
        val fluxo: List<Any> = buildList {
            if (e.excepcionais.isNotEmpty()) { add(Secao(secaoExc, secaoExcTexto)); addAll(e.excepcionais) }
            if (e.boas.isNotEmpty()) { add(Secao(secaoBoas, secaoBoasTexto)); addAll(e.boas) }
            val primeiraOferta = indexOfFirst { it is OfertaUi }
            if (e.anuncio != null && primeiraOferta >= 0) {
                val ofertasAntes = (e.excepcionais + e.boas).size
                if (ofertasAntes > POSICAO_MINIMA_ANUNCIO) {
                    var contadas = 0
                    val pos = indexOfFirst { if (it is OfertaUi) contadas++; contadas > POSICAO_MINIMA_ANUNCIO }
                    add(pos, e.anuncio)
                }
            }
        }
        items(fluxo) { item ->
            when (item) {
                is Secao -> CabecalhoSecao(item.titulo, item.texto)
                is OfertaUi -> CartaoOferta(item, aoTocar = { aoAbrir(item) })
                is AnuncioUi -> CartaoAnuncio(item, aoTocar = { aoAbrirAnuncio(item) })
            }
        }
        remedios(e.remedios, aoAbrir)
    }
}

private data class Secao(val titulo: String, val texto: String)

private fun LazyListScope.remedios(lista: List<OfertaUi>, aoAbrir: (OfertaUi) -> Unit) {
    if (lista.isEmpty()) return
    item {
        CabecalhoSecao(stringResource(R.string.remedio_secao), stringResource(R.string.remedio_secao_texto))
    }
    items(lista, key = { it.id }) { ItemRemedio(it, aoTocar = { aoAbrir(it) }) }
    item {
        Text(stringResource(R.string.remedio_advertencia), style = Tipo.apoio, color = Tema.cores.textoSecundario)
    }
}

/** Ausência de oferta é funcionalidade (princípio 5): prova de curadoria com os números do dia. */
@Composable
private fun NadaHoje(e: EstadoOfertas.NadaHoje, aoAbrir: (OfertaUi) -> Unit) {
    val secaoBoas = stringResource(R.string.secao_boas)
    val secaoBoasTexto = stringResource(R.string.secao_boas_texto)
    LazyColumn(contentPadding = espacamentoLista, verticalArrangement = Arrangement.spacedBy(Espaco.e4)) {
        item {
            EstadoTela(
                Icons.Rounded.Verified,
                stringResource(R.string.vazio_hoje_titulo),
                stringResource(R.string.vazio_hoje_texto, Formato.milhar(e.resumo.precosConferidos)),
            )
        }
        if (e.boas.isNotEmpty()) {
            item { CabecalhoSecao(secaoBoas, secaoBoasTexto) }
            items(e.boas, key = { it.id }) { CartaoOferta(it, aoTocar = { aoAbrir(it) }) }
        }
        remedios(e.remedios, aoAbrir)
    }
}
