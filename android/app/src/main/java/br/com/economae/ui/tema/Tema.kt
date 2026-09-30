package br.com.economae.ui.tema

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Cores da marca, sem cor dinâmica do sistema: framboesa (ação), verde-água (preço e economia).
private val Claro = lightColorScheme(
    primary = Color(0xFFA83A56),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFFD9DF),
    onPrimaryContainer = Color(0xFF3F0019),
    secondary = Color(0xFF2F6B5F),
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFB5EFE0),
    onSecondaryContainer = Color(0xFF00201A),
    tertiary = Color(0xFF7A5900),
    tertiaryContainer = Color(0xFFFFDEA1),
    onTertiaryContainer = Color(0xFF261900),
    background = Color(0xFFFFF8F7),
    surface = Color(0xFFFFF8F7),
    surfaceVariant = Color(0xFFF3DDE0),
    error = Color(0xFFBA1A1A),
)

private val Escuro = darkColorScheme(
    primary = Color(0xFFFFB1C1),
    onPrimary = Color(0xFF65002D),
    primaryContainer = Color(0xFF882240),
    onPrimaryContainer = Color(0xFFFFD9DF),
    secondary = Color(0xFF99D3C4),
    onSecondary = Color(0xFF00382E),
    secondaryContainer = Color(0xFF125145),
    onSecondaryContainer = Color(0xFFB5EFE0),
    tertiary = Color(0xFFF1BF48),
    tertiaryContainer = Color(0xFF5C4300),
    onTertiaryContainer = Color(0xFFFFDEA1),
    background = Color(0xFF1A1113),
    surface = Color(0xFF1A1113),
    surfaceVariant = Color(0xFF524345),
    error = Color(0xFFFFB4AB),
)

/** Papéis semânticos da proposta de UX (prova, economia, condição, aviso), gerados de ux/design-tokens. */
val LocalCores = staticCompositionLocalOf { CoresClaras }

object Semantica {
    val cores: CoresEconomae
        @Composable @ReadOnlyComposable get() = LocalCores.current
}

@Composable
fun EconomaeTema(escuro: Boolean = isSystemInDarkTheme(), conteudo: @Composable () -> Unit) {
    CompositionLocalProvider(LocalCores provides if (escuro) CoresEscuras else CoresClaras) {
        MaterialTheme(colorScheme = if (escuro) Escuro else Claro, content = conteudo)
    }
}
