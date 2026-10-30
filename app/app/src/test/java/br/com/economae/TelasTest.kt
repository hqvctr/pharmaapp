package br.com.economae

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.activity.ComponentActivity
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToKey
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeDown
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.printToString
import androidx.test.core.app.ApplicationProvider
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.ServerSocket
import java.net.URI

/**
 * Desenha as telas novas (Início, Categorias, página da categoria, Favoritos, detalhe) na JVM com o Robolectric, falando com um servidor
 * falso local, e confere o que aparece. Serve para pegar crash de medição e texto que sumiu sem aparelho; as imagens saem em
 * `app/build/telas/` para olhar. A conferência real continua sendo no celular.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w390dp-h844dp-port-xxhdpi")
class TelasTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()

    private lateinit var servidor: MiniServidor
    private val pedidos = mutableListOf<String>()
    private var seguidoAgora = false
    /** CEPs que o servidor falso devolve em /v1/preferencias (o convite da localização só aparece sem CEP). */
    private var cepsGuardados = """["14020260"]"""
    private lateinit var m: Modelo
    private val saida = File("build/telas").also { it.mkdirs() }

    private val categorias = JSONArray(
        """[
        {"slug":"gestacao","rotulo":"Gestação","subcategorias":[{"slug":"enxoval","rotulo":"Enxoval"},{"slug":"roupas","rotulo":"Roupas"},{"slug":"cuidados","rotulo":"Cuidados"}]},
        {"slug":"mamae","rotulo":"Mamãe","subcategorias":[{"slug":"amamentacao","rotulo":"Amamentação"},{"slug":"pos_parto","rotulo":"Pós-parto"}]},
        {"slug":"bebe","rotulo":"Bebê","subcategorias":[{"slug":"fraldas","rotulo":"Fraldas"},{"slug":"alimentacao","rotulo":"Alimentação"},{"slug":"higiene","rotulo":"Higiene"}]},
        {"slug":"infantil","rotulo":"Infantil","subcategorias":[{"slug":"roupas","rotulo":"Roupas"},{"slug":"brinquedos","rotulo":"Brinquedos"}]}]""",
    )

    private fun produto(i: Int, categoria: String, seguido: Boolean = false, preco: Int? = 5990 + i * 1000): JSONObject = JSONObject()
        .put("id", "p$i").put("nome", "Fralda descartável premium tamanho M pacote $i").put("marca", JSONObject().put("chave", "m").put("nome", "Marca"))
        .put("categoria", categoria).put("subcategoria", JSONObject.NULL).put("gtin", JSONObject.NULL)
        .put("embalagem", JSONObject().put("quantidade", 60).put("unidade", "un")).put("imagem_url", "http://127.0.0.1:${servidor.porta}/img/$i.png")
        .put("menor_preco_centavos", preco ?: JSONObject.NULL).put("seguido", seguido)
        // Campos do cartão (API 1.3.0): o 1 tem queda e duas lojas; o 2 está no menor preço em 180 dias.
        .put("menor_preco_por_unidade_centavos", if (preco == null) JSONObject.NULL else preco / 60.0).put("lojas", if (preco == null) 0 else if (i % 10 == 1) 2 else 1)
        .put("queda", if (i % 10 == 1) 0.32 else JSONObject.NULL).put("preco_referencia_centavos", if (i % 10 == 1) 8990 else JSONObject.NULL)
        .put("alerta_id", JSONObject.NULL).put("menor_preco_180d", i % 10 == 2).put("preco_ao_seguir_centavos", JSONObject.NULL)

    @Before fun subir() {
        servidor = MiniServidor { metodo, alvo ->
            val uri = URI(alvo)
            val caminho = uri.rawPath
            val q = uri.rawQuery ?: ""
            pedidos += "$metodo $alvo"
            val json = { status: Int, c: String -> RespostaFalsa(status, "application/json", c.toByteArray()) }
            when {
                caminho.startsWith("/img/") -> {
                    val b = Bitmap.createBitmap(300, 300, Bitmap.Config.ARGB_8888)
                    Canvas(b).apply {
                        drawColor(0xFFF3A6C2.toInt())
                        drawCircle(150f, 150f, 90f, Paint().apply { color = 0xFF58C9BE.toInt() })
                    }
                    val bytes = ByteArrayOutputStream().also { b.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
                    RespostaFalsa(200, "image/png", bytes)
                }
                caminho == "/v1/alertas" -> json(200, """{"itens":[],"proximo_cursor":null,"vazio_por":null}""")
                caminho == "/v1/inicio" -> json(200, JSONObject().put("cep", "14020260").put("fileiras", JSONArray(listOf(
                    JSONObject().put("id", "baixaram_de_preco").put("titulo", "Baixaram de preço").put("itens", JSONArray(listOf(produto(1, "bebe"))))
                        .put("ver_todas", JSONObject().put("ordem", "maior_queda").put("com_queda", true)),
                    JSONObject().put("id", "novidades").put("titulo", "Novidades nas lojas").put("itens", JSONArray(listOf(produto(2, "bebe"), produto(3, "bebe"))))
                        .put("ver_todas", JSONObject().put("ordem", "mais_novos")),
                ))).toString())
                caminho == "/v1/categorias" -> json(200, JSONObject().put("categorias", JSONArray(listOf(
                    JSONObject().put("slug", "gestacao").put("produtos", 0), JSONObject().put("slug", "mamae").put("produtos", 1),
                    JSONObject().put("slug", "bebe").put("produtos", 12), JSONObject().put("slug", "infantil").put("produtos", 3),
                ))).toString())
                caminho == "/v1/preferencias" -> json(200, """{"categorias":[],"ceps":$cepsGuardados,"silencio":null,"limite_diario":null}""")
                caminho == "/v1/produtos" && q.contains("ids=") -> json(200, JSONObject().put("itens", JSONArray(listOf(produto(7, "bebe")))).put("proximo_cursor", JSONObject.NULL).toString())
                caminho == "/v1/produtos" -> {
                    val cat = Regex("categoria=(\\w+)").find(q)?.groupValues?.get(1) ?: "bebe"
                    // Segunda página repete dois produtos da primeira (o catálogo mudou no meio) e traz um novo: a lista não pode quebrar.
                    val base = if (cat == "bebe") 0 else 10
                    val itens = JSONArray((if (q.contains("cursor=")) listOf(3, 4, 5) else listOf(1, 2, 3, 4)).map { produto(it + base, cat) })
                    val cursor = if (q.contains("cursor=")) JSONObject.NULL else "proxima"
                    val corpo = JSONObject().put("itens", itens).put("proximo_cursor", cursor)
                    if (q.contains("facetas=true") && !q.contains("cursor=")) corpo.put("facetas", JSONObject()
                        .put("lojas", JSONArray(listOf(JSONObject().put("id", "loja-1").put("nome", "Drogasmil (online)").put("quantidade", 3))))
                        .put("marcas", JSONArray(listOf(JSONObject().put("chave", "m").put("nome", "Marca").put("quantidade", 4)))))
                    json(200, corpo.toString())
                }
                caminho == "/v1/seguidos" -> json(200, JSONObject().put("proximo_cursor", JSONObject.NULL).put("itens", JSONArray(listOf(
                    JSONObject().put("produto", produto(1, "bebe", true).also { it.remove("seguido"); it.remove("menor_preco_centavos") }).put("avisos", JSONObject()).put("menor_preco_centavos", 5990),
                    JSONObject().put("produto", produto(2, "bebe", true).also { it.remove("seguido"); it.remove("menor_preco_centavos") }).put("avisos", JSONObject()).put("menor_preco_centavos", JSONObject.NULL),
                ))).toString())
                caminho.startsWith("/v1/seguidos/") -> { seguidoAgora = metodo == "PUT"; if (seguidoAgora) json(201, "{}") else RespostaFalsa(204, "application/json", ByteArray(0)) }
                caminho.endsWith("/historico") -> json(200, """{"series":[]}""")
                caminho.startsWith("/v1/produtos/") -> json(200, produto(1, "bebe").also { p ->
                    p.remove("menor_preco_centavos"); p.remove("seguido")
                    p.put("imagens", JSONArray((1..3).map { "http://127.0.0.1:${servidor.porta}/img/$it.png" })).put("historico_desde", JSONObject.NULL).put("seguimento", if (seguidoAgora) JSONObject() else JSONObject.NULL)
                    p.put("ofertas", JSONArray(listOf(
                        JSONObject().put("preco_centavos", 5990).put("rotulo_condicao", JSONObject.NULL).put("frete", JSONObject().put("status", "a_confirmar").put("centavos", JSONObject.NULL))
                            .put("coletada_em", "2026-10-29T12:00:00Z").put("link", "https://loja.test/a").put("alerta_id", JSONObject.NULL).put("loja", JSONObject().put("nome", "Drogasmil (online)")),
                        JSONObject().put("preco_centavos", 8790).put("rotulo_condicao", JSONObject.NULL).put("frete", JSONObject().put("status", "conhecido").put("centavos", 1290))
                            .put("coletada_em", "2026-10-29T12:00:00Z").put("link", "https://loja.test/b").put("alerta_id", JSONObject.NULL).put("loja", JSONObject().put("nome", "PromoFarma (online)")),
                    )))
                }.toString())
                else -> json(404, """{"codigo":"nao_encontrado","mensagem":"não"}""")
            }
        }
        m = Modelo(ApplicationProvider.getApplicationContext())
        m.arm.servidor = "http://127.0.0.1:${servidor.porta}"
        m.arm.access = "token"
        m.config = JSONObject().put("categorias", categorias).put("nome_app", "economae")
    }

    @After fun parar() = servidor.parar()

    private fun mostrar(conteudo: @androidx.compose.runtime.Composable () -> Unit) = rule.setContent {
        TemaEconomae { Surface(Modifier.fillMaxSize()) { Box(Modifier.safeDrawingPadding()) { conteudo() } } }
    }

    /** Espera o texto aparecer; se não aparecer, guarda uma imagem da tela (`falha-*.png`) e os pedidos feitos, para entender o porquê. */
    private fun esperar(texto: String) {
        try { rule.waitUntil(15_000) { rule.onAllNodesWithTextExists(texto) } } catch (e: Throwable) {
            foto("falha-" + texto.take(20).replace(Regex("[^A-Za-z0-9]"), "_"))
            val arvore = try { rule.onRoot().printToString(maxDepth = 12).take(2500) } catch (x: Throwable) { "(sem árvore: ${x.message})" }
            throw AssertionError("não apareceu \"$texto\"; pedidos: $pedidos\n$arvore", e)
        }
    }

    private fun androidx.compose.ui.test.junit4.ComposeContentTestRule.onAllNodesWithTextExists(t: String) =
        onAllNodes(androidx.compose.ui.test.hasText(t, substring = true)).fetchSemanticsNodes().isNotEmpty()

    /** Desenha a janela inteira num bitmap. (`captureToImage` do Compose espera um quadro que o Robolectric não entrega com o laço pausado.) */
    /** Desenha a janela inteira num bitmap (`captureToImage` do Compose espera um quadro que o Robolectric não entrega com o laço pausado). */
    private fun foto(nome: String) {
        Thread.sleep(800) // dá tempo ao Coil de baixar as fotos
        rule.waitForIdle()
        org.robolectric.shadows.ShadowLooper.idleMainLooper()
        rule.waitForIdle()
        val v = rule.activity.window.decorView
        val b = Bitmap.createBitmap(v.width, v.height, Bitmap.Config.ARGB_8888)
        v.draw(Canvas(b))
        File(saida, "$nome.png").outputStream().use { b.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    @Test fun `inicio mostra cep, categorias, fileiras, vistos e a grade para voce`() {
        m.arm.vistos = listOf("p7")
        mostrar { AbaInicio(m) }
        esperar("Entregando em 14020-260")
        listOf("Gestação", "Infantil", "Baixaram de preço", "-32%", "em 2 lojas", "antes").forEach { esperar(it) }
        assertTrue(pedidos.any { it.contains("ordem=para_voce") })
        assertTrue(pedidos.any { it.contains("ids=p7") })
        foto("01-inicio")
        // A grade só desenha o que está na tela: rola até cada parte.
        val grade = rule.onNode(androidx.compose.ui.test.hasScrollToKeyAction() and androidx.compose.ui.test.SemanticsMatcher.keyIsDefined(androidx.compose.ui.semantics.SemanticsProperties.VerticalScrollAxisRange))
        grade.performScrollToKey("fileira-vistos"); esperar("Vistos recentemente")
        grade.performScrollToKey("fileira-novidades"); esperar("Novidades nas lojas"); esperar("Menor preço em 180 dias")
        grade.performScrollToKey("para-voce"); esperar("Para você")
        foto("01b-inicio-rolado")
        grade.performScrollToKey("fileira-baixaram_de_preco")
        rule.onAllNodes(androidx.compose.ui.test.hasText("Ver todas →"))[0].performClick()
        assertEquals(Tela.Lista("Baixaram de preço", VerTodas(null, null, Ordem.MaiorQueda, Filtros(comQueda = true))), m.tela)
    }

    @Test fun `ver todas abre a lista com a ordem e o filtro da fileira`() {
        mostrar { TelaLista(m, "Baixaram de preço", VerTodas(null, null, Ordem.MaiorQueda, Filtros(comQueda = true))) }
        esperar("Fralda descartável")
        esperar("Com queda de preço")
        assertTrue(pedidos.any { it.contains("ordem=maior_queda") && it.contains("com_queda=true") })
        foto("07-ver-todas")
    }

    @Test fun `categorias abre a pagina da categoria`() {
        mostrar { AbaCategorias(m) }
        esperar("Fraldas, Alimentação e Higiene")
        foto("02-categorias")
        rule.onNodeWithText("Bebê").performClick()
        assertEquals(Tela.Categoria("bebe"), m.tela)
    }

    @Test fun `pagina da categoria lista produtos em grade, filtra por subcategoria, ordena e filtra`() {
        mostrar { TelaCategoria(m, "bebe", null) }
        esperar("Fralda descartável")
        listOf("Todos", "Fraldas", "Alimentação", "Higiene", "Ordenar: Mais novos", "Tudo para o seu bebê").forEach { esperar(it) }
        assertTrue(pedidos.any { it.contains("/v1/produtos?limite=20&categoria=bebe") && it.contains("facetas=true") })
        foto("03-categoria-bebe")
        rule.onNodeWithText("Fraldas").performClick()
        rule.waitUntil(10_000) { pedidos.any { it.contains("subcategoria=fraldas") } }
        rule.onNodeWithText("Ordenar: Mais novos").performClick()
        rule.onNodeWithText("Menor preço").performClick()
        rule.waitUntil(10_000) { pedidos.any { it.contains("ordem=menor_preco&") && it.contains("subcategoria=fraldas") } }
        foto("04-categoria-bebe-fraldas-menor-preco")
        // Folha de filtros: queda e a loja que veio nas facetas.
        rule.onNodeWithContentDescription("Filtros").performClick()
        esperar("Só com queda de preço")
        esperar("Drogasmil (online) (3)")
        rule.onAllNodes(androidx.compose.ui.test.isToggleable())[0].performClick()
        rule.onNodeWithText("Drogasmil (online) (3)").performClick()
        foto("08-filtros")
        rule.onNodeWithText("Ver resultados").performClick()
        rule.waitUntil(10_000) { pedidos.any { it.contains("com_queda=true") && it.contains("loja_id=loja-1") } }
        esperar("Com queda de preço")
    }

    @Test fun `cadastro pede o cep primeiro e mostra o que cada categoria tem na regiao`() {
        m.usuario = JSONObject().put("plano", JSONObject().put("ceps_permitidos", 1))
        mostrar { TelaPreferencias(m) {} }
        esperar("Onde você recebe")
        esperar("12 produtos na sua região")
        esperar("1 produto na sua região")
        esperar("ainda sem ofertas na sua região")
        assertTrue(pedidos.any { it.contains("/v1/categorias?cep=14020260") })
        // Gestação (0 produtos) fica desligada; Bebê, não.
        val caixas = rule.onAllNodes(androidx.compose.ui.test.isToggleable())
        caixas[0].assertIsNotEnabled()
        caixas[2].assertIsEnabled()
        foto("09-cadastro")
    }

    @Test fun `puxar a lista para baixo busca de novo, nos produtos e nos favoritos`() {
        mostrar { TelaLista(m, "Baixaram de preço", VerTodas(null, null, Ordem.MaiorQueda, Filtros(comQueda = true))) }
        esperar("Fralda descartável")
        val lista = { pedidos.count { it.contains("ordem=maior_queda") } }
        val antes = lista()
        rule.onNode(androidx.compose.ui.test.hasScrollAction()).performTouchInput { swipeDown() }
        rule.waitUntil(10_000) { lista() > antes }
        esperar("Fralda descartável") // a lista continua na tela
    }

    @Test fun `favoritos tambem atualizam ao puxar`() {
        mostrar { AbaFavoritos(m) }
        esperar("sem oferta na sua região")
        val seguidos = { pedidos.count { it.startsWith("GET /v1/seguidos") } }
        val antes = seguidos()
        rule.onNode(androidx.compose.ui.test.hasScrollAction()).performTouchInput { swipeDown() }
        rule.waitUntil(10_000) { seguidos() > antes }
        esperar("sem oferta na sua região")
    }

    @Test fun `cadastro sem cep convida a usar a localizacao e agora nao fecha o convite por 7 dias`() {
        cepsGuardados = "[]"
        m.usuario = JSONObject().put("plano", JSONObject().put("ceps_permitidos", 1))
        mostrar { TelaPreferencias(m) {} }
        esperar("Preencher o CEP pela localização?")
        foto("10-convite-localizacao")
        rule.onNodeWithText("Agora não").performClick()
        rule.waitUntil(5_000) { !rule.onAllNodesWithTextExists("Preencher o CEP pela localização?") }
        assertFalse(Convites(ApplicationProvider.getApplicationContext()).pode("localizacao"))
        esperar("Usar minha localização") // o botão continua no campo de CEP
    }

    @Test fun `convite das notificacoes aparece para quem nao consentiu e agora nao fecha por 7 dias`() {
        m.usuario = JSONObject().put("notificacoes_consentidas", false)
        mostrar { ConviteNotificacoes(m) }
        esperar("Avisos de promoção no celular")
        foto("11-convite-notificacoes")
        rule.onNodeWithText("Agora não").performClick()
        rule.waitUntil(5_000) { !rule.onAllNodesWithTextExists("Avisos de promoção no celular") }
        assertFalse(Convites(ApplicationProvider.getApplicationContext()).pode("notificacoes"))
    }

    @Test fun `favoritos mostra foto e preco, e sem oferta diz que nao ha na regiao`() {
        mostrar { AbaFavoritos(m) }
        esperar("sem oferta na sua região")
        esperar("R$")
        foto("05-favoritos")
    }

    @Test fun `tocar na foto abre o visor em tela cheia e o X fecha`() {
        val a = "http://127.0.0.1:${servidor.porta}/img/1.png"
        val b = "http://127.0.0.1:${servidor.porta}/img/2.png"
        mostrar { GaleriaDeFotos(listOf(a, b), "Fralda", androidx.compose.ui.Modifier.fillMaxSize()) }
        // A descrição da foto só existe depois que o Coil baixa e pinta a imagem (antes, o espaço neutro ocupa o lugar).
        rule.waitUntil(15_000) { rule.onAllNodes(androidx.compose.ui.test.hasContentDescription("Fralda, foto 1 de 2")).fetchSemanticsNodes().isNotEmpty() }
        rule.onNodeWithContentDescription("Fralda, foto 1 de 2").performClick()
        esperar("1 / 2")
        rule.onNodeWithContentDescription("Fechar").assertExists()
        rule.onNodeWithContentDescription("Fechar").performClick()
        rule.waitUntil(5_000) { !rule.onAllNodesWithTextExists("1 / 2") }
    }

    @Test fun `detalhe mostra onde comprar com as duas lojas e a economia`() {
        mostrar { TelaProduto(m, "p1") }
        esperar("Onde comprar")
        listOf("Drogasmil (online)", "PromoFarma (online)", "Economize", "a partir de").forEach { esperar(it) }
        foto("06-detalhe")
    }
}

class RespostaFalsa(val status: Int, val tipo: String, val corpo: ByteArray)

/** Servidor HTTP mínimo em soquete puro (o android.jar do teste não traz com.sun.net.httpserver): uma resposta por conexão. */
class MiniServidor(private val tratar: (metodo: String, alvo: String) -> RespostaFalsa) {
    private val soquete = ServerSocket(0, 50, java.net.InetAddress.getByName("127.0.0.1"))
    val porta: Int get() = soquete.localPort
    @Volatile private var ativo = true

    init {
        Thread {
            while (ativo) {
                val c = try { soquete.accept() } catch (e: Exception) { break }
                Thread {
                    c.use {
                        try {
                            val leitor = it.getInputStream().bufferedReader()
                            val linha = leitor.readLine() ?: return@use
                            while (leitor.readLine()?.isNotEmpty() == true) { /* descarta os cabeçalhos */ }
                            val (metodo, alvo) = linha.split(" ").let { p -> p[0] to p[1] }
                            val r = tratar(metodo, alvo)
                            val cabecalho = "HTTP/1.1 ${r.status} X\r\nContent-Type: ${r.tipo}\r\nContent-Length: ${r.corpo.size}\r\nConnection: close\r\n\r\n"
                            it.getOutputStream().apply { write(cabecalho.toByteArray()); write(r.corpo); flush() }
                        } catch (_: Exception) {}
                    }
                }.start()
            }
        }.also { it.isDaemon = true }.start()
    }

    fun parar() { ativo = false; soquete.close() }
}
