package br.com.economae

import android.content.Intent
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
import androidx.compose.runtime.LaunchedEffect
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
        lerNotificacao(intent)
        setContent {
            TemaEconomae {
                Surface(Modifier.fillMaxSize()) { Box(Modifier.safeDrawingPadding()) { Raiz() } }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        lerNotificacao(intent)
    }

    /** Tocou numa notificação de aviso: guarda o que abrir (a Raiz abre quando a pessoa estiver dentro do app). */
    private fun lerNotificacao(intent: Intent?) {
        val aviso = intent?.let { i -> avisoDosDados { i.getStringExtra(it) } } ?: return
        AberturaPush.pendente = aviso
        intent.removeExtra("aviso_id")
    }
}

@Composable
fun Raiz() {
    val contexto = LocalContext.current
    val m = remember { Modelo(contexto.applicationContext) }
    // Notificação tocada: abre o alerta (ou o produto) quando a pessoa já passou do login, dos termos e das preferências.
    val pendente = AberturaPush.pendente
    val dentro = m.usuario != null && m.tela !is Tela.Entrar && m.tela !is Tela.Termos && m.tela !is Tela.Preferencias
    LaunchedEffect(pendente, dentro) {
        if (pendente != null && dentro) {
            AberturaPush.pendente = null
            m.ir(if (pendente.alertaId != null) Tela.Alerta(pendente.alertaId, "push") else Tela.Produto(pendente.produtoId))
            m.marcarAvisoLido(pendente.avisoId)
        }
    }
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
