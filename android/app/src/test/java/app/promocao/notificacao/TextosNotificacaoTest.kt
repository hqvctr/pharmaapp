package app.promocao.notificacao

import app.promocao.modelo.CondicaoUi
import app.promocao.modelo.Exemplos
import app.promocao.modelo.OfertaUi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** Os modelos vêm do strings.xml real: o teste quebra se alguém mudar o texto e estourar o limite. */
class TextosNotificacaoTest {

    private val m: ModelosNotificacao = run {
        val arquivo = listOf("src/main/res/values/strings.xml", "app/src/main/res/values/strings.xml").map(::File).first { it.exists() }
        val doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(arquivo)
        val nos = doc.getElementsByTagName("string")
        val s = (0 until nos.length).associate { i ->
            val e = nos.item(i)
            e.attributes.getNamedItem("name").nodeValue to e.textContent
        }
        ModelosNotificacao(
            titulo = s.getValue("notif_titulo"),
            tituloLeve = s.getValue("notif_titulo_condicao_leve"),
            menorMeses = s.getValue("notif_texto_menor_meses"),
            menorDias = s.getValue("notif_texto_menor_dias"),
            menorCurto = s.getValue("notif_texto_menor_curto"),
            abaixoNormal = s.getValue("notif_texto_abaixo_normal"),
            quaseMenor = s.getValue("notif_texto_quase_menor"),
            levePague = s.getValue("notif_texto_leve_pague"),
            cartao = s.getValue("notif_texto_cartao"),
            cartaoCurto = s.getValue("notif_texto_cartao_curto"),
            appLoja = s.getValue("notif_texto_app_loja"),
            quantidade = s.getValue("notif_texto_quantidade"),
            caiuMais = s.getValue("notif_texto_caiu_mais"),
            retirada = s.getValue("notif_texto_retirada"),
        )
    }

    private val todas = listOf(
        Exemplos.protetor, Exemplos.fralda, Exemplos.shampoo, Exemplos.hidratante, Exemplos.protetorCaiuMais,
        Exemplos.hidratante.copy(condicao = CondicaoUi.Cartao("Programa de Fidelidade Muito Comprido")),
        Exemplos.protetor.copy(condicao = CondicaoUi.AppDaLoja),
        Exemplos.protetor.copy(condicao = CondicaoUi.QuantidadeMinima(2)),
        Exemplos.protetor.copy(nomeCurto = "Protetor Solar Facial Com Cor Toque Seco Antioleosidade FPS 70"),
        Exemplos.protetor.copy(precoCentavos = 123456, prova = Exemplos.protetor.prova.copy(precoNormalCentavos = 999999, menorPeriodoCentavos = 200000)),
    )

    @Test
    fun `titulo nunca passa de 30 e sempre comeca pelo preco`() {
        todas.forEach { o ->
            val t = TextosNotificacao.titulo(o, m)
            assertTrue("título com ${t.length}: $t", t.length <= TextosNotificacao.MAX_TITULO)
            assertTrue("título sem preço no início: $t", t.startsWith("R$ "))
        }
    }

    @Test
    fun `texto nunca passa de 40`() {
        todas.forEach { o ->
            val t = TextosNotificacao.texto(o, m)
            assertTrue("texto com ${t.length}: $t", t.length <= TextosNotificacao.MAX_TEXTO)
        }
    }

    @Test
    fun `variacoes N1 a N6 da proposta`() {
        assertEquals("R$ 39,90 · Protetor Solare…", TextosNotificacao.titulo(Exemplos.protetor, m))
        assertEquals("Menor preço em 6 meses: R$ 20,00 a menos", TextosNotificacao.texto(Exemplos.protetor, m))
        assertEquals("R$ 161,40 por 3 · Fralda Bebê…", TextosNotificacao.titulo(Exemplos.fralda, m))
        assertEquals("Leve 3, pague 2 · economia de R$ 78,30", TextosNotificacao.texto(Exemplos.fralda, m))
        assertEquals("Com cartão Vida Mais · R$ 10,00 a menos", TextosNotificacao.texto(Exemplos.hidratante, m))
        assertEquals("Caiu mais: era R$ 39,90 no último aviso", TextosNotificacao.texto(Exemplos.protetorCaiuMais, m))
        val retirada = Exemplos.protetor.copy(cobertura = app.promocao.modelo.CoberturaUi.Retirada(1.2))
        assertEquals("Retire a 1,2 km · R$ 20,00 a menos", TextosNotificacao.texto(retirada, m))
    }

    @Test
    fun `condicao vem antes da prova no texto`() {
        val t = TextosNotificacao.texto(Exemplos.fralda, m)
        assertTrue(t.startsWith("Leve 3, pague 2"))
    }

    @Test
    fun `programa com nome longo cai no texto generico sem perder a condicao`() {
        val o = Exemplos.hidratante.copy(condicao = CondicaoUi.Cartao("Programa de Fidelidade Muito Comprido"))
        assertEquals("Só com cartão da loja · R$ 10,00 a menos", TextosNotificacao.texto(o, m))
    }

    @Test
    fun `historico curto nao promete 6 meses`() {
        val curto: OfertaUi = Exemplos.protetor.copy(prova = Exemplos.protetor.prova.copy(diasMedidos = 94))
        assertEquals("Menor preço em 94 dias: R$ 20,00 a menos", TextosNotificacao.texto(curto, m))
        // Quase o menor com histórico curto: só a economia, sem período.
        assertEquals("R$ 8,00 abaixo do normal da loja", TextosNotificacao.texto(Exemplos.shampoo, m))
    }

    @Test
    fun `economia grande usa modelo mais curto`() {
        val caro = Exemplos.protetor.copy(precoCentavos = 29990, prova = Exemplos.protetor.prova.copy(precoNormalCentavos = 45990, menorPeriodoCentavos = 31990))
        assertEquals("Menor em 6 meses: R$ 160,00 a menos", TextosNotificacao.texto(caro, m))
    }
}
