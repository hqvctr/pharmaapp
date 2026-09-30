package br.com.economae.dados

import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.File

/**
 * Confere os modelos do app contra o contrato gerado pelo backend (backend/openapi/v1.json):
 * todo campo obrigatório do contrato existe no modelo e todo campo do modelo existe no contrato.
 */
class ContratoTest {
    private val contrato: JsonObject = Json.parseToJsonElement(File("../../backend/openapi/v1.json").readText()).jsonObject
    private val esquemas = contrato["components"]!!.jsonObject["schemas"]!!.jsonObject

    private fun resolver(no: JsonObject): JsonObject =
        no["\$ref"]?.jsonPrimitive?.content?.substringAfterLast('/')?.let { esquemas[it]!!.jsonObject } ?: no

    private fun conferir(caminho: String, esquema: JsonObject, s: KSerializer<*>, ignorarNoModelo: Set<String> = emptySet()) {
        val e = resolver(esquema)
        val props = e["properties"]!!.jsonObject.keys
        val obrigatorios = e["required"]?.jsonArray?.map { it.jsonPrimitive.content }.orEmpty().toSet()
        val modelo = (0 until s.descriptor.elementsCount).map { s.descriptor.getElementName(it) }.toSet()
        assertEquals("$caminho: obrigatórios do contrato ausentes no modelo", emptySet<String>(), obrigatorios - modelo)
        assertEquals("$caminho: campos do modelo que o contrato não tem", emptySet<String>(), modelo - props - ignorarNoModelo)
    }

    private fun esquema(nome: String) = esquemas[nome]!!.jsonObject
    private fun prop(pai: JsonObject, nome: String) = resolver(pai)["properties"]!!.jsonObject[nome]!!.jsonObject

    @Test
    fun `respostas`() {
        conferir("Configuracao", esquema("Configuracao"), Configuracao.serializer())
        conferir("Configuracao.documentos", prop(esquema("Configuracao"), "documentos"), Documentos.serializer())
        conferir("Documento", esquema("Documento"), Documento.serializer())
        conferir("Usuario", esquema("Usuario"), Usuario.serializer())
        conferir("Usuario.termos", prop(esquema("Usuario"), "termos"), TermosDoUsuario.serializer())
        conferir("Sessao", esquema("Sessao"), Sessao.serializer())
        conferir("PreferenciasSalvas", esquema("PreferenciasSalvas"), Preferencias.serializer())
        conferir("Feed", esquema("Feed"), PaginaFeed.serializer())
        // Oferta cobre item do feed e detalhe: cada lado ignora os campos só do outro.
        conferir("ItemFeed", esquema("ItemFeed"), Oferta.serializer(), ignorarNoModelo = setOf("ativa", "link", "historico"))
        conferir("DetalheOferta", esquema("DetalheOferta"), Oferta.serializer(), ignorarNoModelo = setOf("prazoEntregaDias"))
        conferir("ItemFeed.produto", prop(esquema("ItemFeed"), "produto"), Produto.serializer())
        conferir("ItemFeed.prova", prop(esquema("ItemFeed"), "prova"), Prova.serializer())
        conferir("Erro.erro", prop(esquema("Erro"), "erro"), DetalheErro.serializer())
    }

    @Test
    fun `requisicoes`() {
        conferir("Preferencias (PUT)", esquema("Preferencias"), PreferenciasEnvio.serializer())
        val caminhos = contrato["paths"]!!.jsonObject
        fun corpo(caminho: String, metodo: String) = caminhos[caminho]!!.jsonObject[metodo]!!.jsonObject["requestBody"]!!
            .jsonObject["content"]!!.jsonObject["application/json"]!!.jsonObject["schema"]!!.jsonObject
        conferir("pedir código", corpo("/v1/auth/email/codigo", "post"), PedidoCodigo.serializer())
        conferir("verificar código", corpo("/v1/auth/email/verificar", "post"), VerificacaoCodigo.serializer())
        conferir("login Google", corpo("/v1/auth/google", "post"), LoginGoogle.serializer())
        conferir("termos", corpo("/v1/eu/termos", "put"), AceiteTermos.serializer())
        conferir("notificações", corpo("/v1/eu/notificacoes", "put"), Consentimento.serializer())
        conferir("dispositivo", corpo("/v1/dispositivos", "put"), RegistroDispositivo.serializer())
    }
}
