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
import androidx.compose.ui.test.performClick
import androidx.test.core.app.ApplicationProvider
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
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
                caminho == "/v1/produtos" -> {
                    val cat = Regex("categoria=(\\w+)").find(q)?.groupValues?.get(1) ?: "bebe"
                    val itens = JSONArray((1..4).map { produto(it + (if (cat == "bebe") 0 else 10), cat) })
                    val cursor = if (q.contains("cursor=")) JSONObject.NULL else "proxima"
                    json(200, JSONObject().put("itens", itens).put("proximo_cursor", cursor).toString())
                }
                caminho == "/v1/seguidos" -> json(200, JSONObject().put("proximo_cursor", JSONObject.NULL).put("itens", JSONArray(listOf(
                    JSONObject().put("produto", produto(1, "bebe", true).also { it.remove("seguido"); it.remove("menor_preco_centavos") }).put("avisos", JSONObject()).put("menor_preco_centavos", 5990),
                    JSONObject().put("produto", produto(2, "bebe", true).also { it.remove("seguido"); it.remove("menor_preco_centavos") }).put("avisos", JSONObject()).put("menor_preco_centavos", JSONObject.NULL),
                ))).toString())
                caminho.startsWith("/v1/seguidos/") -> { seguidoAgora = metodo == "PUT"; if (seguidoAgora) json(201, "{}") else RespostaFalsa(204, "application/json", ByteArray(0)) }
                caminho.endsWith("/historico") -> json(200, """{"series":[]}""")
                caminho.startsWith("/v1/produtos/") -> json(200, produto(1, "bebe").also { p ->
                    p.remove("menor_preco_centavos"); p.remove("seguido")
                    p.put("historico_desde", JSONObject.NULL).put("seguimento", if (seguidoAgora) JSONObject() else JSONObject.NULL)
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
            throw AssertionError("não apareceu \"$texto\"; pedidos: $pedidos", e)
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

    @Test fun `inicio mostra busca, faixa, as quatro categorias e a vitrine intercalada`() {
        mostrar { AbaInicio(m) }
        esperar("Explore por categoria")
        esperar("Fralda descartável")
        listOf("Gestação", "Mamãe", "Bebê", "Infantil", "Cuidado em cada fase", "Ofertas em destaque", "Ver todas →").forEach { esperar(it) }
        // Sem alertas, a vitrine pede um pouco de cada categoria.
        assertTrue(pedidos.any { it.contains("categoria=gestacao") } && pedidos.any { it.contains("categoria=infantil") })
        foto("01-inicio")
    }

    @Test fun `categorias abre a pagina da categoria`() {
        mostrar { AbaCategorias(m) }
        esperar("Fraldas, Alimentação e Higiene")
        foto("02-categorias")
        rule.onNodeWithText("Bebê").performClick()
        assertEquals(Tela.Categoria("bebe"), m.tela)
    }

    @Test fun `pagina da categoria lista produtos com preco, filtra por subcategoria e ordena`() {
        mostrar { TelaCategoria(m, "bebe", null) }
        esperar("Fralda descartável")
        listOf("Todos", "Fraldas", "Alimentação", "Higiene", "Ordenar: Mais novos", "Tudo para o seu bebê").forEach { esperar(it) }
        assertTrue(pedidos.any { it.contains("/v1/produtos?limite=20&categoria=bebe") })
        foto("03-categoria-bebe")
        rule.onNodeWithText("Fraldas").performClick()
        rule.waitUntil(10_000) { pedidos.any { it.contains("subcategoria=fraldas") } }
        rule.onNodeWithText("Ordenar: Mais novos").performClick()
        rule.onNodeWithText("Menor preço").performClick()
        rule.waitUntil(10_000) { pedidos.any { it.contains("ordem=menor_preco") && it.contains("subcategoria=fraldas") } }
        foto("04-categoria-bebe-fraldas-menor-preco")
    }

    @Test fun `favoritos mostra foto e preco, e sem oferta diz que nao ha na regiao`() {
        mostrar { AbaFavoritos(m) }
        esperar("sem oferta na sua região")
        esperar("R$")
        foto("05-favoritos")
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
