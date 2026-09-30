package br.com.economae.dados

import kotlinx.serialization.Serializable

// Espelho do contrato v1 (backend/openapi/v1.json). Campos de enum ficam como String: a v1 pode
// ganhar valores novos (decisão 49) e o app trata o desconhecido como o caso genérico.

@Serializable data class Documento(val versao: String, val url: String? = null)
@Serializable data class Documentos(val termos: Documento, val privacidade: Documento)
@Serializable data class Rotulo(val id: String, val nome: String)
@Serializable data class Plano(val maxCeps: Int)
@Serializable data class Planos(val gratuito: Plano, val premium: Plano)
@Serializable data class Regiao(val nome: String)
@Serializable data class MetodosLogin(val email: Boolean, val google: Boolean)

@Serializable
data class Configuracao(
    val nome: String,
    val documentos: Documentos,
    val categorias: List<Rotulo>,
    val regiao: Regiao,
    val planos: Planos,
    val limiteDiarioMaximo: Int,
    val tamanhosFralda: List<Rotulo> = emptyList(),
    val login: MetodosLogin,
)

@Serializable data class Limites(val maxCeps: Int)
@Serializable data class TermosDoUsuario(val versaoVigente: String, val versaoAceita: String? = null, val aceitosEm: String? = null, val pendente: Boolean)
@Serializable data class Notificacoes(val consentidas: Boolean, val consentidasEm: String? = null)

@Serializable
data class Usuario(
    val id: String,
    val email: String,
    val plano: String,
    val limites: Limites,
    val termos: TermosDoUsuario,
    val notificacoes: Notificacoes,
)

@Serializable data class Sessao(val token: String, val expiraEm: String, val novoUsuario: Boolean, val usuario: Usuario)
@Serializable data class CodigoEnviado(val validadeMinutos: Int)
@Serializable data class Silencio(val inicio: String, val fim: String)

@Serializable
data class Preferencias(
    val categorias: List<String>,
    val ceps: List<String>,
    val tamanhosFralda: List<String> = emptyList(),
    val silencio: Silencio? = null,
    val limiteDiario: Int? = null,
    val completas: Boolean = false,
)

/** Corpo do PUT: substituição completa, sem o campo calculado "completas". */
@Serializable
data class PreferenciasEnvio(
    val categorias: List<String>,
    val ceps: List<String>,
    val tamanhosFralda: List<String>,
    val silencio: Silencio?,
    val limiteDiario: Int?,
)

@Serializable data class Embalagem(val quantidade: Double, val unidade: String)
@Serializable data class Produto(val nome: String, val marca: String? = null, val categoria: String, val embalagem: Embalagem, val tamanhoFralda: String? = null)
@Serializable data class Loja(val id: String, val nome: String, val rede: String, val tipo: String)
@Serializable data class PrecoPorUnidade(val centavos: Double, val unidade: String)
@Serializable data class Frete(val status: String, val centavos: Long? = null)
@Serializable data class PontoHistorico(val dia: String, val precoEquivalenteCentavos: Long)

/** Item do feed e detalhe da oferta: o detalhe só acrescenta ativa, link e histórico. */
@Serializable
data class Oferta(
    val ofertaId: String,
    val produto: Produto,
    val loja: Loja,
    val precoCentavos: Long,
    val precoEfetivoCentavos: Long,
    val precoReferenciaCentavos: Long,
    val queda: Double,
    val precoPorUnidade: PrecoPorUnidade,
    val condicao: String? = null,
    val frete: Frete,
    val validaAte: String? = null,
    val decisao: String,
    val score: Int,
    val avisos: List<String> = emptyList(),
    val imagemUrl: String? = null,
    val linkAfiliado: Boolean,
    val alertadaEm: String,
    val coletadaEm: String,
    val prazoEntregaDias: Int? = null,
    val ativa: Boolean = true,
    val link: String? = null,
    val historico: List<PontoHistorico> = emptyList(),
)

@Serializable data class PaginaFeed(val itens: List<Oferta>, val proximoCursor: String? = null)

@Serializable internal data class CorpoErro(val erro: DetalheErro)
@Serializable internal data class DetalheErro(val codigo: String, val mensagem: String)
@Serializable internal data class PedidoCodigo(val email: String)
@Serializable internal data class VerificacaoCodigo(val email: String, val codigo: String)
@Serializable internal data class LoginGoogle(val idToken: String)
@Serializable internal data class AceiteTermos(val versao: String)
@Serializable internal data class Consentimento(val consentidas: Boolean)
@Serializable internal data class RegistroDispositivo(val token: String, val plataforma: String = "android")
