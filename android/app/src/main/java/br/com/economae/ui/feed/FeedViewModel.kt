package br.com.economae.ui.feed

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.economae.dados.ErroApi
import br.com.economae.dados.Oferta
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.dados.Rotulo
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class EstadoFeed(
    val itens: List<Oferta> = emptyList(),
    val proximoCursor: String? = null,
    val carregando: Boolean = true,
    val carregandoMais: Boolean = false,
    val erro: String? = null,
    /** Categorias escolhidas pela mãe, para o filtro do topo. */
    val categorias: List<Rotulo> = emptyList(),
    val filtro: String? = null,
    val notificacoesAtivas: Boolean = true,
)

class FeedViewModel(private val repositorio: RepositorioEconomae) : ViewModel() {
    private val _estado = MutableStateFlow(EstadoFeed())
    val estado: StateFlow<EstadoFeed> = _estado.asStateFlow()
    private var carga: Job? = null

    init {
        viewModelScope.launch {
            runCatching {
                val config = repositorio.configuracao()
                val escolhidas = repositorio.preferencias().categorias.toSet()
                val usuario = repositorio.usuario()
                _estado.update {
                    it.copy(categorias = config.categorias.filter { c -> c.id in escolhidas }, notificacoesAtivas = usuario.notificacoes.consentidas)
                }
            }
        }
        atualizar()
    }

    fun filtrar(categoria: String?) {
        _estado.update { it.copy(filtro = categoria) }
        atualizar()
    }

    fun atualizar() {
        carga?.cancel()
        _estado.update { it.copy(carregando = true, erro = null) }
        carga = viewModelScope.launch {
            try {
                val pagina = repositorio.feed(null, _estado.value.filtro)
                _estado.update { it.copy(itens = pagina.itens, proximoCursor = pagina.proximoCursor, carregando = false) }
            } catch (e: ErroApi) {
                _estado.update { it.copy(carregando = false, erro = e.message) }
            }
        }
    }

    fun carregarMais() {
        val s = _estado.value
        val cursor = s.proximoCursor ?: return
        if (s.carregando || s.carregandoMais) return
        _estado.update { it.copy(carregandoMais = true) }
        carga = viewModelScope.launch {
            try {
                val pagina = repositorio.feed(cursor, s.filtro)
                // A lista pode mudar entre páginas: o cliente não repete oferta (contrato).
                val vistos = s.itens.map { it.ofertaId }.toSet()
                _estado.update {
                    it.copy(itens = it.itens + pagina.itens.filter { o -> o.ofertaId !in vistos }, proximoCursor = pagina.proximoCursor, carregandoMais = false)
                }
            } catch (e: ErroApi) {
                _estado.update { it.copy(carregandoMais = false, erro = e.message) }
            }
        }
    }
}
