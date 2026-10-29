package br.com.economae

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatoTest {
    private fun limpo(s: String) = s.replace(' ', ' ')

    @Test fun `centavos viram reais com virgula`() {
        assertEquals("R$ 59,90", limpo(reais(5990)))
        assertEquals("R$ 0,05", limpo(reais(5)))
        assertEquals("R$ 1.234,56", limpo(reais(123456)))
    }

    @Test fun `queda vira percentual inteiro`() {
        assertEquals("33%", percentual(0.3333))
        assertEquals("0%", percentual(0.0))
    }

    @Test fun `cep ganha hifen`() {
        assertEquals("14020-260", cepBonito("14020260"))
        assertEquals("123", cepBonito("123"))
    }

    @Test fun `data e hora no fuso de Sao Paulo`() {
        assertEquals("27/10 09:00", dataHora("2026-10-27T12:00:00Z"))
        assertEquals("27/10/2026", dataCurta("2026-10-27T12:00:00Z"))
        assertEquals("", dataHora(null))
    }

    @Test fun `embalagem sem casas inuteis`() {
        fun p(q: Double, u: String) = JSONObject().put("embalagem", JSONObject().put("quantidade", q).put("unidade", u))
        assertEquals("60 un", embalagemTexto(p(60.0, "un")))
        assertEquals("0,4 l", embalagemTexto(p(0.4, "l")))
    }

    @Test fun `frete por status`() {
        assertEquals("Frete a confirmar", freteTexto(JSONObject().put("status", "a_confirmar").put("centavos", JSONObject.NULL)))
        assertEquals("Sem frete", freteTexto(JSONObject().put("status", "nao_se_aplica").put("centavos", JSONObject.NULL)))
        assertEquals("Frete R$ 12,90", limpo(freteTexto(JSONObject().put("status", "conhecido").put("centavos", 1290))))
    }

    @Test fun `erro da API vira mensagem para a pessoa`() {
        val simples = Resposta(409, JSONObject("""{"codigo":"limite_atingido","mensagem":"Limite atingido."}"""), "")
        assertFalse(simples.ok)
        assertEquals("limite_atingido", simples.codigo)
        assertEquals("Limite atingido.", simples.mensagem)
        val campos = Resposta(422, JSONObject("""{"codigo":"validacao","mensagem":"Confira.","campos":[{"campo":"ceps[0]","mensagem":"O CEP tem 8 dígitos."}]}"""), "")
        assertEquals("O CEP tem 8 dígitos.", campos.mensagem)
        val sem = Resposta(500, null, "")
        assertEquals("Erro 500", sem.mensagem)
        val ok = Resposta(200, JSONObject("{}"), "{}")
        assertTrue(ok.ok)
        assertNull(ok.codigo)
    }

    @Test fun `campos nulos do JSON`() {
        val o = JSONObject("""{"a":null,"b":"x","c":3}""")
        assertNull(o.textoOuNulo("a"))
        assertNull(o.textoOuNulo("naoExiste"))
        assertEquals("x", o.textoOuNulo("b"))
        assertNull(o.inteiroOuNulo("a"))
        assertEquals(3, o.inteiroOuNulo("c"))
    }

    @Test fun `preco por unidade do cartao`() {
        val p = { q: Double, u: String, v: Any -> JSONObject().put("embalagem", JSONObject().put("quantidade", q).put("unidade", u)).put("menor_preco_por_unidade_centavos", v) }
        assertEquals("R$ 0,45/un", limpo(precoPorUnidadeTexto(p(80.0, "un", 45.4))!!))
        assertNull(precoPorUnidadeTexto(p(1.0, "un", 5990)))
        assertEquals("R$ 4,99/100 ml", limpo(precoPorUnidadeTexto(p(0.4, "l", 4990))!!))
        assertEquals("R$ 2,50/100 g", limpo(precoPorUnidadeTexto(p(0.9, "kg", 2500))!!))
        assertNull(precoPorUnidadeTexto(p(80.0, "un", JSONObject.NULL)))
    }

    @Test fun `queda do cartao so com queda verificada`() {
        assertEquals("33%", quedaDoCartao(JSONObject().put("queda", 0.3333)))
        assertNull(quedaDoCartao(JSONObject().put("queda", JSONObject.NULL)))
        assertNull(quedaDoCartao(JSONObject().put("queda", 0)))
        assertNull(quedaDoCartao(JSONObject()))
    }

    @Test fun `faixa de preco digitada vira centavos`() {
        assertEquals(5990, centavosDoTexto("59,90"))
        assertEquals(5900, centavosDoTexto("59"))
        assertEquals(123400, centavosDoTexto("1.234"))
        assertNull(centavosDoTexto(""))
        assertNull(centavosDoTexto("abc"))
        assertEquals("Até R$ 50,00", limpo(faixaDePrecoTexto(null, 5000)))
        assertEquals("R$ 10,00 a R$ 50,00", limpo(faixaDePrecoTexto(1000, 5000)))
    }
}
