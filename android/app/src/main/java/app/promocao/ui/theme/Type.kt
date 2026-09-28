package app.promocao.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit

/** Um estilo de texto dos tokens: tamanho e altura de linha em sp (escalam com a fonte do sistema). */
data class EstiloToken(val tamanho: TextUnit, val altura: TextUnit, val peso: FontWeight, val tabular: Boolean)

private fun EstiloToken.estilo(): TextStyle = TextStyle(
    fontFamily = FontFamily.Default, // fonte do sistema (Roboto): sem download (S-23)
    fontSize = tamanho,
    lineHeight = altura,
    fontWeight = peso,
    // Algarismos tabulares: preços alinham e não "dançam" quando mudam.
    fontFeatureSettings = if (tabular) "tnum" else null,
)

/** Estilos do app. Use estes, não tamanhos soltos. */
object Tipo {
    val precoDestaque = TipoTokens.precoDestaque.estilo()
    val precoCartao = TipoTokens.precoCartao.estilo()
    val economia = TipoTokens.economia.estilo()
    val precoNormal = TipoTokens.precoNormal.estilo()
    val tituloTela = TipoTokens.tituloTela.estilo()
    val tituloSecao = TipoTokens.tituloSecao.estilo()
    val nomeProduto = TipoTokens.nomeProduto.estilo()
    val corpo = TipoTokens.corpo.estilo()
    val apoio = TipoTokens.apoio.estilo()
    val rotulo = TipoTokens.rotulo.estilo()
    val rotuloPequeno = TipoTokens.rotuloPequeno.estilo()
}

/** Tipografia do Material 3 mapeada para os tokens, para os componentes M3 herdarem. */
val TipografiaM3 = Typography(
    headlineSmall = Tipo.tituloTela,
    titleLarge = Tipo.tituloTela,
    titleMedium = Tipo.tituloSecao,
    titleSmall = Tipo.nomeProduto,
    bodyLarge = Tipo.corpo,
    bodyMedium = Tipo.apoio,
    bodySmall = Tipo.apoio,
    labelLarge = Tipo.rotulo,
    labelMedium = Tipo.rotulo,
    labelSmall = Tipo.rotuloPequeno,
)
