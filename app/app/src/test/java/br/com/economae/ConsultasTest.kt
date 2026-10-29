package br.com.economae

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ConsultasTest {
    @Test fun `navegacao por categoria nao manda q e so manda a ordem quando ela muda`() {
        assertEquals("/v1/produtos?limite=20&categoria=bebe", consultaProdutos(categoria = "bebe"))
        assertEquals("/v1/produtos?limite=20&categoria=bebe&subcategoria=fraldas&ordem=menor_preco", consultaProdutos(categoria = "bebe", subcategoria = "fraldas", ordem = Ordem.MenorPreco))
        assertEquals("/v1/produtos?limite=4&categoria=infantil&ordem=maior_preco", consultaProdutos(categoria = "infantil", ordem = Ordem.MaiorPreco, limite = 4))
        assertEquals("/v1/produtos?limite=20&ordem=nome", consultaProdutos(ordem = Ordem.Nome))
    }

    @Test fun `pesquisa codifica o texto e subcategoria sem categoria e ignorada`() {
        assertEquals("/v1/produtos?limite=20&q=fralda+pampers+%C3%A1", consultaProdutos(q = "  fralda pampers á "))
        assertEquals("/v1/produtos?limite=20&q=a%26b%3Dc", consultaProdutos(q = "a&b=c"))
        assertEquals("/v1/produtos?limite=20", consultaProdutos(q = "   ", subcategoria = "fraldas"))
        assertEquals("/v1/produtos?limite=20&q=teste&categoria=mamae", consultaProdutos(q = "teste", categoria = "mamae"))
    }

    @Test fun `intercalar pega um de cada lista por rodada e respeita o maximo`() {
        assertEquals(listOf(1, 10, 100, 2, 20, 3), intercalar(listOf(listOf(1, 2, 3), listOf(10, 20), listOf(100)), 6))
        assertEquals(listOf(1, 10, 100, 2), intercalar(listOf(listOf(1, 2, 3), listOf(10, 20), listOf(100)), 4))
        assertEquals(emptyList<Int>(), intercalar(listOf(emptyList(), emptyList<Int>()), 5))
        assertEquals(emptyList<Int>(), intercalar(listOf(listOf(1)), 0))
    }

    @Test fun `resumo das subcategorias`() {
        assertEquals("", resumoDeSubcategorias(emptyList()))
        assertEquals("Fraldas", resumoDeSubcategorias(listOf("Fraldas")))
        assertEquals("Fraldas e Higiene", resumoDeSubcategorias(listOf("Fraldas", "Higiene")))
        assertEquals("Fraldas, Higiene e Quarto", resumoDeSubcategorias(listOf("Fraldas", "Higiene", "Quarto")))
        assertEquals("Fraldas, Higiene, Quarto e mais", resumoDeSubcategorias(listOf("Fraldas", "Higiene", "Quarto", "Passeio", "Roupas")))
    }

    @Test fun `destaque de alerta mostra a queda e abre o alerta`() {
        val a = JSONObject("""{"id":"a1","preco_centavos":5990,"queda":0.32,"produto":{"nome":"Fralda M","imagem_url":"https://l.test/f.jpg"}}""")
        val d = destaqueDeAlerta(a)
        assertEquals(Tela.Alerta("a1"), d.tela)
        assertEquals("-32%", d.queda)
        assertEquals(5990, d.precoCentavos)
        assertEquals("https://l.test/f.jpg", d.imagem)
    }

    @Test fun `destaque de produto nao tem selo e aceita foto e preco ausentes`() {
        val p = JSONObject("""{"id":"p1","nome":"Berço","imagem_url":null,"menor_preco_centavos":null}""")
        val d = destaqueDeProduto(p)
        assertEquals(Tela.Produto("p1"), d.tela)
        assertNull(d.queda)
        assertNull(d.imagem)
        assertNull(d.precoCentavos)
    }

    @Test fun `economia so existe com mais de uma loja e precos diferentes`() {
        assertNull(economiaEntreLojas(emptyList()))
        assertNull(economiaEntreLojas(listOf(5990)))
        assertNull(economiaEntreLojas(listOf(5990, 5990)))
        assertEquals(2800, economiaEntreLojas(listOf(5990, 8790, 6990)))
    }

    @Test fun `seguido vira produto de lista com o coracao cheio e o preco`() {
        val s = JSONObject("""{"produto":{"id":"p1","nome":"Fralda","categoria":"bebe","embalagem":{"quantidade":60,"unidade":"un"},"imagem_url":"https://l.test/f.jpg"},"avisos":{},"menor_preco_centavos":4500}""")
        val p = seguidoComoProduto(s)
        assertTrue(p.getBoolean("seguido"))
        assertEquals(4500, p.getInt("menor_preco_centavos"))
        assertEquals("https://l.test/f.jpg", p.getString("imagem_url"))
        val sem = seguidoComoProduto(JSONObject("""{"produto":{"id":"p2","nome":"X"},"avisos":{}}"""))
        assertTrue(sem.isNull("menor_preco_centavos"))
    }

    @Test fun `ordens da lista tem rotulo e a padrao nao manda parametro`() {
        assertNull(Ordem.Novidades.parametro)
        assertEquals(listOf("Mais novos", "Menor preço", "Maior preço", "A a Z"), Ordem.entries.map { it.rotulo })
    }

    @Test fun `abas ficam na ordem do KV`() {
        assertEquals(listOf(0, 1, 2, 3, 4), listOf(Abas.INICIO, Abas.CATEGORIAS, Abas.FAVORITOS, Abas.AVISOS, Abas.PERFIL))
    }

    @Test fun `fotos do detalhe vem da lista, e sem ela da imagem principal`() {
        assertEquals(listOf("https://a/1", "https://a/2"), fotosDoProduto(JSONObject("""{"imagens":["https://a/1","https://a/2"],"imagem_url":"https://a/1"}""")))
        assertEquals(listOf("https://a/p"), fotosDoProduto(JSONObject("""{"imagens":[],"imagem_url":"https://a/p"}""")))
        assertEquals(listOf("https://a/p"), fotosDoProduto(JSONObject("""{"imagem_url":"https://a/p"}""")))
        assertEquals(emptyList<String>(), fotosDoProduto(JSONObject("""{"imagens":[],"imagem_url":null}""")))
    }

    @Test fun `oferta manual vem com queda zero e nao ganha selo`() {
        val manual = JSONObject("""{"id":"a2","preco_centavos":4990,"queda":0,"sem_historico_verificado":true,"produto":{"nome":"Fralda","imagem_url":null}}""")
        assertTrue(!temQueda(manual))
        assertNull(destaqueDeAlerta(manual).queda)
        val real = JSONObject("""{"id":"a3","preco_centavos":4990,"queda":0.0001,"produto":{"nome":"Fralda"}}""")
        assertTrue(temQueda(real))
        assertTrue(!temQueda(JSONObject("""{"id":"x"}""")))
    }
}
