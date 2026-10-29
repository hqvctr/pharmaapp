package br.com.economae

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Face
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

// Identidade visual a partir do KV (docs/design/identidade-visual.md). Toda cor, fonte e forma do app sai daqui.
// Hex "do KV" são os do arquivo; os "ajustados" são variantes mais escuras/claras para o texto passar no WCAG AA.

/** Cores literais do KV, para quem precisar da marca fora do tema (as artes vetoriais já as trazem dentro). */
object Marca {
    val Rosa = Color(0xFFF65B91)
    val Lilas = Color(0xFF9575CD)
    val VerdeAgua = Color(0xFF58C9BE)
    val Creme = Color(0xFFFFF9F7)
    val Texto = Color(0xFF302849)
}

val CoresClaras: ColorScheme = lightColorScheme(
    primary = Color(0xFFCC2E6B), // rosa do KV (#F65B91) escurecido: branco sobre ele dá 5,0:1 (o original dá 3,1:1)
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFCE0EA), // KV
    onPrimaryContainer = Color(0xFF8D3E70), // KV
    inversePrimary = Color(0xFFF65B91),
    secondary = Color(0xFF5D438F), // lilás escuro do KV (logotipo)
    onSecondary = Color(0xFFFFFFFF),
    secondaryContainer = Color(0xFFE9DFF8), // KV
    onSecondaryContainer = Color(0xFF5D438F),
    tertiary = Color(0xFF247F73), // verde dos preços do KV (#278B7E) um pouco mais escuro
    onTertiary = Color(0xFFFFFFFF),
    tertiaryContainer = Color(0xFFDDF6F1), // KV
    onTertiaryContainer = Color(0xFF1F6B65), // KV usa #287F78, que dá 4,2:1 sobre o fundo verde-água
    background = Color(0xFFFFF9F7), // creme do KV
    onBackground = Color(0xFF302849), // texto do KV
    surface = Color(0xFFFFF9F7),
    onSurface = Color(0xFF302849),
    surfaceVariant = Color(0xFFF5EEF3),
    onSurfaceVariant = Color(0xFF6C627D), // KV (o cinza #81798F do KV dá 4,0:1 no creme)
    surfaceTint = Color(0xFFCC2E6B),
    inverseSurface = Color(0xFF302849),
    inverseOnSurface = Color(0xFFFFF9F7),
    error = Color(0xFFB3261E),
    onError = Color(0xFFFFFFFF),
    errorContainer = Color(0xFFFCE8E6),
    onErrorContainer = Color(0xFF8C1D18),
    outline = Color(0xFF8C829D), // KV (borda de campo e botão: 3,5:1)
    outlineVariant = Color(0xFFEDE7F1), // KV (borda de cartão, só decorativa)
    scrim = Color(0xFF000000),
    surfaceBright = Color(0xFFFFF9F7),
    surfaceDim = Color(0xFFEFE6EA),
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFFFFFF), // cartões brancos sobre o creme, como no KV
    surfaceContainer = Color(0xFFFCF2F5),
    surfaceContainerHigh = Color(0xFFF9ECF0),
    surfaceContainerHighest = Color(0xFFF5E4EB),
)

val CoresEscuras: ColorScheme = darkColorScheme(
    primary = Color(0xFFF65B91), // rosa do KV sem ajuste (5,7:1 sobre o fundo escuro)
    onPrimary = Color(0xFF3B0A20),
    primaryContainer = Color(0xFF5A1E40), // escuro o bastante para o logotipo lilás sobre a onda da entrada (5,2:1)
    onPrimaryContainer = Color(0xFFFFD9E4),
    inversePrimary = Color(0xFFCC2E6B),
    secondary = Color(0xFFB39DDB),
    onSecondary = Color(0xFF2A1A4F),
    secondaryContainer = Color(0xFF4A3778),
    onSecondaryContainer = Color(0xFFE9DFF8),
    tertiary = Color(0xFF58C9BE), // verde-água do KV sem ajuste
    onTertiary = Color(0xFF003732),
    tertiaryContainer = Color(0xFF1F5A54),
    onTertiaryContainer = Color(0xFFDDF6F1),
    background = Color(0xFF1C1726), // o texto do KV (#302849) escurecido
    onBackground = Color(0xFFF3EEF7),
    surface = Color(0xFF1C1726),
    onSurface = Color(0xFFF3EEF7),
    surfaceVariant = Color(0xFF3A3247),
    onSurfaceVariant = Color(0xFFCFC6DA),
    surfaceTint = Color(0xFFF65B91),
    inverseSurface = Color(0xFFF3EEF7),
    inverseOnSurface = Color(0xFF302849),
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
    outline = Color(0xFF958CA2),
    outlineVariant = Color(0xFF3E3550),
    scrim = Color(0xFF000000),
    surfaceBright = Color(0xFF3A3247),
    surfaceDim = Color(0xFF1C1726),
    surfaceContainerLowest = Color(0xFF17121F),
    surfaceContainerLow = Color(0xFF262033),
    surfaceContainer = Color(0xFF2A2338),
    surfaceContainerHigh = Color(0xFF30293F),
    surfaceContainerHighest = Color(0xFF352D44),
)

/**
 * Fonte do KV: Inter (SIL Open Font License 1.1), embutida em res/font por scripts/fonte-inter.py.
 * Para trocar de fonte, troque só esta linha (por exemplo, FontFamily.SansSerif usa a do sistema).
 */
