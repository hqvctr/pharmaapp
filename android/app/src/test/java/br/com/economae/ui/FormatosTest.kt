package br.com.economae.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class FormatosTest {
    @Test
    fun `reais igual ao backend`() {
        assertEquals("R$ 49,90", reais(4990L))
        assertEquals("R$ 1.598,00", reais(159800L))
        assertEquals("R$ 0,05", reais(5L))
        assertEquals("R$ 1.234.567,89", reais(123456789L))
        assertEquals("R$ 138,61", reais(13861.1))
    }

    @Test
    fun `percentual e datas`() {
        assertEquals("32% abaixo", percentualAbaixo(0.3155))
        assertEquals("30/09", diaCurto("2026-09-30"))
        assertEquals("14010-000", cepFormatado("14010000"))
    }

    @Test
    fun validacoes() {
        assertTrue(emailValido(" ana@exemplo.com "))
        assertFalse(emailValido("ana@exemplo"))
        assertTrue(horaValida("07:00"))
        assertFalse(horaValida("24:00"))
    }
}
