package br.com.economae

import org.junit.Assert.assertEquals
import org.junit.Test

class ImagensTest {
    @Test fun `vtex ganha o tamanho no caminho e mantem a query`() {
        assertEquals("https://toymania.vteximg.com.br/arquivos/ids/1013746-400-400/JJP07-Image-1.jpg?v=63909972622530000",
            fotoRedimensionada("https://toymania.vteximg.com.br/arquivos/ids/1013746/JJP07-Image-1.jpg?v=63909972622530000", 400))
        assertEquals("https://dmvfarma.vteximg.com.br/arquivos/ids/304187-800-800/19930.jpg", fotoRedimensionada("https://dmvfarma.vteximg.com.br/arquivos/ids/304187/19930.jpg", 800))
    }

    @Test fun `vtex que ja tem tamanho ou outro caminho nao muda`() {
        val ja = "https://x.vteximg.com.br/arquivos/ids/1-300-300/a.jpg"
        assertEquals(ja, fotoRedimensionada(ja, 400))
        val outro = "https://x.vteximg.com.br/outra/pasta/a.jpg"
        assertEquals(outro, fotoRedimensionada(outro, 400))
    }

    @Test fun `shopify pede a largura, com ? ou &, sem repetir`() {
        assertEquals("https://cdn.shopify.com/s/files/a.webp?v=1&width=400", fotoRedimensionada("https://cdn.shopify.com/s/files/a.webp?v=1", 400))
        assertEquals("https://cdn.shopify.com/s/files/a.webp?width=400", fotoRedimensionada("https://cdn.shopify.com/s/files/a.webp", 400))
        assertEquals("https://cdn.shopify.com/a.webp?width=200", fotoRedimensionada("https://cdn.shopify.com/a.webp?width=200", 400))
    }

    @Test fun `outras lojas, http e lixo seguem como vieram`() {
        assertEquals("https://outra.com/a.jpg", fotoRedimensionada("https://outra.com/a.jpg", 400))
        assertEquals("http://x.vteximg.com.br/arquivos/ids/1/a.jpg", fotoRedimensionada("http://x.vteximg.com.br/arquivos/ids/1/a.jpg", 400))
        assertEquals("não é url", fotoRedimensionada("não é url", 400))
    }

    @Test fun `dois toques alternam entre inteira e ampliada`() {
        assertEquals(ESCALA_DO_TOQUE_DUPLO, proximaEscala(1f), 0f)
        assertEquals(1f, proximaEscala(ESCALA_DO_TOQUE_DUPLO), 0f)
        assertEquals(1f, proximaEscala(5f), 0f)
        assertEquals(ESCALA_DO_TOQUE_DUPLO, proximaEscala(1.005f), 0f) // quase 1 ainda conta como inteira
    }

    @Test fun `o deslocamento da foto ampliada nao passa da borda`() {
        assertEquals(0f to 0f, limitarDeslocamento(50f, -30f, 1f, 400f, 800f))
        assertEquals(0f to 0f, limitarDeslocamento(50f, -30f, 0.5f, 400f, 800f))
        // escala 2: sobra metade do quadro para cada lado (200 de 400 de largura, 400 de 800 de altura)
        assertEquals(200f to -400f, limitarDeslocamento(999f, -999f, 2f, 400f, 800f))
        assertEquals(-200f to 400f, limitarDeslocamento(-999f, 999f, 2f, 400f, 800f))
        assertEquals(30f to -40f, limitarDeslocamento(30f, -40f, 2f, 400f, 800f))
        // escala 3: 400 e 800
        assertEquals(400f to 800f, limitarDeslocamento(1000f, 1000f, 3f, 400f, 800f))
    }
}
