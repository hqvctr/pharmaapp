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

    @Test fun `resumo das subcategorias`() {
        assertEquals("", resumoDeSubcategorias(emptyList()))
        assertEquals("Fraldas", resumoDeSubcategorias(listOf("Fraldas")))
        assertEquals("Fraldas e Higiene", resumoDeSubcategorias(listOf("Fraldas", "Higiene")))
        assertEquals("Fraldas, Higiene e Quarto", resumoDeSubcategorias(listOf("Fraldas", "Higiene", "Quarto")))
        assertEquals("Fraldas, Higiene, Quarto e mais", resumoDeSubcategorias(listOf("Fraldas", "Higiene", "Quarto", "Passeio", "Roupas")))
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

    @Test fun `ordens da lista tem rotulo e so a relevancia nao manda parametro`() {
        assertNull(Ordem.Relevancia.parametro)
        assertEquals("mais_novos", Ordem.Novidades.parametro)
        assertEquals(listOf("Mais novos", "Maior queda", "Menor preço", "Menor preço por unidade", "Maior preço", "A a Z"), Ordem.daCategoria.map { it.rotulo })
        assertEquals(Ordem.Relevancia, Ordem.daPesquisa.first())
        assertEquals(Ordem.MenorPrecoUnidade, Ordem.doParametro("menor_preco_unidade"))
        assertEquals(Ordem.Novidades, Ordem.doParametro("desconhecida"))
    }

    @Test fun `filtros entram na consulta e contam os ligados`() {
        val f = Filtros(comQueda = true, menorPreco180d = true, precoMin = 1000, precoMax = 5000, lojaId = "l-1", lojaNome = "Loja", marca = "pampers", marcaNome = "Pampers")
        assertEquals("/v1/produtos?limite=20&categoria=bebe&ordem=maior_queda&com_queda=true&menor_preco_180d=true&preco_min=1000&preco_max=5000&loja_id=l-1&marca=pampers&facetas=true",
            consultaProdutos(categoria = "bebe", ordem = Ordem.MaiorQueda, filtros = f, facetas = true))
        assertEquals(5, f.ativos)
        assertEquals(1, Filtros(precoMax = 100).ativos)
        assertEquals(0, Filtros().ativos)
        assertEquals("/v1/produtos?limite=20&ordem=para_voce", consultaProdutos(ordem = Ordem.ParaVoce))
    }

    @Test fun `ver todas da fileira vira categoria, ordem e filtros`() {
        assertEquals(VerTodas("bebe", "fraldas", Ordem.MenorPrecoUnidade, Filtros()), verTodasDe(JSONObject("""{"categoria":"bebe","subcategoria":"fraldas","ordem":"menor_preco_unidade"}""")))
        assertEquals(VerTodas(null, null, Ordem.MaiorQueda, Filtros(comQueda = true)), verTodasDe(JSONObject("""{"ordem":"maior_queda","com_queda":true}""")))
        assertEquals(VerTodas(null, null, Ordem.MaiorQueda, Filtros(menorPreco180d = true)), verTodasDe(JSONObject("""{"ordem":"maior_queda","menor_preco_180d":true}""")))
    }

    @Test fun `vistos recentemente vao para a frente sem repetir e respeitam o maximo`() {
        assertEquals(listOf("c", "a", "b"), registrarVisto(listOf("a", "b", "c"), "c"))
        assertEquals(listOf("d", "a", "b"), registrarVisto(listOf("a", "b", "c"), "d", max = 3))
        assertEquals(listOf("x"), registrarVisto(emptyList(), "x"))
        val itens = listOf(JSONObject().put("id", "b"), JSONObject().put("id", "a"))
        assertEquals(listOf("a", "b"), naOrdemDosVistos(listOf("a", "sumiu", "b"), itens).map { it.getString("id") })
    }

    @Test fun `vistos entram depois das fileiras de queda e de favoritos`() {
        val f = { id: String -> FileiraInicio(id, id, emptyList(), null) }
        val vistos = listOf(JSONObject().put("id", "p"))
        assertEquals(listOf("baixaram_de_preco", "favoritos_mais_baratos", "vistos", "novidades"),
            comVistos(listOf(f("baixaram_de_preco"), f("favoritos_mais_baratos"), f("novidades")), vistos).map { it.id })
        assertEquals(listOf("vistos", "novidades"), comVistos(listOf(f("novidades")), vistos).map { it.id })
        assertEquals(listOf("novidades"), comVistos(listOf(f("novidades")), emptyList()).map { it.id })
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
        val real = JSONObject("""{"id":"a3","preco_centavos":4990,"queda":0.0001,"produto":{"nome":"Fralda"}}""")
        assertTrue(temQueda(real))
        assertTrue(!temQueda(JSONObject("""{"id":"x"}""")))
    }
}
