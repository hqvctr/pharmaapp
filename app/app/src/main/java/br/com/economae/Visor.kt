package br.com.economae

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.SubcomposeAsyncImage

/**
 * Foto do produto em tela cheia, sobre fundo preto: passa de uma foto à outra com o dedo, amplia com o gesto de pinça ou com dois toques,
 * arrasta a foto ampliada e fecha no X (ou no botão voltar). Enquanto uma foto está ampliada, o dedo move a foto em vez de trocar de página.
 */
@Composable
fun VisorDeFotos(fotos: List<String>, inicio: Int, descricao: String, aoFechar: () -> Unit) {
    val estado = rememberPagerState(initialPage = inicio.coerceIn(0, (fotos.size - 1).coerceAtLeast(0))) { fotos.size }
    var ampliada by remember { mutableStateOf(false) }
    // Ao trocar de foto a nova começa inteira.
    LaunchedEffect(estado.currentPage) { ampliada = false }
    Dialog(onDismissRequest = aoFechar, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            HorizontalPager(estado, Modifier.fillMaxSize(), userScrollEnabled = !ampliada) { i ->
                FotoComZoom(fotoRedimensionada(fotos[i], 1200), "$descricao, foto ${i + 1} de ${fotos.size}", ativa = i == estado.currentPage) { ampliada = it }
            }
            IconButton(aoFechar, Modifier.align(Alignment.TopEnd).padding(8.dp)) { Icon(Icons.Rounded.Close, contentDescription = "Fechar", tint = Color.White) }
            if (fotos.size > 1) Text("${estado.currentPage + 1} / ${fotos.size}", color = Color.White, modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp))
        }
    }
}

@Composable
private fun FotoComZoom(url: String, descricao: String, ativa: Boolean, aoAmpliar: (Boolean) -> Unit) {
    var escala by remember { mutableFloatStateOf(1f) }
    var desloc by remember { mutableStateOf(Offset.Zero) }
    var tamanho by remember { mutableStateOf(IntSize.Zero) }
    LaunchedEffect(ativa) { if (!ativa) { escala = 1f; desloc = Offset.Zero } }
    fun aplicar(novaEscala: Float, novoDesloc: Offset) {
        val e = novaEscala.coerceIn(1f, ESCALA_MAXIMA)
        val (x, y) = limitarDeslocamento(novoDesloc.x, novoDesloc.y, e, tamanho.width.toFloat(), tamanho.height.toFloat())
        escala = e; desloc = Offset(x, y)
        if (ativa) aoAmpliar(e > 1.01f)
    }
    Box(
        Modifier.fillMaxSize().onSizeChanged { tamanho = it }
            .pointerInput(Unit) { detectTapGestures(onDoubleTap = { aplicar(proximaEscala(escala), Offset.Zero) }) }
            .pointerInput(Unit) {
                // Pinça com dois dedos sempre; um dedo só arrasta quando já está ampliada (senão o gesto fica livre para o pager).
                awaitEachGesture {
                    awaitFirstDown(requireUnconsumed = false)
                    do {
                        val ev = awaitPointerEvent()
                        val dois = ev.changes.size >= 2
                        if (dois || escala > 1.01f) {
                            val zoom = if (dois) ev.calculateZoom() else 1f
                            aplicar(escala * zoom, desloc + ev.calculatePan())
                            ev.changes.forEach { if (it.positionChanged()) it.consume() }
                        }
                    } while (ev.changes.any { it.pressed })
                }
            },
        contentAlignment = Alignment.Center,
    ) {
        SubcomposeAsyncImage(
            model = url, contentDescription = descricao, contentScale = ContentScale.Fit,
            modifier = Modifier.fillMaxSize().graphicsLayer(scaleX = escala, scaleY = escala, translationX = desloc.x, translationY = desloc.y),
        )
    }
}
