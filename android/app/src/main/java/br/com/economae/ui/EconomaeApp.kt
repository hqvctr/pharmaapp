package br.com.economae.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import br.com.economae.Container
import br.com.economae.ui.conta.ContaRota
import br.com.economae.ui.conta.ContaViewModel
import br.com.economae.ui.entrada.EntradaRota
import br.com.economae.ui.entrada.EntradaViewModel
import br.com.economae.ui.feed.FeedRota
import br.com.economae.ui.feed.FeedViewModel
import br.com.economae.ui.oferta.OfertaRota
import br.com.economae.ui.oferta.OfertaViewModel
import br.com.economae.ui.preferencias.PreferenciasRota
import br.com.economae.ui.preferencias.PreferenciasViewModel
import br.com.economae.ui.termos.TermosRota
import br.com.economae.ui.termos.TermosViewModel
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

@Serializable data object RotaFeed
@Serializable data class RotaOferta(val id: String)
@Serializable data object RotaConta
@Serializable data object RotaPreferencias

/** Notificação tocada: abre a oferta e registra a abertura da entrega. */
data class AberturaNotificacao(val ofertaId: String, val entregaId: String?)

@Composable
fun EconomaeApp(container: Container, abertura: AberturaNotificacao?, onAberturaTratada: () -> Unit) {
    val raiz: RaizViewModel = viewModel { RaizViewModel(container.repositorio) { container.registrarAparelhoSeLogado() } }
    val estado by raiz.estado.collectAsStateWithLifecycle()
    val repo = container.repositorio

    when (val e = estado) {
        EstadoRaiz.Carregando -> Carregando()
        is EstadoRaiz.Erro -> TelaDeErro(e.mensagem, raiz::recarregar)
        EstadoRaiz.Entrada -> EntradaRota(viewModel(key = "entrada") { EntradaViewModel(repo) })
        EstadoRaiz.Termos -> TermosRota(
            viewModel(key = "termos") { TermosViewModel(repo, raiz::recarregar) },
            onSair = { container.escopo.launch { repo.sair() } },
        )
        EstadoRaiz.Preferencias -> PreferenciasRota(
            viewModel(key = "prefs-inicio") { PreferenciasViewModel(repo, raiz::recarregar) },
            primeiraVez = true,
        )
        EstadoRaiz.Pronto -> {
            val nav = rememberNavController()
            LaunchedEffect(abertura) {
                val a = abertura ?: return@LaunchedEffect
                nav.navigate(RotaOferta(a.ofertaId))
                a.entregaId?.let { id -> container.escopo.launch { runCatching { repo.registrarAbertura(id) } } }
                onAberturaTratada()
            }
            NavHost(nav, startDestination = RotaFeed) {
                composable<RotaFeed> {
                    FeedRota(
                        viewModel { FeedViewModel(repo) },
                        onOferta = { nav.navigate(RotaOferta(it)) },
                        onConta = { nav.navigate(RotaConta) },
                    )
                }
                composable<RotaOferta> { entrada ->
                    val id = entrada.toRoute<RotaOferta>().id
                    OfertaRota(viewModel { OfertaViewModel(repo, id) }, onVoltar = { nav.popBackStack() })
                }
                composable<RotaConta> {
                    ContaRota(
                        viewModel { ContaViewModel(repo, container.push) },
                        onVoltar = { nav.popBackStack() },
                        onPreferencias = { nav.navigate(RotaPreferencias) },
                    )
                }
                composable<RotaPreferencias> {
                    PreferenciasRota(viewModel { PreferenciasViewModel(repo) { nav.popBackStack() } }, primeiraVez = false)
                }
            }
        }
    }
}
