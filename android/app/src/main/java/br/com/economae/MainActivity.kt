package br.com.economae

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import br.com.economae.push.CanalOfertas
import br.com.economae.ui.AberturaNotificacao
import br.com.economae.ui.EconomaeApp
import br.com.economae.ui.tema.EconomaeTema

class MainActivity : ComponentActivity() {
    private var abertura by mutableStateOf<AberturaNotificacao?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        if (savedInstanceState == null) abertura = aberturaDe(intent)
        val container = (application as EconomaeApplication).container
        setContent {
            EconomaeTema {
                Surface(Modifier.fillMaxSize().safeDrawingPadding()) {
                    EconomaeApp(container, abertura, onAberturaTratada = { abertura = null })
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        aberturaDe(intent)?.let { abertura = it }
    }

    private fun aberturaDe(intent: Intent?): AberturaNotificacao? {
        val oferta = intent?.getStringExtra(CanalOfertas.EXTRA_OFERTA) ?: return null
        return AberturaNotificacao(oferta, intent.getStringExtra(CanalOfertas.EXTRA_ENTREGA))
    }
}
