package br.com.economae

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val Cores = lightColorScheme(
    primary = Color(0xFF1B7F5C),
    onPrimary = Color.White,
    secondaryContainer = Color(0xFFD7F0E6),
    tertiary = Color(0xFFB3261E),
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = Cores) {
                Surface(Modifier.fillMaxSize()) { Raiz() }
            }
        }
    }
}

@Composable
fun Raiz() {
    val contexto = LocalContext.current
    val m = remember { Modelo(contexto.applicationContext) }
    BackHandler(enabled = m.pilha.size > 1 || (m.tela as? Tela.Principal)?.aba?.let { it != 0 } == true) {
        if (!m.voltar()) m.raiz(Tela.Principal(0))
    }
    when (val t = m.tela) {
        is Tela.Entrar -> TelaEntrar(m)
        is Tela.Termos -> TelaTermos(m)
        is Tela.Preferencias -> TelaPreferencias(m) { if (m.pilha.size > 1) m.voltar() else m.raiz(Tela.Principal()) }
        is Tela.Principal -> TelaPrincipal(m, t.aba)
        is Tela.Alerta -> TelaAlerta(m, t.id, t.origem)
        is Tela.Produto -> TelaProduto(m, t.id)
    }
}
