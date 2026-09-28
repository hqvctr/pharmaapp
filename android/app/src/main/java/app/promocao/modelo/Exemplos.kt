package app.promocao.modelo

import java.time.LocalDate
import java.time.LocalTime

/**
 * DADOS DE EXEMPLO. Marcas e lojas fictícias, preços inventados para demonstrar a interface.
 * Nada aqui é oferta real. Os mesmos casos aparecem no protótipo (ux/prototipo.html).
 * A fase 3 substitui este objeto por um repositório que lê a API.
 */
object Exemplos {
    val hoje: LocalDate = LocalDate.of(2026, 9, 28)

    /** Série determinística de 90 dias em torno do normal, sem nunca tocar o menor preço antes de hoje. */
    fun serie(normal: Long, menor: Long, maior: Long, semente: Int = 7): List<PontoPreco> {
        var x = semente.toLong()
        return (89 downTo 1).map { atras ->
            x = (x * 1103515245 + 12345) and 0x7fffffff
            val variacao = ((x % 1000) / 1000.0 - 0.5) * 0.12
            val bruto = (normal * (1 + variacao)).toLong()
            // Um pico antigo (60–55 dias atrás) mostra o maior preço do período.
            val valor = if (atras in 55..60) maior else bruto.coerceIn(menor + 100, maior)
            PontoPreco(hoje.minusDays(atras.toLong()), valor)
        }
    }

    val protetor = OfertaUi(
        id = "ex-protetor",
        nomeCurto = "Protetor Solare FPS 50 Facial",
        embalagem = Embalagem(0.05, UnidadeBase.L, "50 ml"),
        categoria = Categoria.CUIDADOS_PESSOAIS,
        loja = "Drogaria Central",
        precoCentavos = 3990,
        condicao = null,
        prova = ProvaUi(5990, 4290, 6490, 180, serie(5990, 4290, 6490)),
        cobertura = CoberturaUi.EntregaCep(3),
        conferidoEm = LocalTime.of(14, 10),
        nivel = Nivel.EXCEPCIONAL,
        link = "https://exemplo.invalid/protetor",
    )

    val fralda = OfertaUi(
        id = "ex-fralda",
        nomeCurto = "Fralda Bebê Seco G",
        embalagem = Embalagem(34.0, UnidadeBase.UN, "34 unidades"),
        categoria = Categoria.HIGIENE_BEBE,
        loja = "Farmácia Vida",
        precoCentavos = 8070,
        condicao = CondicaoUi.LevePague(3, 2),
        prova = ProvaUi(7990, 6290, 8490, 180, serie(7990, 6290, 8490, 11)),
        cobertura = CoberturaUi.EntregaCep(2),
        conferidoEm = LocalTime.of(13, 55),
        nivel = Nivel.EXCEPCIONAL,
        link = "https://exemplo.invalid/fralda",
    )

    val shampoo = OfertaUi(
        id = "ex-shampoo",
        nomeCurto = "Shampoo Capilar+ Hidratação",
        embalagem = Embalagem(0.4, UnidadeBase.L, "400 ml"),
        categoria = Categoria.CUIDADOS_PESSOAIS,
        loja = "Drogaria Central",
        precoCentavos = 1890,
        condicao = null,
        prova = ProvaUi(2690, 1830, 2890, 94, serie(2690, 1830, 2890, 3).takeLast(89)),
        cobertura = CoberturaUi.EntregaAConfirmar,
        conferidoEm = LocalTime.of(14, 10),
        nivel = Nivel.BOA,
        link = "https://exemplo.invalid/shampoo",
    )

    val hidratante = OfertaUi(
        id = "ex-hidratante",
        nomeCurto = "Hidratante Pele Leve Corporal",
        embalagem = Embalagem(0.4, UnidadeBase.L, "400 ml"),
        categoria = Categoria.CUIDADOS_PESSOAIS,
        loja = "Farmácia Vida",
        precoCentavos = 2490,
        condicao = CondicaoUi.Cartao("Vida Mais"),
        prova = ProvaUi(3490, 2590, 3690, 180, serie(3490, 2590, 3690, 5)),
        cobertura = CoberturaUi.Retirada(1.2),
        conferidoEm = LocalTime.of(13, 55),
        nivel = Nivel.BOA,
        link = "https://exemplo.invalid/hidratante",
    )

    val paracetamol = OfertaUi(
        id = "ex-paracetamol",
        nomeCurto = "Paracetamol 750 mg",
        embalagem = Embalagem(20.0, UnidadeBase.UN, "20 comprimidos"),
        categoria = Categoria.MEDICAMENTOS_ISENTOS,
        loja = "Drogaria Central",
        precoCentavos = 990,
        condicao = null,
        prova = ProvaUi(1450, 1090, 1590, 180, serie(1450, 1090, 1590, 9)),
        cobertura = CoberturaUi.EntregaCep(3),
        conferidoEm = LocalTime.of(14, 10),
        nivel = Nivel.BOA,
        link = "https://exemplo.invalid/paracetamol",
        ehRemedio = true,
    )

    val protetorCaiuMais = protetor.copy(id = "ex-protetor-2", precoCentavos = 3490, precoAnteriorAvisoCentavos = 3990)
    val protetorEncerrado = protetor.copy(
        id = "ex-protetor-fim",
        encerrada = EncerradaUi(hoje, LocalTime.of(16, 40), 5990),
    )
    val protetorMudou = protetor.copy(id = "ex-protetor-mudou", precoMudou = MudancaUi(4490, LocalTime.of(15, 20)))

    val anuncio = AnuncioUi(
        id = "ex-anuncio",
        anunciante = "Mercado Exemplo",
        texto = "Cesta de limpeza com 15% de desconto no app do Mercado Exemplo.",
        link = "https://exemplo.invalid/anuncio",
    )

    val resumo = ResumoDia(precosConferidos = 1284, aprovadas = 2)

    val ofertas = EstadoOfertas.ComOfertas(
        resumo = resumo,
        excepcionais = listOf(protetor, fralda),
        boas = listOf(shampoo, hidratante),
        remedios = listOf(paracetamol),
        anuncio = anuncio,
    )

    val nadaHoje = EstadoOfertas.NadaHoje(ResumoDia(1284, 0), boas = listOf(shampoo), remedios = listOf(paracetamol))

    val avisos = listOf(
        AvisoUi(protetor, hoje, ativa = true),
        AvisoUi(fralda, hoje, ativa = true),
        AvisoUi(protetorEncerrado.copy(nomeCurto = "Sabonete Líquido Suave"), hoje.minusDays(1), ativa = false),
    )

    val preferencias = PreferenciasUi(
        categorias = setOf(Categoria.CUIDADOS_PESSOAIS, Categoria.HIGIENE_BEBE, Categoria.LIMPEZA),
        ceps = listOf("01310100"),
        limiteDiario = 3,
        silencioInicio = LocalTime.of(21, 0),
        silencioFim = LocalTime.of(8, 0),
        avisosNoSistema = true,
        contaEmail = null,
        plano = PlanoUi.Gratuito,
    )

    fun porId(id: String): OfertaUi? =
        (listOf(protetor, fralda, shampoo, hidratante, paracetamol, protetorCaiuMais, protetorEncerrado, protetorMudou) +
            avisos.map { it.oferta }).firstOrNull { it.id == id }
}
