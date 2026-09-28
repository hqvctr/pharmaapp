package app.promocao.modelo

import java.time.LocalDate
import java.time.LocalTime

// Modelo de interface. Espelha o que a API da fase 3 precisa entregar (ux/PROPOSTA_UX.md, seção 11).
// Todo preço está em centavos e por EMBALAGEM (a API converte do preço por unidade do motor).

enum class Categoria(val chave: String) {
    MERCEARIA("mercearia"),
    PERECIVEIS("pereciveis"),
    HIGIENE_INTIMA("higiene_intima"),
    MAQUIAGEM("maquiagem"),
    HIGIENE_BEBE("higiene_bebe"),
    LIMPEZA("limpeza"),
    CUIDADOS_PESSOAIS("cuidados_pessoais"),
    MEDICAMENTOS_ISENTOS("medicamentos_isentos"),
}

/** Mesmas unidades base do motor (backend/src/curadoria/tipos.ts). */
enum class UnidadeBase { KG, L, UN }

/** Conteúdo da embalagem na unidade base, e o texto como a loja escreve ("50 ml"). */
data class Embalagem(val quantidade: Double, val unidade: UnidadeBase, val rotulo: String)

/** Condição da oferta (backend `Condicao`). Aparece sempre antes do preço. */
sealed interface CondicaoUi {
    data class LevePague(val leve: Int, val pague: Int) : CondicaoUi
    data class QuantidadeMinima(val quantidade: Int) : CondicaoUi
    data class Cartao(val programa: String) : CondicaoUi
    data object AppDaLoja : CondicaoUi
}

sealed interface CoberturaUi {
    data class EntregaCep(val prazoDias: Int) : CoberturaUi
    data object EntregaAConfirmar : CoberturaUi
    data class Retirada(val distanciaKm: Double) : CoberturaUi
}

/** EXCEPCIONAL = decisão `notificar`. BOA = `somente_feed` ou `aguardar_aprovacao` (S-26). */
enum class Nivel { EXCEPCIONAL, BOA }

data class PontoPreco(val dia: LocalDate, val centavos: Long)

/** A prova: o que o app mediu, não o que a loja anunciou. Valores por embalagem. */
data class ProvaUi(
    /** Mediana dos últimos 30 dias nesta loja ("preço normal nesta loja"). */
    val precoNormalCentavos: Long,
    /** Menor preço do período medido, antes de hoje (piso de até 180 dias). */
    val menorPeriodoCentavos: Long,
    /** Maior preço do período medido. */
    val maiorPeriodoCentavos: Long,
    /** Dias com observação no período (até 180). */
    val diasMedidos: Int,
    /** Menor preço de cada dia, últimos 90 dias, do mais antigo ao mais novo. */
    val serieDiaria: List<PontoPreco>,
)

data class EncerradaUi(val dia: LocalDate, val hora: LocalTime, val precoVoltouCentavos: Long)
data class MudancaUi(val novoPrecoCentavos: Long, val hora: LocalTime)

data class OfertaUi(
    val id: String,
    val nomeCurto: String,
    val embalagem: Embalagem,
    val categoria: Categoria,
    val loja: String,
    /** Preço de UMA embalagem, como a loja cobra sob a condição. */
    val precoCentavos: Long,
    val condicao: CondicaoUi?,
    val prova: ProvaUi,
    val cobertura: CoberturaUi,
    val conferidoEm: LocalTime,
    val nivel: Nivel,
    val link: String,
    val imagemUrl: String? = null,
    /** Preço efetivo do último aviso desta família nesta loja, quando a deduplicação liberou por queda adicional. */
    val precoAnteriorAvisoCentavos: Long? = null,
    val encerrada: EncerradaUi? = null,
    val precoMudou: MudancaUi? = null,
    val ehRemedio: Boolean = false,
) {
    /** Embalagens que a condição obriga a comprar (1 se incondicional). Igual a `embalagensNaCompraMinima` do motor. */
    val embalagensCompraMinima: Int
        get() = when (condicao) {
            is CondicaoUi.LevePague -> condicao.leve
            is CondicaoUi.QuantidadeMinima -> condicao.quantidade
            else -> 1
        }

    /** O que sai do bolso na compra mínima. */
    val totalCompraMinimaCentavos: Long
        get() = when (condicao) {
            is CondicaoUi.LevePague -> precoCentavos * condicao.pague
            is CondicaoUi.QuantidadeMinima -> precoCentavos * condicao.quantidade
            else -> precoCentavos
        }

    /** Preço efetivo por embalagem: o número comparável com o preço normal. */
    val precoEfetivoCentavos: Long
        get() = Math.round(totalCompraMinimaCentavos.toDouble() / embalagensCompraMinima)

    /** Economia na compra mínima, como o motor calcula (`economiaCentavos`). */
    val economiaCentavos: Long
        get() = (prova.precoNormalCentavos - precoEfetivoCentavos) * embalagensCompraMinima

    val quedaFracao: Double
        get() = (prova.precoNormalCentavos - precoEfetivoCentavos).toDouble() / prova.precoNormalCentavos
}

data class AnuncioUi(val id: String, val anunciante: String, val texto: String, val link: String)

/** Números do dia para o estado "nada passou no teste" (U06). */
data class ResumoDia(val precosConferidos: Int, val aprovadas: Int)

sealed interface EstadoOfertas {
    data object Carregando : EstadoOfertas
    data class ComOfertas(
        val resumo: ResumoDia,
        val excepcionais: List<OfertaUi>,
        val boas: List<OfertaUi>,
        val remedios: List<OfertaUi>,
        val anuncio: AnuncioUi? = null,
        /** Não nulo quando é cópia salva exibida sem internet. */
        val salvasDesde: LocalTime? = null,
    ) : EstadoOfertas
    data class NadaHoje(val resumo: ResumoDia, val boas: List<OfertaUi>, val remedios: List<OfertaUi>) : EstadoOfertas
    data class Medindo(val diasFeitos: Int, val diasNecessarios: Int) : EstadoOfertas
    data object SemCategoria : EstadoOfertas
    data object SemCep : EstadoOfertas
    data class ForaDaRegiao(val cep: String) : EstadoOfertas
    data class Erro(val salvas: ComOfertas?) : EstadoOfertas
}

data class AvisoUi(val oferta: OfertaUi, val dia: LocalDate, val ativa: Boolean)

sealed interface EstadoAvisos {
    data object Carregando : EstadoAvisos
    data class Lista(val avisos: List<AvisoUi>) : EstadoAvisos
    data object Vazio : EstadoAvisos
    data object Erro : EstadoAvisos
}

sealed interface EstadoDetalhe {
    data object Carregando : EstadoDetalhe
    data class Pronto(val oferta: OfertaUi, val offline: Boolean = false) : EstadoDetalhe
    data class Erro(val parcial: OfertaUi?) : EstadoDetalhe
}

sealed interface PlanoUi {
    data object Gratuito : PlanoUi
    data class Premium(val ate: LocalDate) : PlanoUi
    data object Pendente : PlanoUi
    data object Expirado : PlanoUi
}

data class PreferenciasUi(
    val categorias: Set<Categoria>,
    val ceps: List<String>,
    /** Nulo = sem limite. */
    val limiteDiario: Int?,
    val silencioInicio: LocalTime?,
    val silencioFim: LocalTime?,
    val avisosNoSistema: Boolean,
    val contaEmail: String?,
    val plano: PlanoUi,
)
