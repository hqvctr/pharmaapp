package app.promocao

import android.Manifest
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.LocalOffer
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.promocao.formato.Cep
import app.promocao.modelo.Categoria
import app.promocao.modelo.EstadoAvisos
import app.promocao.modelo.EstadoDetalhe
import app.promocao.modelo.EstadoOfertas
import app.promocao.modelo.Exemplos
import app.promocao.modelo.OfertaUi
import app.promocao.modelo.PreferenciasUi
import app.promocao.notificacao.Notificador
import app.promocao.ui.telas.AjustesTela
import app.promocao.ui.telas.AvisosTela
import app.promocao.ui.telas.BoasVindasTela
import app.promocao.ui.telas.CategoriasTela
import app.promocao.ui.telas.CepTela
import app.promocao.ui.telas.ComoConferimos
import app.promocao.ui.telas.DetalheTela
import app.promocao.ui.telas.OfertasTela
import app.promocao.ui.telas.PermissaoTela
import app.promocao.ui.telas.PremiumFolha
import app.promocao.ui.theme.Movimento
import app.promocao.ui.theme.Tema
import app.promocao.ui.theme.Tipo

/** Rotas. A barra inferior aparece só nos três destinos principais (PROPOSTA 3). */
object Rota {
    const val BOAS_VINDAS = "boas_vindas"
    const val CATEGORIAS = "categorias"
    const val CEP = "cep"
    const val PERMISSAO = "permissao"
    const val OFERTAS = "ofertas"
    const val AVISOS = "avisos"
    const val AJUSTES = "ajustes"
    const val DETALHE = "detalhe/{id}"
    fun detalhe(id: String) = "detalhe/$id"
}

/** Pedido vindo de fora (notificação): abrir uma oferta ou os ajustes de uma categoria. */
data class Entrada(val ofertaId: String? = null, val ajustesCategoria: String? = null, val chave: Long = System.nanoTime())

