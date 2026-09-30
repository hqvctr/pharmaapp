package br.com.economae.ui

import br.com.economae.ui.entrada.EntradaViewModel
import br.com.economae.ui.entrada.EtapaEntrada
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class EntradaViewModelTest {
    @get:Rule val regra = RegraDispatcher()
    private val repo = RepositorioDuble()
    // Depois da regra: o init do ViewModel já usa o dispatcher principal.
    private val vm by lazy { EntradaViewModel(repo) }

    @Test
    fun `email invalido nem chama o servidor`() {
        vm.alterarEmail("ana@")
        vm.pedirCodigo()
        assertEquals("Confira o e-mail digitado.", vm.estado.value.mensagem)
        assertTrue(repo.chamadas.isEmpty())
    }

    @Test
    fun `codigo errado mostra a mensagem do servidor, certo entra`() {
        vm.alterarEmail("ana@exemplo.com")
        vm.pedirCodigo()
        assertEquals(EtapaEntrada.Codigo, vm.estado.value.etapa)
        assertEquals(listOf("codigo:ana@exemplo.com"), repo.chamadas)

        vm.alterarCodigo("12a34-5")
        assertEquals("12345", vm.estado.value.codigo)
        vm.verificarCodigo()
        assertEquals("O código tem 6 números.", vm.estado.value.mensagem)

        vm.alterarCodigo("000000")
        vm.verificarCodigo()
        assertEquals("Código inválido ou expirado.", vm.estado.value.mensagem)

        vm.alterarCodigo("123456")
        vm.verificarCodigo()
        assertTrue(repo.logado.value)
    }

    @Test
    fun `google aparece quando o tenant habilita`() {
        assertTrue(vm.estado.value.googleDisponivel)
        vm.entrarComGoogle("id-token")
        assertTrue(repo.logado.value)
    }
}
