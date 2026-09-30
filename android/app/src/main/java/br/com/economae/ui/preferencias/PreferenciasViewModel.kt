package br.com.economae.ui.preferencias

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.Configuracao
import br.com.economae.dados.ErroApi
import br.com.economae.dados.PreferenciasEnvio
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.dados.Silencio
import br.com.economae.ui.horaValida
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class FormularioPreferencias(
    val categorias: Set<String> = emptySet(),
    /** Um campo por CEP que o plano permite; vazio = não usado. */
    val ceps: List<String> = listOf(""),
    val tamanhosFralda: Set<String> = emptySet(),
    val silencioAtivo: Boolean = true,
    val silencioInicio: String = "22:00",
    val silencioFim: String = "07:00",
    val limiteDiario: Int = 3,
)

sealed interface EstadoPreferencias {
    data object Carregando : EstadoPreferencias
    data class Erro(val mensagem: String) : EstadoPreferencias
    data class Pronto(
        val configuracao: Configuracao,
        val formulario: FormularioPreferencias,
        val salvando: Boolean = false,
        val mensagem: String? = null,
    ) : EstadoPreferencias
}

class PreferenciasViewModel(private val repositorio: RepositorioEconomae, private val onSalvo: () -> Unit) : ViewModel() {
    private val _estado = MutableStateFlow<EstadoPreferencias>(EstadoPreferencias.Carregando)
    val estado: StateFlow<EstadoPreferencias> = _estado.asStateFlow()

    init {
        carregar()
    }

    fun carregar() {
        _estado.value = EstadoPreferencias.Carregando
        viewModelScope.launch {
            _estado.value = try {
                val config = async { repositorio.configuracao() }
                val usuario = async { repositorio.usuario() }
                val prefs = repositorio.preferencias()
                val maxCeps = usuario.await().limites.maxCeps
                EstadoPreferencias.Pronto(
                    configuracao = config.await(),
                    formulario = FormularioPreferencias(
                        categorias = prefs.categorias.toSet(),
                        ceps = List(maxCeps) { i -> prefs.ceps.getOrNull(i).orEmpty() },
                        tamanhosFralda = prefs.tamanhosFralda.toSet(),
                        silencioAtivo = prefs.silencio != null || !prefs.completas,
                        silencioInicio = prefs.silencio?.inicio ?: "22:00",
                        silencioFim = prefs.silencio?.fim ?: "07:00",
                        limiteDiario = prefs.limiteDiario ?: 3,
                    ),
                )
            } catch (e: ErroApi) {
                EstadoPreferencias.Erro(e.message ?: "Erro inesperado.")
            }
        }
    }

    fun alterar(mudanca: (FormularioPreferencias) -> FormularioPreferencias) = _estado.update {
        if (it is EstadoPreferencias.Pronto) it.copy(formulario = mudanca(it.formulario), mensagem = null) else it
    }

    fun salvar() {
        val atual = _estado.value as? EstadoPreferencias.Pronto ?: return
        val f = atual.formulario
        val ceps = f.ceps.map { c -> c.filter(Char::isDigit) }.filter { it.isNotEmpty() }
        val problema = when {
            f.categorias.isEmpty() -> "Escolha ao menos uma categoria."
            ceps.isEmpty() -> "Informe o CEP onde você recebe as compras."
            ceps.any { it.length != 8 } -> "O CEP tem 8 números."
            ceps.toSet().size != ceps.size -> "Há CEP repetido."
            f.silencioAtivo && (!horaValida(f.silencioInicio) || !horaValida(f.silencioFim)) -> "Use o formato 22:00 nos horários."
            else -> null
        }
        if (problema != null) {
            _estado.value = atual.copy(mensagem = problema)
            return
        }
        _estado.value = atual.copy(salvando = true, mensagem = null)
        viewModelScope.launch {
            try {
                repositorio.salvarPreferencias(
                    PreferenciasEnvio(
                        categorias = f.categorias.toList(),
                        ceps = ceps,
                        tamanhosFralda = f.tamanhosFralda.toList(),
                        silencio = if (f.silencioAtivo) Silencio(f.silencioInicio, f.silencioFim) else null,
                        limiteDiario = f.limiteDiario,
                    ),
                )
                _estado.value = atual.copy(salvando = false)
                onSalvo()
            } catch (e: ErroApi) {
                _estado.value = atual.copy(salvando = false, mensagem = e.message)
            }
        }
    }
}
