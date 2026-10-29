package br.com.economae

import androidx.compose.material3.ColorScheme
import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TemaTest {
    @Test fun `contraste segue a formula do WCAG`() {
        assertEquals(21.0, contraste(Color.Black, Color.White), 0.01)
        assertEquals(1.0, contraste(Marca.Rosa, Marca.Rosa), 0.001)
        assertEquals(contraste(Color.White, Marca.Rosa), contraste(Marca.Rosa, Color.White), 0.0)
        // O rosa do KV com texto branco não passa no AA; é por isso que o tema claro usa uma variante mais escura.
        assertEquals(3.08, contraste(Marca.Rosa, Color.White), 0.01)
        assertEquals(13.21, contraste(Marca.Texto, Marca.Creme), 0.01)
    }

    /** Texto (primeiro) sobre fundo (segundo): toda combinação que o app usa precisa de 4,5:1. */
    private fun textos(c: ColorScheme) = mapOf(
        "onPrimary/primary" to (c.onPrimary to c.primary),
        "onPrimaryContainer/primaryContainer" to (c.onPrimaryContainer to c.primaryContainer),
        "onSecondary/secondary" to (c.onSecondary to c.secondary),
        "onSecondaryContainer/secondaryContainer" to (c.onSecondaryContainer to c.secondaryContainer),
        "onTertiary/tertiary" to (c.onTertiary to c.tertiary),
        "onTertiaryContainer/tertiaryContainer" to (c.onTertiaryContainer to c.tertiaryContainer),
        "onBackground/background" to (c.onBackground to c.background),
        "onSurface/surface" to (c.onSurface to c.surface),
        "onSurfaceVariant/surface" to (c.onSurfaceVariant to c.surface),
        "onSurfaceVariant/surfaceVariant" to (c.onSurfaceVariant to c.surfaceVariant),
        "onSurface/surfaceContainerLow (cartão)" to (c.onSurface to c.surfaceContainerLow),
        "onSurfaceVariant/surfaceContainerLow" to (c.onSurfaceVariant to c.surfaceContainerLow),
        "onSurface/surfaceContainerHigh (diálogo)" to (c.onSurface to c.surfaceContainerHigh),
        "onSurfaceVariant/surfaceContainerHighest" to (c.onSurfaceVariant to c.surfaceContainerHighest),
        "onError/error" to (c.onError to c.error),
        "onErrorContainer/errorContainer" to (c.onErrorContainer to c.errorContainer),
        "inverseOnSurface/inverseSurface" to (c.inverseOnSurface to c.inverseSurface),
        "primary/surface (link, aviso)" to (c.primary to c.surface),
        "primary/surfaceContainerLow" to (c.primary to c.surfaceContainerLow),
        "secondary/surface (logotipo)" to (c.secondary to c.surface),
        "secondary/primaryContainer (logotipo sobre a onda da entrada)" to (c.secondary to c.primaryContainer),
        "tertiary/surface (preço)" to (c.tertiary to c.surface),
        "tertiary/surfaceContainerLow (preço no cartão)" to (c.tertiary to c.surfaceContainerLow),
        "error/surface" to (c.error to c.surface),
        "error/surfaceContainerLow" to (c.error to c.surfaceContainerLow),
    )

    private fun conferir(nome: String, c: ColorScheme) {
        val falhas = textos(c).mapNotNull { (par, cores) ->
            val r = contraste(cores.first, cores.second)
            if (r < 4.5) "$par = ${"%.2f".format(r)}" else null
        }
        assertTrue("$nome: combinações abaixo de 4,5:1: $falhas", falhas.isEmpty())
        // Borda de campo e de botão contornado: 3:1 (WCAG 1.4.11).
        for (fundo in listOf(c.surface, c.surfaceContainerLow)) assertTrue("$nome: outline", contraste(c.outline, fundo) >= 3.0)
    }

    @Test fun `tema claro passa no WCAG AA`() = conferir("claro", CoresClaras)

    @Test fun `tema escuro passa no WCAG AA`() = conferir("escuro", CoresEscuras)

    @Test fun `cores principais vem do KV`() {
        assertEquals(Color(0xFFFFF9F7), CoresClaras.background)
        assertEquals(Color(0xFF302849), CoresClaras.onBackground)
        assertEquals(Color(0xFFFCE0EA), CoresClaras.primaryContainer)
        assertEquals(Marca.Rosa, CoresEscuras.primary)
        assertEquals(Marca.VerdeAgua, CoresEscuras.tertiary)
    }

    @Test fun `selo de demonstracao tem cor propria`() {
        assertEquals(TipoSelo.Demonstracao, tipoDoRotulo("DEMONSTRAÇÃO"))
        assertEquals(TipoSelo.Demonstracao, tipoDoRotulo(" demonstração "))
        assertEquals(TipoSelo.Condicao, tipoDoRotulo("Leve 3, pague 2"))
    }

    @Test fun `pastel de infantil passa no AA em claro e escuro`() {
        assertTrue(contraste(CategoriaInfantil.TextoClaro, CategoriaInfantil.FundoClaro) >= 4.5)
        assertTrue(contraste(CategoriaInfantil.TextoEscuro, CategoriaInfantil.FundoEscuro) >= 4.5)
    }
}
