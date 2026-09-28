// GERADO por ux/design-tokens/gerar.mjs a partir de ux/design-tokens/tokens.json. Não editar à mão.
package app.promocao.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Papéis de cor semânticos do app. Um valor por tema. */
@Immutable
data class CoresEconomae(
    val primaria: Color,
    val sobrePrimaria: Color,
    val primariaContainer: Color,
    val sobrePrimariaContainer: Color,
    val superficie: Color,
    val superficieCartao: Color,
    val superficieContainer: Color,
    val superficieContainerAlta: Color,
    val texto: Color,
    val textoSecundario: Color,
    val contorno: Color,
    val contornoSuave: Color,
    val economia: Color,
    val economiaContainer: Color,
    val sobreEconomiaContainer: Color,
    val prova: Color,
    val provaContainer: Color,
    val sobreProvaContainer: Color,
    val provaRegua: Color,
    val condicaoContainer: Color,
    val sobreCondicaoContainer: Color,
    val condicaoBorda: Color,
    val erro: Color,
    val erroContainer: Color,
    val sobreErroContainer: Color,
    val anuncioContainer: Color,
    val sobreAnuncioContainer: Color,
    val anuncioBorda: Color,
    val esqueleto: Color,
    val scrim: Color,
)

val CoresClaras = CoresEconomae(
    primaria = Color(0xFF00696B),
    sobrePrimaria = Color(0xFFFFFFFF),
    primariaContainer = Color(0xFFA6EEEE),
    sobrePrimariaContainer = Color(0xFF002021),
    superficie = Color(0xFFF8FAF8),
    superficieCartao = Color(0xFFFFFFFF),
    superficieContainer = Color(0xFFECEFEC),
    superficieContainerAlta = Color(0xFFE1E5E2),
    texto = Color(0xFF171D1C),
    textoSecundario = Color(0xFF3D4947),
    contorno = Color(0xFF6B7876),
    contornoSuave = Color(0xFFC0C9C6),
    economia = Color(0xFF155B26),
    economiaContainer = Color(0xFFD6F2DA),
    sobreEconomiaContainer = Color(0xFF0A3A16),
    prova = Color(0xFF2A48A8),
    provaContainer = Color(0xFFE3E8FF),
    sobreProvaContainer = Color(0xFF0F2468),
    provaRegua = Color(0xFF2A48A8),
    condicaoContainer = Color(0xFFFFE2A3),
    sobreCondicaoContainer = Color(0xFF472F00),
    condicaoBorda = Color(0xFF8A5F00),
    erro = Color(0xFFB3261E),
    erroContainer = Color(0xFFF9DEDC),
    sobreErroContainer = Color(0xFF410E0B),
    anuncioContainer = Color(0xFFEEEEEE),
    sobreAnuncioContainer = Color(0xFF454747),
    anuncioBorda = Color(0xFF767878),
    esqueleto = Color(0xFFE1E5E2),
    scrim = Color(0xFF000000),
)

val CoresEscuras = CoresEconomae(
    primaria = Color(0xFF7FD4D4),
    sobrePrimaria = Color(0xFF003738),
    primariaContainer = Color(0xFF004F51),
    sobrePrimariaContainer = Color(0xFFA6EEEE),
    superficie = Color(0xFF0F1413),
    superficieCartao = Color(0xFF171D1C),
    superficieContainer = Color(0xFF1D2423),
    superficieContainerAlta = Color(0xFF27302E),
    texto = Color(0xFFE0E4E2),
    textoSecundario = Color(0xFFBEC9C6),
    contorno = Color(0xFF89938F),
    contornoSuave = Color(0xFF3D4947),
    economia = Color(0xFF9CD9A4),
    economiaContainer = Color(0xFF0D3A19),
    sobreEconomiaContainer = Color(0xFFC4EFC9),
    prova = Color(0xFFB5C3FF),
    provaContainer = Color(0xFF1B2B66),
    sobreProvaContainer = Color(0xFFDDE2FF),
    provaRegua = Color(0xFFB5C3FF),
    condicaoContainer = Color(0xFF4A3400),
    sobreCondicaoContainer = Color(0xFFFFE0A0),
    condicaoBorda = Color(0xFFD8A93C),
    erro = Color(0xFFF2B8B5),
    erroContainer = Color(0xFF8C1D18),
    sobreErroContainer = Color(0xFFF9DEDC),
    anuncioContainer = Color(0xFF242827),
    sobreAnuncioContainer = Color(0xFFC6CAC8),
    anuncioBorda = Color(0xFF8E9290),
    esqueleto = Color(0xFF27302E),
    scrim = Color(0xFF000000),
)

/** Estilos de texto em sp. Ver Type.kt para os TextStyle montados. */
object TipoTokens {
    /** Preço atual no detalhe. O maior texto do app. */
    val precoDestaque = EstiloToken(40.sp, 48.sp, FontWeight(700), tabular = true)
    /** Preço atual no card do feed. */
    val precoCartao = EstiloToken(30.sp, 36.sp, FontWeight(700), tabular = true)
    /** Economia em reais, dentro do chip de economia. */
    val economia = EstiloToken(16.sp, 22.sp, FontWeight(700), tabular = true)
    /** Preço normal nesta loja. Subordinado por peso e cor, nunca riscado. */
    val precoNormal = EstiloToken(16.sp, 24.sp, FontWeight(400), tabular = true)
    /** Título de tela e de estado vazio. */
    val tituloTela = EstiloToken(24.sp, 32.sp, FontWeight(600), tabular = false)
    /** Cabeçalho de seção. */
    val tituloSecao = EstiloToken(18.sp, 24.sp, FontWeight(600), tabular = false)
    /** Nome curto do produto, até 2 linhas. */
    val nomeProduto = EstiloToken(16.sp, 22.sp, FontWeight(500), tabular = false)
    /** Texto corrido. */
    val corpo = EstiloToken(16.sp, 24.sp, FontWeight(400), tabular = false)
    /** Loja, cobertura, conferido às. Menor tamanho para informação essencial. */
    val apoio = EstiloToken(14.sp, 20.sp, FontWeight(400), tabular = false)
    /** Botões, chips, etiquetas. */
    val rotulo = EstiloToken(14.sp, 20.sp, FontWeight(600), tabular = false)
    /** Só para o que se repete em outro lugar (contador, 'Anúncio' já sinalizado pela forma). */
    val rotuloPequeno = EstiloToken(12.sp, 16.sp, FontWeight(600), tabular = false)
}

object Espaco {
    val e0 = 0.dp
    val e1 = 2.dp
    val e2 = 4.dp
    val e3 = 8.dp
    val e4 = 12.dp
    val e5 = 16.dp
    val e6 = 20.dp
    val e7 = 24.dp
    val e8 = 32.dp
    val e9 = 40.dp
    val e10 = 48.dp
    val e11 = 64.dp
}

object Raio {
    val nenhum = 0.dp
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 28.dp
    val total = 999.dp
}

object Elevacao {
    val nivel0 = 0.dp
    val nivel1 = 1.dp
    val nivel2 = 3.dp
    val nivel3 = 6.dp
}

object Alvo {
    val toqueMinimo = 48.dp
    val botaoPrincipalAltura = 56.dp
    val espacoEntreAlvos = 8.dp
}

object IconeTamanho {
    val pequeno = 18.dp
    val padrao = 24.dp
    val grande = 32.dp
    val categoria = 28.dp
}

object Movimento {
    const val instantaneaMs = 0
    const val curtaMs = 150
    const val mediaMs = 250
}
