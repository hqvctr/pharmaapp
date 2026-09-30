package br.com.economae.ui

import br.com.economae.dados.CodigoEnviado
import br.com.economae.dados.Configuracao
import br.com.economae.dados.Documento
import br.com.economae.dados.Documentos
import br.com.economae.dados.ErroApi
import br.com.economae.dados.Limites
import br.com.economae.dados.MetodosLogin
import br.com.economae.dados.Notificacoes
import br.com.economae.dados.Oferta
import br.com.economae.dados.PaginaFeed
import br.com.economae.dados.Plano
import br.com.economae.dados.Planos
import br.com.economae.dados.Preferencias
import br.com.economae.dados.PreferenciasEnvio
import br.com.economae.dados.Regiao
import br.com.economae.dados.RepositorioEconomae
import br.com.economae.dados.Rotulo
import br.com.economae.dados.TermosDoUsuario
import br.com.economae.dados.Usuario
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestDispatcher
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.rules.TestWatcher
import org.junit.runner.Description

@OptIn(ExperimentalCoroutinesApi::class)
class RegraDispatcher(val dispatcher: TestDispatcher = UnconfinedTestDispatcher()) : TestWatcher() {
    override fun starting(description: Description) = Dispatchers.setMain(dispatcher)
    override fun finished(description: Description) = Dispatchers.resetMain()
}

val configuracaoTeste = Configuracao(
    nome = "economae",
    documentos = Documentos(Documento("v1"), Documento("v1")),
    categorias = listOf(Rotulo("fraldas_lencos", "Fraldas e lenços"), Rotulo("alimentacao_infantil", "Alimentação infantil")),
    regiao = Regiao("Estado de São Paulo"),
    planos = Planos(Plano(1), Plano(3)),
    limiteDiarioMaximo = 10,
    tamanhosFralda = listOf(Rotulo("M", "M"), Rotulo("G", "G")),
    login = MetodosLogin(email = true, google = true),
)

fun usuarioTeste(termosPendentes: Boolean = false, consentiu: Boolean = false) = Usuario(
    id = "u1",
    email = "ana@exemplo.com",
    plano = "gratuito",
    limites = Limites(1),
    termos = TermosDoUsuario(versaoVigente = "v1", versaoAceita = if (termosPendentes) null else "v1", pendente = termosPendentes),
    notificacoes = Notificacoes(consentidas = consentiu),
)

/** Dublê do repositório: estado em memória e ganchos para o teste mudar o que o "servidor" responde. */
class RepositorioDuble : RepositorioEconomae {
    val token = MutableStateFlow<String?>(null)
    override val logado = MutableStateFlow(false)
    var usuario = usuarioTeste()
    var preferencias = Preferencias(emptyList(), emptyList())
    var codigoCorreto = "123456"
    var falhaNaRede = false
    val chamadas = mutableListOf<String>()
    val dispositivos = mutableListOf<String>()

    private fun rede() {
        if (falhaNaRede) throw ErroApi(0, ErroApi.SEM_CONEXAO, "Sem conexão com o servidor. Tente de novo.")
    }

    override suspend fun configuracao() = configuracaoTeste.also { rede() }
    override suspend fun pedirCodigo(email: String): CodigoEnviado {
        rede(); chamadas += "codigo:$email"; return CodigoEnviado(10)
    }
    override suspend fun entrarComCodigo(email: String, codigo: String): Usuario {
        rede()
        if (codigo != codigoCorreto) throw ErroApi(401, "CODIGO_INVALIDO", "Código inválido ou expirado.")
        logado.value = true
        return usuario
    }
    override suspend fun entrarComGoogle(idToken: String): Usuario {
        rede(); logado.value = true; chamadas += "google:$idToken"; return usuario
    }
    override suspend fun usuario() = usuario.also { rede() }
    override suspend fun aceitarTermos(versao: String): Usuario {
        rede(); usuario = usuario.copy(termos = usuario.termos.copy(versaoAceita = versao, pendente = false)); return usuario
    }
    override suspend fun definirNotificacoes(consentidas: Boolean): Usuario {
        rede(); usuario = usuario.copy(notificacoes = Notificacoes(consentidas)); return usuario
    }
    override suspend fun preferencias() = preferencias.also { rede() }
    override suspend fun salvarPreferencias(p: PreferenciasEnvio): Preferencias {
        rede()
        preferencias = Preferencias(p.categorias, p.ceps, p.tamanhosFralda, p.silencio, p.limiteDiario, completas = true)
        chamadas += "prefs"
        return preferencias
    }
    override suspend fun feed(cursor: String?, categoria: String?) = PaginaFeed(emptyList<Oferta>()).also { rede() }
    override suspend fun oferta(id: String): Oferta = throw ErroApi(404, "OFERTA_NAO_ENCONTRADA", "Oferta não encontrada.")
    override suspend fun registrarDispositivo(tokenFcm: String) {
        rede(); dispositivos += tokenFcm
    }
    override suspend fun registrarAbertura(entregaId: String) = Unit
    override suspend fun sair() {
        logado.value = false
    }
    override suspend fun excluirConta() {
        logado.value = false
    }
}
