package br.com.economae

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        // De ponta a ponta: o fundo do tema vai até atrás das barras do sistema (claras ou escuras conforme o modo).
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            TemaEconomae {
                Surface(Modifier.fillMaxSize()) { Box(Modifier.safeDrawingPadding()) { Raiz() } }
            }
        }
    }
}

@Composable
fun Raiz() {
    val contexto = LocalContext.current
    val m = remember { Modelo(contexto.applicationContext) }
    BackHandler(enabled = m.pilha.size > 1 || (m.tela as? Tela.Principal)?.aba?.let { it != Abas.INICIO } == true) {
        if (!m.voltar()) m.raiz(Tela.Principal(Abas.INICIO))
    }
    when (val t = m.tela) {
        is Tela.Entrar -> TelaEntrar(m)
        is Tela.Termos -> TelaTermos(m)
        is Tela.Preferencias -> TelaPreferencias(m) { if (m.pilha.size > 1) m.voltar() else m.raiz(Tela.Principal()) }
        is Tela.Principal -> TelaPrincipal(m, t.aba)
        is Tela.Alerta -> TelaAlerta(m, t.id, t.origem)
        is Tela.Produto -> TelaProduto(m, t.id)
        is Tela.Categoria -> TelaCategoria(m, t.slug, t.sub)
        is Tela.Busca -> TelaBusca(m, t.categoria)
        is Tela.Feed -> TelaFeed(m)
        is Tela.Lista -> TelaLista(m, t.titulo, t.v)
    }
}