val FonteDoApp: FontFamily = FontFamily(
    Font(R.font.inter_regular, FontWeight.Normal),
    Font(R.font.inter_medium, FontWeight.Medium),
    Font(R.font.inter_semibold, FontWeight.SemiBold),
    Font(R.font.inter_bold, FontWeight.Bold),
)

private fun estilo(tamanho: Int, linha: Int, peso: FontWeight, espaco: Double = 0.0) =
    TextStyle(fontFamily = FonteDoApp, fontWeight = peso, fontSize = tamanho.sp, lineHeight = linha.sp, letterSpacing = espaco.sp)

/** Tamanhos e pesos das telas do KV (títulos 17–21 em negrito, corpo 12–16 normal, selos pequenos em negrito). */
val Tipografia = Typography(
    displaySmall = estilo(36, 44, FontWeight.Bold, -0.5), // o nome "economae" na entrada
    headlineLarge = estilo(32, 40, FontWeight.Bold),
    headlineMedium = estilo(28, 36, FontWeight.Bold), // preço no detalhe
    headlineSmall = estilo(24, 32, FontWeight.Bold), // preço no cartão
    titleLarge = estilo(21, 28, FontWeight.Bold), // título de tela
    titleMedium = estilo(17, 24, FontWeight.Bold), // título de seção ("Ofertas em destaque")
    titleSmall = estilo(14, 20, FontWeight.SemiBold),
    bodyLarge = estilo(16, 24, FontWeight.Normal),
    bodyMedium = estilo(14, 20, FontWeight.Normal),
    bodySmall = estilo(12, 16, FontWeight.Normal),
    labelLarge = estilo(15, 20, FontWeight.Bold), // botões
    labelMedium = estilo(12, 16, FontWeight.SemiBold),
    labelSmall = estilo(11, 16, FontWeight.Bold, 0.3), // selos
)

/** Cantos do KV: selo 7–9, busca e chips 14, cartão 15, botão grande e faixa 18–20, moldura 30. */
val Formas = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

/** Tema do app: segue o modo claro/escuro do sistema. */
@Composable
fun TemaEconomae(escuro: Boolean = isSystemInDarkTheme(), conteudo: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (escuro) CoresEscuras else CoresClaras, typography = Tipografia, shapes = Formas, content = conteudo)
}

/** Contraste WCAG 2.x entre duas cores opacas (1 a 21). AA pede 4,5 para texto normal e 3 para texto grande e bordas. */
fun contraste(a: Color, b: Color): Double {
    fun canal(c: Float): Double = if (c <= 0.03928f) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
    fun luminancia(c: Color) = 0.2126 * canal(c.red) + 0.7152 * canal(c.green) + 0.0722 * canal(c.blue)
    val la = luminancia(a)
    val lb = luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
}

/** Fundo e texto de um cartão de categoria. */
class CoresDaCategoria(val fundo: Color, val texto: Color)

/** O pastel de "Infantil" no KV (círculo amarelo-pêssego); as outras três categorias usam os contêineres do tema. */
object CategoriaInfantil {
    val FundoClaro = Color(0xFFFFEFD0)
    val TextoClaro = Color(0xFF7A4F00)
    val FundoEscuro = Color(0xFF5C4300)
    val TextoEscuro = Color(0xFFFFE9B8)
}

/** Cor de cada categoria do app, como nos círculos do KV: Gestação rosa, Mamãe lilás, Bebê verde-água, Infantil amarelo. */
@Composable
fun coresDaCategoria(slug: String): CoresDaCategoria {
    val c = MaterialTheme.colorScheme
    val escuro = c.background.red < 0.5f
    return when (slug) {
        "gestacao" -> CoresDaCategoria(c.primaryContainer, c.onPrimaryContainer)
        "mamae" -> CoresDaCategoria(c.secondaryContainer, c.onSecondaryContainer)
        "bebe" -> CoresDaCategoria(c.tertiaryContainer, c.onTertiaryContainer)
        "infantil" -> if (escuro) CoresDaCategoria(CategoriaInfantil.FundoEscuro, CategoriaInfantil.TextoEscuro) else CoresDaCategoria(CategoriaInfantil.FundoClaro, CategoriaInfantil.TextoClaro)
        else -> CoresDaCategoria(c.surfaceVariant, c.onSurfaceVariant)
    }
}

/** Ícone de cada categoria (o KV usa ♀, ♡, ☺ e ★); categoria nova sem ícone próprio usa a estrela. */
fun iconeDaCategoria(slug: String): ImageVector = when (slug) {
    "gestacao" -> Icons.Rounded.Person
    "mamae" -> Icons.Rounded.Favorite
    "bebe" -> Icons.Rounded.Face
    else -> Icons.Rounded.Star
}

/** Frase do topo da página de cada categoria (a do KV para Bebê; as outras seguem o mesmo tom). */
fun chamadaDaCategoria(slug: String, rotulo: String): String = when (slug) {
    "gestacao" -> "Tudo para a sua gestação"
    "mamae" -> "Cuidado para você, mamãe"
    "bebe" -> "Tudo para o seu bebê"
    "infantil" -> "Para os pequenos crescerem"
    else -> "Tudo em $rotulo"
}
