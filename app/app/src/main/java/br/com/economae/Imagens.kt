package br.com.economae

import java.net.URI

/**
 * Pede à própria loja uma versão menor da foto: as de produto chegam com 100 KB a 1,3 MB, e uma lista de 20 produtos
 * baixava megabytes antes de mostrar qualquer coisa. VTEX (`*.vteximg.com.br`) aceita `ids/123-400-400/` no caminho e a
 * Shopify (`cdn.shopify.com`) aceita `?width=400`. Qualquer outro endereço segue como veio (só https; o resto não é tocado).
 */
fun fotoRedimensionada(url: String, lado: Int): String {
    val u = try { URI(url) } catch (e: Exception) { return url }
    val host = u.host ?: return url
    if (u.scheme != "https") return url
    if (host.endsWith(".vteximg.com.br")) {
        val novo = Regex("/arquivos/ids/(\\d+)/").replace(u.rawPath ?: return url, "/arquivos/ids/$1-$lado-$lado/")
        return if (novo == u.rawPath) url else URI(u.scheme, u.rawAuthority, null, null, null).toString() + novo + (u.rawQuery?.let { "?$it" } ?: "")
    }
    if (host == "cdn.shopify.com" && u.rawQuery?.contains("width=") != true) return url + (if (u.rawQuery == null) "?" else "&") + "width=$lado"
    return url
}

/** Escala da foto ampliada: dois toques alternam entre inteira e 2,5x. */
const val ESCALA_MAXIMA = 5f
const val ESCALA_DO_TOQUE_DUPLO = 2.5f
fun proximaEscala(atual: Float): Float = if (atual > 1.01f) 1f else ESCALA_DO_TOQUE_DUPLO

/**
 * Deslocamento permitido da foto ampliada: com a escala `e`, a foto sobra `(e - 1) * tamanho / 2` para cada lado do quadro; passar disso
 * mostraria o fundo preto. Sem ampliação, nenhum deslocamento.
 */
fun limitarDeslocamento(x: Float, y: Float, escala: Float, largura: Float, altura: Float): Pair<Float, Float> {
    if (escala <= 1f) return 0f to 0f
    val maxX = (escala - 1f) * largura / 2f
    val maxY = (escala - 1f) * altura / 2f
    return x.coerceIn(-maxX, maxX) to y.coerceIn(-maxY, maxY)
}
