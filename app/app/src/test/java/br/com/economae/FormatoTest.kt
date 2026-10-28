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
}
