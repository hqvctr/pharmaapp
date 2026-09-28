package app.promocao.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LocalCores = staticCompositionLocalOf { CoresClaras }

/** Acesso aos papéis de cor do app: `Tema.cores.prova`. */
object Tema {
    val cores: CoresEconomae
        @Composable @ReadOnlyComposable get() = LocalCores.current
}

private fun CoresEconomae.paraM3(escuro: Boolean) = if (escuro) {
    darkColorScheme(
        primary = primaria, onPrimary = sobrePrimaria,
        primaryContainer = primariaContainer, onPrimaryContainer = sobrePrimariaContainer,
        secondaryContainer = primariaContainer, onSecondaryContainer = sobrePrimariaContainer,
        background = superficie, onBackground = texto,
        surface = superficie, onSurface = texto, onSurfaceVariant = textoSecundario,
        surfaceContainerLowest = superficieCartao, surfaceContainerLow = superficieCartao,
        surfaceContainer = superficieContainer, surfaceContainerHigh = superficieContainerAlta,
        surfaceContainerHighest = superficieContainerAlta,
        outline = contorno, outlineVariant = contornoSuave,
        error = erro, errorContainer = erroContainer, onErrorContainer = sobreErroContainer,
        scrim = scrim,
    )
} else {
    lightColorScheme(
        primary = primaria, onPrimary = sobrePrimaria,
        primaryContainer = primariaContainer, onPrimaryContainer = sobrePrimariaContainer,
        secondaryContainer = primariaContainer, onSecondaryContainer = sobrePrimariaContainer,
        background = superficie, onBackground = texto,
        surface = superficie, onSurface = texto, onSurfaceVariant = textoSecundario,
        surfaceContainerLowest = superficieCartao, surfaceContainerLow = superficieCartao,
        surfaceContainer = superficieContainer, surfaceContainerHigh = superficieContainerAlta,
        surfaceContainerHighest = superficieContainerAlta,
        outline = contorno, outlineVariant = contornoSuave,
        error = erro, errorContainer = erroContainer, onErrorContainer = sobreErroContainer,
        scrim = scrim,
    )
}

/** Tema do app. Cores e tipografia vêm só dos tokens gerados (ux/design-tokens). */
@Composable
fun TemaApp(escuro: Boolean = isSystemInDarkTheme(), conteudo: @Composable () -> Unit) {
    val cores = if (escuro) CoresEscuras else CoresClaras
    CompositionLocalProvider(LocalCores provides cores) {
        MaterialTheme(colorScheme = cores.paraM3(escuro), typography = TipografiaM3, content = conteudo)
    }
}
