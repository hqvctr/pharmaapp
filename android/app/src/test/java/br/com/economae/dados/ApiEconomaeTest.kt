package br.com.economae.dados

import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test

class ApiEconomaeTest {
    private val servidor = MockWebServer()
    private var token: String? = null
    private lateinit var api: ApiEconomae

    @Before
    fun abrir() {
        servidor.start()
        api = ApiEconomae(servidor.url("/"), "economae", OkHttpClient()) { token }
    }

    @After
    fun fechar() = servidor.close()

    private fun responder(codigo: Int, corpo: String) =
        servidor.enqueue(MockResponse.Builder().code(codigo).addHeader("Content-Type", "application/json").body(corpo).build())

    @Test
    fun `toda chamada leva X-Tenant e so as autenticadas levam o token`() = runTest {
        responder(202, """{"validadeMinutos":10}""")
        assertEquals(10, api.pedirCodigo("ana@exemplo.com").validadeMinutos)
        val pedido = servidor.takeRequest()
        assertEquals("economae", pedido.headers["X-Tenant"])
        assertNull(pedido.headers["Authorization"])
        assertEquals("/v1/auth/email/codigo", pedido.url.encodedPath)
        assertEquals("""{"email":"ana@exemplo.com"}""", pedido.body?.utf8())

        token = "tok123"
        responder(204, "")
        api.registrarDispositivo("fcm-token")
        val p2 = servidor.takeRequest()
        assertEquals("Bearer tok123", p2.headers["Authorization"])
        assertEquals("PUT", p2.method)
        assertEquals("""{"token":"fcm-token","plataforma":"android"}""", p2.body?.utf8())
    }

    @Test
    fun `preferencias vao com silencio e limite nulos explicitos`() = runTest {
        token = "t"
        responder(200, """{"categorias":["fraldas_lencos"],"ceps":["14010000"],"tamanhosFralda":[],"silencio":null,"limiteDiario":null,"completas":true}""")
        api.salvarPreferencias(PreferenciasEnvio(listOf("fraldas_lencos"), listOf("14010000"), emptyList(), null, null))
        assertEquals(
            """{"categorias":["fraldas_lencos"],"ceps":["14010000"],"tamanhosFralda":[],"silencio":null,"limiteDiario":null}""",
            servidor.takeRequest().body?.utf8(),
        )
    }

    @Test
    fun `feed tolera campo e valor de enum novos (contrato so cresce)`() = runTest {
        token = "t"
        responder(
            200,
            """{"itens":[{"ofertaId":"o1","produto":{"nome":"Fralda G","marca":null,"categoria":"fraldas_lencos","embalagem":{"quantidade":36,"unidade":"un"},"tamanhoFralda":"G"},
               "loja":{"id":"l1","nome":"Loja","rede":"Rede","tipo":"online"},"precoCentavos":4990,"precoEfetivoCentavos":4990,"precoReferenciaCentavos":7290,
               "queda":0.3155,"precoPorUnidade":{"centavos":138.61,"unidade":"un"},"condicao":null,"frete":{"status":"a_confirmar","centavos":null},
               "validaAte":null,"decisao":"um_valor_novo","score":80,"avisos":[],"imagemUrl":null,"linkAfiliado":true,
               "alertadaEm":"2026-09-30T12:00:00.000Z","coletadaEm":"2026-09-30T12:00:00.000Z","prazoEntregaDias":3,"campoNovo":{"x":1}}],
               "proximoCursor":"abc"}""",
        )
        val pagina = api.feed(cursor = "c0", categoria = "fraldas_lencos")
        assertEquals("abc", pagina.proximoCursor)
        assertEquals("um_valor_novo", pagina.itens.single().decisao)
        val url = servidor.takeRequest().url
        assertEquals("c0", url.queryParameter("cursor"))
        assertEquals("fraldas_lencos", url.queryParameter("categoria"))
    }

    @Test
    fun `erro do servidor vira ErroApi com o codigo do contrato`() = runTest {
        responder(401, """{"erro":{"codigo":"CODIGO_INVALIDO","mensagem":"Código inválido ou expirado."}}""")
        try {
            api.verificarCodigo("ana@exemplo.com", "000000")
            fail()
        } catch (e: ErroApi) {
            assertEquals(401, e.status)
            assertEquals("CODIGO_INVALIDO", e.codigo)
            assertEquals("Código inválido ou expirado.", e.message)
        }
    }

    @Test
    fun `sem servidor vira SEM_CONEXAO`() = runTest {
        servidor.close()
        try {
            api.configuracao()
            fail()
        } catch (e: ErroApi) {
            assertEquals(ErroApi.SEM_CONEXAO, e.codigo)
            assertTrue(e.status == 0)
        }
    }
}
