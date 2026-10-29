package br.com.economae

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.TextButton
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun TelaProduto(m: Modelo, id: String) {
    val contexto = LocalContext.current
    val escopo = rememberCoroutineScope()
    Moldura("Detalhes do produto", { m.voltar() }) {
        Carregar(listOf(id, m.versao), { m.api.get("/v1/produtos/$id") }) { r, recarregar ->
            val p = r.corpo
            if (!r.ok || p == null) { Erro(if (r.status == 404) "Produto não encontrado." else r.mensagem, recarregar); return@Carregar }
            val ofertas = p.lista("ofertas")
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), Arrangement.spacedBy(6.dp)) {
                // Foto grande com o coração de seguir no canto, como no detalhe do KV (04).
                Box(Modifier.fillMaxWidth()) {
                    FotoProduto(p.textoOuNulo("imagem_url"), Modifier.fillMaxWidth().height(260.dp), descricao = p.getString("nome"))
                    CoracaoDeSeguir(m, id, p.optJSONObject("seguimento") != null, Modifier.align(Alignment.TopEnd).padding(8.dp)) { recarregar() }
                }
                Text(p.getString("nome"), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 8.dp))
                Text(embalagemTexto(p) + (p.optJSONObject("marca")?.let { " · ${it.getString("nome")}" } ?: ""), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ofertas.firstOrNull()?.let { melhor ->
                    Text(if (ofertas.size > 1) "a partir de" else "por", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 4.dp))
                    Text(reais(melhor.getInt("preco_centavos")), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.tertiary)
                }
                economiaEntreLojas(ofertas.map { it.getInt("preco_centavos") })?.let { economia ->
                    // A faixa "Economize" do KV: só quando há mais de uma loja para comparar.
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer), shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Economize ${reais(economia)}", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            Text("Comprando na loja mais barata. Compare preços antes de comprar.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                        }
                    }
                }

                Titulo("Onde comprar")
                if (ofertas.isEmpty()) Text("Nenhuma oferta ativa para o seu CEP neste momento.", style = MaterialTheme.typography.bodyMedium)
                ofertas.forEach { o ->
                    val loja = o.getJSONObject("loja")
                    // "Onde comprar" do KV: loja à esquerda, preço e o botão "Ver oferta" à direita.
                    Cartao {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(loja.getString("nome"), style = MaterialTheme.typography.titleSmall)
                                    Text(freteTexto(o.getJSONObject("frete")) + " · atualizado ${dataHora(o.getString("coletada_em"))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(reais(o.getInt("preco_centavos")), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary, modifier = Modifier.padding(horizontal = 8.dp))
                                Button({ abrirNoNavegador(contexto, o.getString("link")) }, shape = MaterialTheme.shapes.small) { Text("Ver oferta") }
                            }
                            o.textoOuNulo("rotulo_condicao")?.let { Selo(it, tipoDoRotulo(it)) }
                            o.textoOuNulo("alerta_id")?.let { aid -> TextButton({ m.ir(Tela.Alerta(aid, "produto")) }) { Text("Detalhes da promoção") } }
                        }
                    }
                }

                Titulo("Histórico de preços")
                val desde = p.textoOuNulo("historico_desde")
                if (desde != null) Text("Coletado desde ${dataCurta(desde)}", style = MaterialTheme.typography.bodySmall)
                Carregar(listOf(id, "hist"), { m.api.get("/v1/produtos/$id/historico") }) { h, _ ->
                    val series = h.corpo?.lista("series") ?: emptyList()
                    if (!h.ok || series.isEmpty()) { Text("Ainda não há histórico suficiente.", style = MaterialTheme.typography.bodySmall); return@Carregar }
                    series.forEach { s ->
                        val pontos = s.lista("pontos").map { it.getInt("preco_embalagem_centavos") }
                        Text(s.getJSONObject("loja").getString("nome"), style = MaterialTheme.typography.titleSmall)
                        if (pontos.size < 2) Text("${pontos.size} dia medido: ${pontos.firstOrNull()?.let { reais(it) } ?: "-"}", style = MaterialTheme.typography.bodySmall)
                        else {
                            Grafico(pontos)
                            Text("menor ${reais(pontos.min())} · maior ${reais(pontos.max())} · ${pontos.size} dias medidos", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

/** Linha simples do preço da embalagem por dia (sem biblioteca de gráficos). */
@Composable
fun Grafico(pontos: List<Int>) {
    val cor = MaterialTheme.colorScheme.tertiary // verde dos preços do KV
    val base = MaterialTheme.colorScheme.outlineVariant
    val menor = pontos.min().toFloat()
    val maior = pontos.max().toFloat()
    val faixa = (maior - menor).takeIf { it > 0f } ?: 1f
    Canvas(Modifier.fillMaxWidth().height(110.dp).padding(vertical = 6.dp)) {
        val caminho = Path()
        pontos.forEachIndexed { i, v ->
            val x = size.width * i / (pontos.size - 1)
            val y = size.height - size.height * ((v - menor) / faixa)
            if (i == 0) caminho.moveTo(x, y) else caminho.lineTo(x, y)
        }
        drawLine(base, Offset(0f, size.height), Offset(size.width, size.height), 2f)
        drawPath(caminho, cor, style = Stroke(width = 5f))
    }
}

/** Diferença entre a oferta mais cara e a mais barata, quando há mais de uma loja e os preços diferem; senão null. */
fun economiaEntreLojas(precosCentavos: List<Int>): Int? = if (precosCentavos.size < 2) null else (precosCentavos.max() - precosCentavos.min()).takeIf { it > 0 }

/** Coração redondo sobre a foto: segue ou deixa de seguir o produto. */
@Composable
fun CoracaoDeSeguir(m: Modelo, produtoId: String, seguido: Boolean, modifier: Modifier = Modifier, aoMudar: () -> Unit) {
    val escopo = rememberCoroutineScope()
    var erro by remember { mutableStateOf<String?>(null) }
    Column(modifier, horizontalAlignment = Alignment.End) {
        Surface(shape = androidx.compose.foundation.shape.CircleShape, color = MaterialTheme.colorScheme.surfaceContainerLowest, shadowElevation = 2.dp) {
            IconButton({
                escopo.launch {
                    try {
                        val e = alternarSeguir(m, produtoId, seguido)
                        if (e == null) aoMudar() else erro = e
                    } catch (e: SemConexao) { erro = e.message }
                }
            }) {
                Icon(if (seguido) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, tint = MaterialTheme.colorScheme.primary,
                    contentDescription = if (seguido) "Deixar de seguir este produto" else "Seguir este produto")
            }
        }
        erro?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
    }
}
