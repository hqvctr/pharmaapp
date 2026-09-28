package app.promocao

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import app.promocao.modelo.Exemplos
import app.promocao.notificacao.Notificador
import app.promocao.ui.theme.TemaApp

class MainActivity : ComponentActivity() {

    private val entrada = mutableStateOf<Entrada?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Notificador.criarCanais(this)
        entrada.value = lerEntrada(intent)
        // Demonstração das variações de notificação N1–N7:
        // adb shell am start -n app.promocao/.MainActivity --ez demo_notificacoes true
        if (intent.getBooleanExtra(EXTRA_DEMO, false)) {
            Notificador.mostrar(this, listOf(Exemplos.protetor, Exemplos.fralda, Exemplos.hidratante, Exemplos.shampoo, Exemplos.protetorCaiuMais))
        }
        val primeiroUsoFeito = intent.getBooleanExtra(EXTRA_PULAR_PRIMEIRO_USO, false) || entrada.value != null
        setContent {
            TemaApp { App(entrada = entrada.value, primeiroUsoFeito = primeiroUsoFeito) }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        lerEntrada(intent)?.let { entrada.value = it }
    }

    private fun lerEntrada(intent: Intent?): Entrada? {
        intent ?: return null
        val oferta = intent.getStringExtra(Notificador.EXTRA_OFERTA)
        val ajustes = if (intent.getStringExtra(Notificador.EXTRA_DESTINO) == Notificador.DESTINO_AJUSTES) {
            intent.getStringExtra(Notificador.EXTRA_CATEGORIA) ?: ""
        } else if (intent.action == Intent.ACTION_APPLICATION_PREFERENCES) "" else null
        return if (oferta == null && ajustes == null) null else Entrada(ofertaId = oferta, ajustesCategoria = ajustes)
    }

    companion object {
        const val EXTRA_DEMO = "demo_notificacoes"
        const val EXTRA_PULAR_PRIMEIRO_USO = "pular_primeiro_uso"
    }
}