/**
 * Raiz do app. Os dados hoje são de exemplo (modelo/Exemplos.kt); a fase 3 troca por repositório da
 * API sem mexer nas telas, que só recebem estado e devolvem eventos.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun App(entrada: Entrada?, primeiroUsoFeito: Boolean) {
    val nav = rememberNavController()
    val context = LocalContext.current
    var prefs by remember { mutableStateOf(Exemplos.preferencias) }
    var cepDigitado by rememberSaveable { mutableStateOf("") }
    var cepTentou by rememberSaveable { mutableStateOf(false) }
    var permissaoNegada by rememberSaveable { mutableStateOf(false) }
    var avisosLigados by remember { mutableStateOf(Notificador.podeNotificar(context)) }
    var mostrarComo by remember { mutableStateOf(false) }
    var mostrarPremium by remember { mutableStateOf(false) }
    var categoriaDestacada by remember { mutableStateOf<Categoria?>(null) }

    LifecycleResumeEffect(Unit) {
        avisosLigados = Notificador.podeNotificar(context)
        onPauseOrDispose { }
    }

    val pedirPermissao = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        avisosLigados = ok && Notificador.podeNotificar(context)
        permissaoNegada = !ok
        if (ok || nav.currentDestination?.route == Rota.PERMISSAO) irParaOfertas(nav)
    }
    fun ligarAvisos() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !permissaoNegada) {
            pedirPermissao.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            abrirConfiguracaoDeAvisos(context)
        }
    }

    LaunchedEffect(entrada?.chave) {
        entrada?.ofertaId?.let { nav.navigate(Rota.detalhe(it)) }
        entrada?.ajustesCategoria?.let { chave ->
            categoriaDestacada = Categoria.entries.firstOrNull { it.chave == chave }
            nav.navigate(Rota.AJUSTES) { launchSingleTop = true }
        }
    }

    val rotaAtual = nav.currentBackStackEntryAsState().value?.destination?.route
    val principal = rotaAtual in setOf(Rota.OFERTAS, Rota.AVISOS, Rota.AJUSTES)
    val estadoOfertas: EstadoOfertas = when {
        prefs.categorias.isEmpty() -> EstadoOfertas.SemCategoria
        prefs.ceps.isEmpty() -> EstadoOfertas.SemCep
        else -> Exemplos.ofertas
    }

    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f)) {
            NavHost(
                navController = nav,
                startDestination = if (primeiroUsoFeito) Rota.OFERTAS else Rota.BOAS_VINDAS,
                enterTransition = { fadeIn(tween(Movimento.curtaMs)) },
                exitTransition = { fadeOut(tween(Movimento.curtaMs)) },
            ) {
                composable(Rota.BOAS_VINDAS) {
                    BoasVindasTela(aoComecar = { nav.navigate(Rota.CATEGORIAS) }, aoComo = { mostrarComo = true })
                }
                composable(Rota.CATEGORIAS) {
                    CategoriasTela(
                        selecionadas = prefs.categorias,
                        aoAlternar = { prefs = prefs.alternar(it) },
                        aoContinuar = { nav.navigate(Rota.CEP) },
                    )
                }
                composable(Rota.CEP) {
                    CepTela(
                        texto = cepDigitado,
                        aoMudar = { cepDigitado = it },
                        tentou = cepTentou,
                        aoContinuar = { r ->
                            cepTentou = true
                            when (r) {
                                is Cep.Resultado.Valido -> { prefs = prefs.copy(ceps = listOf(r.digitos)); nav.navigate(Rota.PERMISSAO) }
                                // Fora da região: guarda o CEP e segue; o feed mostra "Ainda não chegamos" (U22).
                                is Cep.Resultado.ForaDaRegiao -> prefs = prefs.copy(ceps = listOf(r.digitos))
                                Cep.Resultado.Incompleto -> Unit
                            }
                        },
                        aoNaoSei = { abrirLink(context, "https://buscacepinter.correios.com.br/") },
                    )
                }
                composable(Rota.PERMISSAO) {
                    PermissaoTela(
                        negou = permissaoNegada,
                        aoAceitar = {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                pedirPermissao.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                irParaOfertas(nav)
                            }
                        },
                        aoDepois = { irParaOfertas(nav) },
                    )
                }
                composable(Rota.OFERTAS) {
                    OfertasTela(
                        estado = estadoOfertas,
                        cep = prefs.ceps.firstOrNull(),
                        avisosLigados = avisosLigados,
                        aoAbrir = { nav.navigate(Rota.detalhe(it.id)) },
                        aoAbrirAnuncio = { abrirLink(context, it.link) },
                        aoLigarAvisos = ::ligarAvisos,
                        aoTentarDeNovo = {},
                        aoEscolherCategorias = { nav.navigate(Rota.AJUSTES) },
                        aoTrocarCep = { nav.navigate(Rota.CEP) },
                    )
                }
                composable(Rota.AVISOS) {
                    AvisosTela(
                        estado = if (Exemplos.avisos.isEmpty()) EstadoAvisos.Vazio else EstadoAvisos.Lista(Exemplos.avisos),
                        avisosLigados = avisosLigados,
                        aoAbrir = { nav.navigate(Rota.detalhe(it.id)) },
                        aoLigarAvisos = ::ligarAvisos,
                    )
                }
                composable(Rota.AJUSTES) {
                    AjustesTela(
                        p = prefs.copy(avisosNoSistema = avisosLigados),
                        destacar = categoriaDestacada,
                        aoAlternarCategoria = { prefs = prefs.alternar(it) },
                        aoMudarLimite = { prefs = prefs.copy(limiteDiario = it) },
                        aoTrocarCep = { nav.navigate(Rota.CEP) },
                        aoAdicionarCep = { mostrarPremium = true },
                        aoAbrirSistema = { abrirConfiguracaoDeAvisos(context) },
                        aoEntrar = {},
                        aoComo = { mostrarComo = true },
                        aoApagar = { prefs = prefs.copy(categorias = emptySet(), ceps = emptyList()) },
                    )
                }
                composable(Rota.DETALHE) { entry ->
                    val oferta = entry.arguments?.getString("id")?.let(Exemplos::porId)
                    DetalheTela(
                        estado = if (oferta != null) EstadoDetalhe.Pronto(oferta) else EstadoDetalhe.Erro(null),
                        aoVoltar = { if (!nav.popBackStack()) irParaOfertas(nav) },
                        aoAbrirLoja = { abrirLink(context, it.link) },
                        aoCompartilhar = { compartilhar(context, it) },
                        aoVerHoje = { irParaOfertas(nav) },
                        aoComo = { mostrarComo = true },
                        aoTentarDeNovo = {},
                    )
                }
            }
        }
        if (principal) BarraInferior(nav, rotaAtual)
    }

    if (mostrarComo) {
        ModalBottomSheet(onDismissRequest = { mostrarComo = false }, containerColor = Tema.cores.superficieCartao) { ComoConferimos() }
    }
    if (mostrarPremium) {
        // O preço real vem da Google Play Billing (fase 6). Sem ele, a folha não é mostrada em produção.
        ModalBottomSheet(onDismissRequest = { mostrarPremium = false }, containerColor = Tema.cores.superficieCartao) {
            PremiumFolha(precoFormatadoPelaPlay = "R$ 0,00", periodo = "mês", aoAssinar = { mostrarPremium = false })
        }
    }
}

@Composable
private fun BarraInferior(nav: NavHostController, rotaAtual: String?) {
    val cores = Tema.cores
    NavigationBar(containerColor = cores.superficieContainer) {
        listOf(
            Triple(Rota.OFERTAS, R.string.ofertas_titulo, Icons.Rounded.LocalOffer),
            Triple(Rota.AVISOS, R.string.avisos_titulo, Icons.Rounded.Notifications),
            Triple(Rota.AJUSTES, R.string.ajustes_titulo, Icons.Rounded.Tune),
        ).forEach { (rota, rotulo, icone) ->
            NavigationBarItem(
                selected = rotaAtual == rota,
                onClick = {
                    nav.navigate(rota) {
                        popUpTo(Rota.OFERTAS) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                icon = { Icon(icone, contentDescription = null) },
                label = { Text(stringResource(rotulo), style = Tipo.rotulo) },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = cores.sobrePrimariaContainer,
                    selectedTextColor = cores.texto,
                    indicatorColor = cores.primariaContainer,
                    unselectedIconColor = cores.textoSecundario,
                    unselectedTextColor = cores.textoSecundario,
                ),
            )
        }
    }
}

private fun PreferenciasUi.alternar(c: Categoria) = copy(categorias = if (c in categorias) categorias - c else categorias + c)

private fun irParaOfertas(nav: NavHostController) {
    nav.navigate(Rota.OFERTAS) { popUpTo(0) { inclusive = true } }
}

private fun abrirLink(context: Context, url: String) {
    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

private fun compartilhar(context: Context, o: OfertaUi) {
    val texto = "${o.nomeCurto} · ${app.promocao.formato.Formato.reais(o.precoEfetivoCentavos)} na ${o.loja}\n${o.link}"
    context.startActivity(
        Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, texto), null)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
}

/** Quando o sistema não deixa pedir de novo, leva à tela de notificações do app (fluxo F5). */
private fun abrirConfiguracaoDeAvisos(context: Context) {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
    } else {
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))
    }
    context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}
