package br.com.economae.dados

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map

/** Tudo que as telas pedem ao backend. Interface para os ViewModels serem testados com dublês. */
interface RepositorioEconomae {
    /** true enquanto houver token guardado; vira false no logout ou quando o servidor recusa a sessão. */
    val logado: Flow<Boolean>
    suspend fun configuracao(): Configuracao
    suspend fun pedirCodigo(email: String): CodigoEnviado
    suspend fun entrarComCodigo(email: String, codigo: String): Usuario
    suspend fun entrarComGoogle(idToken: String): Usuario
    suspend fun usuario(): Usuario
    suspend fun aceitarTermos(versao: String): Usuario
    suspend fun definirNotificacoes(consentidas: Boolean): Usuario
    suspend fun preferencias(): Preferencias
    suspend fun salvarPreferencias(p: PreferenciasEnvio): Preferencias
    suspend fun feed(cursor: String?, categoria: String?): PaginaFeed
    suspend fun oferta(id: String): Oferta
    suspend fun registrarDispositivo(tokenFcm: String)
    suspend fun registrarAbertura(entregaId: String)
    suspend fun sair()
    suspend fun excluirConta()
}

class RepositorioRemoto(
    private val api: ApiEconomae,
    private val sessao: ArmazemSessao,
) : RepositorioEconomae {
    private var configuracaoEmCache: Configuracao? = null

    override val logado: Flow<Boolean> = sessao.token.map { it != null }.distinctUntilChanged()

    /** Sessão recusada pelo servidor: apaga o token e a tela volta para a entrada. */
    private suspend fun <T> autenticada(bloco: suspend () -> T): T = try {
        bloco()
    } catch (e: ErroApi) {
        if (e.status == 401) sessao.limpar()
        throw e
    }

    override suspend fun configuracao(): Configuracao =
        configuracaoEmCache ?: api.configuracao().also { configuracaoEmCache = it }

    override suspend fun pedirCodigo(email: String) = api.pedirCodigo(email.trim())

    override suspend fun entrarComCodigo(email: String, codigo: String): Usuario {
        val s = api.verificarCodigo(email.trim(), codigo.trim())
        sessao.salvar(s.token)
        return s.usuario
    }

    override suspend fun entrarComGoogle(idToken: String): Usuario {
        val s = api.entrarComGoogle(idToken)
        sessao.salvar(s.token)
        return s.usuario
    }

    override suspend fun usuario() = autenticada { api.usuario() }
    override suspend fun aceitarTermos(versao: String) = autenticada { api.aceitarTermos(versao) }
    override suspend fun definirNotificacoes(consentidas: Boolean) = autenticada { api.definirNotificacoes(consentidas) }
    override suspend fun preferencias() = autenticada { api.preferencias() }
    override suspend fun salvarPreferencias(p: PreferenciasEnvio) = autenticada { api.salvarPreferencias(p) }
    override suspend fun feed(cursor: String?, categoria: String?) = autenticada { api.feed(cursor, categoria) }
    override suspend fun oferta(id: String) = autenticada { api.oferta(id) }
    override suspend fun registrarDispositivo(tokenFcm: String) = autenticada { api.registrarDispositivo(tokenFcm) }
    override suspend fun registrarAbertura(entregaId: String) = autenticada { api.registrarAbertura(entregaId) }

    /** Sai mesmo sem rede: o token local é apagado de qualquer jeito. */
    override suspend fun sair() {
        try {
            api.sair()
        } catch (_: ErroApi) {
        } finally {
            sessao.limpar()
        }
    }

    override suspend fun excluirConta() {
        autenticada { api.excluirConta() }
        sessao.limpar()
    }
}
