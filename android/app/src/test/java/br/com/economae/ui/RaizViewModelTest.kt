package br.com.economae.ui

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class RaizViewModelTest {
    @get:Rule val regra = RegraDispatcher()
    private val repo = RepositorioDuble()
    private var registros = 0
    private val vm by lazy { RaizViewModel(repo) { registros++ } }

    /** Espera o estado esperado; se não chegar, o timeout derruba o teste. */
    private suspend fun esperar(esperado: EstadoRaiz) {
        withTimeout(2_000) { vm.estado.first { it == esperado } }
        assertEquals(esperado, vm.estado.value)
    }

    @Test
    fun `caminho da mae - entrada, termos, preferencias, pronto`() = runTest {
        backgroundScope.launch { vm.estado.collect {} }
        esperar(EstadoRaiz.Entrada)

        repo.usuario = usuarioTeste(termosPendentes = true)
        repo.logado.value = true
        esperar(EstadoRaiz.Termos)

        repo.aceitarTermos("v1")
        vm.recarregar()
        esperar(EstadoRaiz.Preferencias)

        repo.preferencias = repo.preferencias.copy(categorias = listOf("fraldas_lencos"), ceps = listOf("14010000"), completas = true)
        vm.recarregar()
        esperar(EstadoRaiz.Pronto)
        assertEquals("sem consentimento, não registra aparelho", 0, registros)

        repo.logado.value = false
        esperar(EstadoRaiz.Entrada)
    }

    @Test
    fun `com consentimento registra o aparelho ao abrir`() = runTest {
        backgroundScope.launch { vm.estado.collect {} }
        repo.usuario = usuarioTeste(consentiu = true)
        repo.preferencias = repo.preferencias.copy(completas = true)
        repo.logado.value = true
        esperar(EstadoRaiz.Pronto)
        assertEquals(1, registros)
    }

    @Test
    fun `sem rede mostra erro e tenta de novo`() = runTest {
        backgroundScope.launch { vm.estado.collect {} }
        repo.falhaNaRede = true
        repo.logado.value = true
        esperar(EstadoRaiz.Erro("Sem conexão com o servidor. Tente de novo."))
        repo.falhaNaRede = false
        repo.preferencias = repo.preferencias.copy(completas = true)
        vm.recarregar()
        esperar(EstadoRaiz.Pronto)
    }
}
