package app.promocao.formato

import app.promocao.modelo.Embalagem
import app.promocao.modelo.Exemplos
import app.promocao.modelo.UnidadeBase
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.LocalTime

class FormatoTest {

    @Test
    fun `reais no padrao brasileiro`() {
        assertEquals("R$ 0,05", Formato.reais(5))
        assertEquals("R$ 39,90", Formato.reais(3990))
        assertEquals("R$ 1.234,56", Formato.reais(123456))
        assertEquals("R$ 1.234.567,00", Formato.reais(123456700))
        assertEquals("-R$ 2,00", Formato.reais(-200))
    }

    @Test
    fun `hora km cep e milhar`() {
        assertEquals("08:05", Formato.hora(LocalTime.of(8, 5)))
        assertEquals("1,2 km", Formato.km(1.234))
        assertEquals("01310-100", Formato.cep("01310100"))
        assertEquals("01310", Formato.cep("01310"))
        assertEquals("1.284", Formato.milhar(1284))
    }

    @Test
    fun `preco por unidade na escala do produto, nunca por litro de protetor`() {
        // U05: R$ 39,90 por 50 ml é R$ 79,80 por 100 ml, não R$ 798,00/l.
        assertEquals(Formato.UnidadeExibicao.POR_100ML to 7980L, Formato.precoPorUnidade(3990, Embalagem(0.05, UnidadeBase.L, "50 ml")))
        assertEquals(Formato.UnidadeExibicao.POR_100G to 1250L, Formato.precoPorUnidade(1250, Embalagem(0.1, UnidadeBase.KG, "100 g")))
        assertEquals(Formato.UnidadeExibicao.POR_UNIDADE to 158L, Formato.precoPorUnidade(5380, Embalagem(34.0, UnidadeBase.UN, "34 un")))
    }

    @Test
    fun `cep valida formato e regiao de SP`() {
        assertEquals(Cep.Resultado.Incompleto, Cep.validar("0131"))
        assertEquals(Cep.Resultado.Valido("01310100"), Cep.validar("01310-100"))
        assertEquals(Cep.Resultado.Valido("19999999"), Cep.validar("19999-999"))
        assertEquals(Cep.Resultado.ForaDaRegiao("20040002"), Cep.validar("20040-002"))
    }

    @Test
    fun `leve 3 pague 2 calcula como o motor`() {
        val f = Exemplos.fralda
        assertEquals(16140L, f.totalCompraMinimaCentavos)
        assertEquals(5380L, f.precoEfetivoCentavos)
        assertEquals(7830L, f.economiaCentavos) // (79,90 − 53,80) × 3
    }

    @Test
    fun `selo nunca promete mais do que foi medido`() {
        assertEquals(Selo(Selo.Tipo.MENOR, null), Prova.selo(Exemplos.protetor))
        assertEquals(Selo(Selo.Tipo.QUASE, 94), Prova.selo(Exemplos.shampoo))
        val pos = Prova.posicoes(Exemplos.protetor)
        assertEquals(0f, pos.hoje)
        assertEquals(3990L, pos.minimoCentavos)
    }
}
