package app.promocao.telas

import app.cash.paparazzi.DeviceConfig
import app.cash.paparazzi.Paparazzi
import androidx.compose.runtime.Composable
import app.promocao.modelo.EstadoAvisos
import app.promocao.modelo.EstadoDetalhe
import app.promocao.modelo.EstadoOfertas
import app.promocao.modelo.Exemplos
import app.promocao.modelo.Categoria
import app.promocao.ui.telas.AjustesTela
import app.promocao.ui.telas.AvisosTela
import app.promocao.ui.telas.BoasVindasTela
import app.promocao.ui.telas.CategoriasTela
import app.promocao.ui.telas.CepTela
import app.promocao.ui.telas.DetalheTela
import app.promocao.ui.telas.OfertasTela
import app.promocao.ui.telas.PermissaoTela
import app.promocao.ui.theme.TemaApp
import com.android.resources.Density
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.Parameterized

/**
 * Captura das telas no aparelho de referência (S-01: ~360 × 800 dp) em três condições:
 * tema claro, tema escuro e fonte a 200% (A05). Imagens em app/src/test/snapshots.
 */
@RunWith(Parameterized::class)
class TelasCapturaTest(private val condicao: String) {

    companion object {
        @JvmStatic
        @Parameterized.Parameters(name = "{0}")
        fun condicoes() = listOf("claro", "escuro", "fonte200")

        /** Galaxy A de entrada: 720 × 1600 px, xhdpi → 360 × 800 dp. */
        private val REFERENCIA = DeviceConfig(
            screenHeight = 1600, screenWidth = 720, xdpi = 320, ydpi = 320, density = Density.XHIGH,
            softButtons = false, ratio = com.android.resources.ScreenRatio.LONG, size = com.android.resources.ScreenSize.NORMAL,
        )
    }

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = REFERENCIA.copy(fontScale = if (condicao == "fonte200") 2f else 1f),
        maxPercentDifference = 0.1,
    )

    private fun tela(nome: String, conteudo: @Composable () -> Unit) {
        paparazzi.snapshot(name = nome) { TemaApp(escuro = condicao == "escuro") { conteudo() } }
    }

    private val nada: () -> Unit = {}

    @Test fun ofertas() = tela("ofertas") {
        OfertasTela(Exemplos.ofertas, "01310100", true, {}, {}, nada, nada, nada, nada)
    }

    @Test fun ofertasNadaHoje() = tela("ofertas_nada_hoje") {
        OfertasTela(Exemplos.nadaHoje, "01310100", true, {}, {}, nada, nada, nada, nada)
    }

    @Test fun ofertasMedindo() = tela("ofertas_medindo") {
        OfertasTela(EstadoOfertas.Medindo(6, 14), "01310100", false, {}, {}, nada, nada, nada, nada)
    }

    @Test fun ofertasCarregando() = tela("ofertas_carregando") {
        OfertasTela(EstadoOfertas.Carregando, "01310100", true, {}, {}, nada, nada, nada, nada)
    }

    @Test fun ofertasErro() = tela("ofertas_erro") {
        OfertasTela(EstadoOfertas.Erro(null), "01310100", true, {}, {}, nada, nada, nada, nada)
    }

    @Test fun ofertasForaDaRegiao() = tela("ofertas_fora_regiao") {
        OfertasTela(EstadoOfertas.ForaDaRegiao("20040002"), "20040002", true, {}, {}, nada, nada, nada, nada)
    }

    @Test fun detalhe() = tela("detalhe") {
        DetalheTela(EstadoDetalhe.Pronto(Exemplos.protetor), nada, {}, {}, nada, nada, nada)
    }

    @Test fun detalheCondicional() = tela("detalhe_condicional") {
        DetalheTela(EstadoDetalhe.Pronto(Exemplos.fralda), nada, {}, {}, nada, nada, nada)
    }

    @Test fun detalheEncerrada() = tela("detalhe_encerrada") {
        DetalheTela(EstadoDetalhe.Pronto(Exemplos.protetorEncerrado), nada, {}, {}, nada, nada, nada)
    }

    @Test fun detalheRemedio() = tela("detalhe_remedio") {
        DetalheTela(EstadoDetalhe.Pronto(Exemplos.paracetamol), nada, {}, {}, nada, nada, nada)
    }

    @Test fun avisos() = tela("avisos") {
        AvisosTela(EstadoAvisos.Lista(Exemplos.avisos), true, {}, nada)
    }

    @Test fun avisosVazio() = tela("avisos_vazio") {
        AvisosTela(EstadoAvisos.Vazio, false, {}, nada)
    }

    @Test fun ajustes() = tela("ajustes") {
        AjustesTela(Exemplos.preferencias, Categoria.CUIDADOS_PESSOAIS, {}, {}, nada, nada, nada, nada, nada, nada)
    }

    @Test fun boasVindas() = tela("primeiro_uso_1_boas_vindas") { BoasVindasTela(nada, nada) }

    @Test fun categorias() = tela("primeiro_uso_2_categorias") {
        CategoriasTela(setOf(Categoria.CUIDADOS_PESSOAIS, Categoria.HIGIENE_BEBE), {}, nada)
    }

    @Test fun cepForaDaRegiao() = tela("primeiro_uso_3_cep_fora") { CepTela("20040002", {}, true, {}, nada) }

    @Test fun permissao() = tela("primeiro_uso_4_permissao") { PermissaoTela(false, nada, nada) }
}
