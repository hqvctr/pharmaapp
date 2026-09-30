package br.com.economae.e2e

import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import br.com.economae.Container
import br.com.economae.EconomaeApplication
import br.com.economae.MainActivity
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Assume.assumeTrue
import org.junit.BeforeClass
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** App com o endereço do backend local que o script de pronto sobe. */
class AppDeTeste : EconomaeApplication() {
    override fun criarContainer(): Container = Container(this, System.getProperty(PROP_URL) ?: "http://127.0.0.1:1/")
}

private const val PROP_URL = "economae.e2e.apiUrl"
private const val PROP_LOG = "economae.e2e.apiLog"

/**
 * A jornada da mãe no app de verdade (Activity, ViewModels, OkHttp, DataStore), na JVM com
 * Robolectric, contra o backend local alimentado pelo pipeline. Tira uma foto de cada tela.
 * Roda por scripts/pronto-fase4.sh; sem backend, é pulado.
 */
@RunWith(AndroidJUnit4::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [36], application = AppDeTeste::class, qualifiers = "w411dp-h891dp-xxhdpi")
class JornadaDaMaeTest {
    companion object {
        @BeforeClass
        @JvmStatic
        fun exigeBackend() = assumeTrue("backend local não informado", System.getProperty(PROP_URL) != null && System.getProperty(PROP_LOG) != null)
    }

    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun esperar(texto: String, substring: Boolean = false) =
        compose.waitUntil(20_000) { compose.onAllNodesWithText(texto, substring = substring).fetchSemanticsNodes().isNotEmpty() }

    private fun foto(nome: String) = compose.onRoot().captureRoboImage("build/outputs/roborazzi/$nome.png")

    /** Em desenvolvimento a API escreve o código no log (EMAIL_MODO=log). */
    private fun codigoDoLog(email: String): String {
        val linha = File(System.getProperty(PROP_LOG)!!).readLines().last { "para=$email " in it }
        return Regex("codigo=(\\d{6})").find(linha)!!.groupValues[1]
    }

    @Test
    fun `entrar, aceitar os termos, escolher preferencias e abrir uma promocao`() {
        val email = "jornada-${System.currentTimeMillis()}@exemplo.com"

        esperar("Receber código por e-mail")
        foto("01-entrada")
        compose.onAllNodes(hasSetTextAction())[0].performTextInput(email)
        compose.onNodeWithText("Receber código por e-mail").performClick()

        esperar("Enviamos um código", substring = true)
        compose.onAllNodes(hasSetTextAction())[0].performTextInput(codigoDoLog(email))
        foto("02-codigo")
        compose.onNodeWithText("Entrar").performClick()

        esperar("Antes de começar")
        compose.onNodeWithText("Tenho 18 anos ou mais e aceito os termos de uso.").performClick()
        foto("03-termos")
        compose.onNodeWithText("Continuar").performClick()

        esperar("O que você quer receber?")
        compose.onNodeWithText("Higiene e cuidados do bebê").performClick()
        compose.onNodeWithText("Fraldas e lenços").performClick()
        compose.onAllNodes(hasSetTextAction())[0].performTextInput("14010000")
        foto("04-preferencias")
        compose.onNodeWithText("Ver promoções").performScrollTo().performClick()

        // O pipeline deixou dois alertas do protetor infantil: loja aprovada e loja em observação.
        esperar("Protetor Solar Infantil FPS 50 Marca X 50ml")
        esperar("Ative os alertas", substring = true)
        foto("05-feed")
        compose.onAllNodesWithText("Protetor Solar Infantil FPS 50 Marca X 50ml")[0].performClick()

        esperar("Ver na ", substring = true)
        esperar("Link de afiliado", substring = true)
        foto("06-oferta")
        compose.onNodeWithText("Voltar").performClick()

        esperar("Conta")
        compose.onNodeWithText("Conta").performClick()
        esperar("Alertas de promoção")
        foto("07-conta")
    }
}
