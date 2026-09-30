package br.com.economae.ui.entrada

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.ErroApi
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.ui.emailValido
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class EtapaEntrada { Email, Codigo }

data class EstadoEntrada(
    val etapa: EtapaEntrada = EtapaEntrada.Email,
    val email: String = "",
    val codigo: String = "",
    val enviando: Boolean = false,
    val mensagem: String? = null,
    val validadeMinutos: Int? = null,
    val googleDisponivel: Boolean = false,
)

/** Login por código no e-mail ou pelo Google. O sucesso grava o token e a raiz troca de tela sozinha. */
class EntradaViewModel(private val repositorio: RepositorioEconomae) : ViewModel() {
    private val _estado = MutableStateFlow(EstadoEntrada())
    val estado: StateFlow<EstadoEntrada> = _estado.asStateFlow()

    init {
        viewModelScope.launch {
            runCatching { repositorio.configuracao() }.onSuccess { c -> _estado.update { it.copy(googleDisponivel = c.login.google) } }
        }
    }

    fun alterarEmail(email: String) = _estado.update { it.copy(email = email, mensagem = null) }

    fun alterarCodigo(codigo: String) = _estado.update { it.copy(codigo = codigo.filter(Char::isDigit).take(6), mensagem = null) }

    fun voltarAoEmail() = _estado.update { it.copy(etapa = EtapaEntrada.Email, codigo = "", mensagem = null) }

    fun pedirCodigo() {
        val email = _estado.value.email.trim()
        if (!emailValido(email)) {
            _estado.update { it.copy(mensagem = "Confira o e-mail digitado.") }
            return
        }
        executar {
            val r = repositorio.pedirCodigo(email)
            _estado.update { it.copy(etapa = EtapaEntrada.Codigo, validadeMinutos = r.validadeMinutos, codigo = "") }
        }
    }

    fun verificarCodigo() {
        val s = _estado.value
        if (s.codigo.length != 6) {
            _estado.update { it.copy(mensagem = "O código tem 6 números.") }
            return
        }
        executar { repositorio.entrarComCodigo(s.email, s.codigo) }
    }

    fun entrarComGoogle(idToken: String) = executar { repositorio.entrarComGoogle(idToken) }

    fun avisar(mensagem: String) = _estado.update { it.copy(mensagem = mensagem) }

    private fun executar(bloco: suspend () -> Unit) {
        if (_estado.value.enviando) return
        _estado.update { it.copy(enviando = true, mensagem = null) }
        viewModelScope.launch {
            try {
                bloco()
            } catch (e: ErroApi) {
                _estado.update { it.copy(mensagem = e.message) }
            } finally {
                _estado.update { it.copy(enviando = false) }
            }
        }
    }
}
