package br.com.economae.ui

import br.com.economae.ui.preferencias.EstadoPreferencias
import br.com.economae.ui.preferencias.PreferenciasViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class PreferenciasViewModelTest {
    @get:Rule val regra = RegraDispatcher()
    private val repo = RepositorioDuble()
    private var salvo = false
    private val vm by lazy { PreferenciasViewModel(repo) { salvo = true } }
    private fun pronto() = vm.estado.value as EstadoPreferencias.Pronto

    @Test
    fun `um campo de CEP por CEP que o plano permite`() {
        assertEquals(1, pronto().formulario.ceps.size)
    }

    @Test
    fun `valida antes de mandar e manda o formulario inteiro`() {
        vm.salvar()
        assertEquals("Escolha ao menos uma categoria.", pronto().mensagem)
        vm.alterar { it.copy(categorias = setOf("fraldas_lencos")) }
        vm.salvar()
        assertEquals("Informe o CEP onde você recebe as compras.", pronto().mensagem)
        vm.alterar { it.copy(ceps = listOf("1401000")) }
        vm.salvar()
        assertEquals("O CEP tem 8 números.", pronto().mensagem)

        vm.alterar { it.copy(ceps = listOf("14010000"), tamanhosFralda = setOf("G"), silencioAtivo = false, limiteDiario = 2) }
        vm.salvar()
        assertTrue(salvo)
        assertEquals(listOf("G"), repo.preferencias.tamanhosFralda)
        assertEquals(null, repo.preferencias.silencio)
        assertEquals(2, repo.preferencias.limiteDiario)
    }
}
