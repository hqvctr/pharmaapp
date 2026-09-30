package br.com.economae.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.ErroApi
import br.com.economae.dados.RepositorioEconomae
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.transformLatest
import kotlinx.coroutines.launch

/** Em que ponto do caminho a mãe está: entrar, aceitar os termos, escolher preferências, usar. */
sealed interface EstadoRaiz {
    data object Carregando : EstadoRaiz
    data object Entrada : EstadoRaiz
    data object Termos : EstadoRaiz
    data object Preferencias : EstadoRaiz
    data object Pronto : EstadoRaiz
    data class Erro(val mensagem: String) : EstadoRaiz
}

class RaizViewModel(
    private val repositorio: RepositorioEconomae,
    private val registrarAparelho: suspend () -> Unit,
) : ViewModel() {
    private val recarga = MutableStateFlow(0)

    val estado: StateFlow<EstadoRaiz> = repositorio.logado
        .combine(recarga) { logado, _ -> logado }
        .transformLatest { logado ->
            if (!logado) {
                emit(EstadoRaiz.Entrada)
                return@transformLatest
            }
            emit(EstadoRaiz.Carregando)
            try {
                val usuario = repositorio.usuario()
                when {
                    usuario.termos.pendente -> emit(EstadoRaiz.Termos)
                    !repositorio.preferencias().completas -> emit(EstadoRaiz.Preferencias)
                    else -> {
                        emit(EstadoRaiz.Pronto)
                        if (usuario.notificacoes.consentidas) viewModelScope.launch { registrarAparelho() }
                    }
                }
            } catch (e: ErroApi) {
                // 401: o repositório já apagou o token e "logado" vai emitir false.
                if (e.status != 401) emit(EstadoRaiz.Erro(e.message ?: "Erro inesperado."))
            }
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), EstadoRaiz.Carregando)

    fun recarregar() {
        recarga.value++
    }
}
