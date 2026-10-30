package br.com.economae

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PushTest {
    @Test fun `dados do push do servidor viram o aviso a abrir`() {
        val dados = mapOf("aviso_id" to "a1", "tipo" to "promocao_excepcional", "produto_id" to "p1", "alerta_id" to "al1")
        assertEquals(AvisoAberto("a1", "al1", "p1"), avisoDosDados { dados[it] })
    }

    @Test fun `aviso sem alerta abre o produto`() {
        val dados = mapOf("aviso_id" to "a1", "tipo" to "voltou_estoque", "produto_id" to "p1")
        assertEquals(AvisoAberto("a1", null, "p1"), avisoDosDados { dados[it] })
        assertEquals(AvisoAberto("a1", null, "p1"), avisoDosDados { (dados + ("alerta_id" to ""))[it] })
    }

    @Test fun `abertura comum do app ou push sem aviso nao abre nada`() {
        assertNull(avisoDosDados { null })
        assertNull(avisoDosDados { mapOf("produto_id" to "p1")[it] })
        assertNull(avisoDosDados { mapOf("aviso_id" to "a1")[it] })
    }
}
