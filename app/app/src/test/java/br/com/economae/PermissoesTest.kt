package br.com.economae

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PermissoesTest {
    private val dia = 24L * 3600 * 1000

    @Test fun `convite aparece ate a primeira recusa e mais uma vez 7 dias depois`() {
        assertTrue(deveConvidar(recusas = 0, ultimaRecusaEm = 0, agora = 1000))
        assertFalse(deveConvidar(recusas = 1, ultimaRecusaEm = 0, agora = 6 * dia))
        assertTrue(deveConvidar(recusas = 1, ultimaRecusaEm = 0, agora = 7 * dia))
        assertFalse(deveConvidar(recusas = 2, ultimaRecusaEm = 0, agora = 365 * dia))
    }

    @Test fun `codigo postal do geocoder vira cep de 8 digitos`() {
        assertEquals("14020260", cepDoCodigoPostal("14020-260"))
        assertEquals("01310100", cepDoCodigoPostal("01310100"))
        assertNull(cepDoCodigoPostal("14020"))
        assertNull(cepDoCodigoPostal(null))
    }
}
