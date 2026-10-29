package br.com.economae

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
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
    Moldura("Produto", { m.voltar() }) {
        Carregar(listOf(id, m.versao), { m.api.get("/v1/produtos/$id") }) { r, recarregar ->
            val p = r.corpo
            if (!r.ok || p == null) { Erro(if (r.status == 404) "Produto não encontrado." else r.mensagem, recarregar); return@Carregar }
            val ofertas = p.lista("ofertas")
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), Arrangement.spacedBy(6.dp)) {
                Text(p.getString("nome"), style = MaterialTheme.typography.titleLarge)
                Text(embalagemTexto(p) + (p.optJSONObject("marca")?.let { " · ${it.getString("nome")}" } ?: ""), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                SeguirProduto(m, id, p.optJSONObject("seguimento") != null) { recarregar() }

                Titulo("Onde comprar agora")
                if (ofertas.isEmpty()) Text("Nenhuma oferta ativa para o seu CEP neste momento.", style = MaterialTheme.typography.bodyMedium)
                ofertas.forEach { o ->
                    val loja = o.getJSONObject("loja")
                    // "Onde comprar" do KV: loja à esquerda, preço em verde à direita.
                    Cartao {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text(loja.getString("nome"), style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                                Text(reais(o.getInt("preco_centavos")), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.tertiary)
                            }
                            o.textoOuNulo("rotulo_condicao")?.let { Selo(it, tipoDoRotulo(it)) }
                            Text(freteTexto(o.getJSONObject("frete")) + " · atualizado ${dataHora(o.getString("coletada_em"))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton({ abrirNoNavegador(contexto, o.getString("link")) }) { Text("Ver na loja") }
                                o.textoOuNulo("alerta_id")?.let { aid -> OutlinedButton({ m.ir(Tela.Alerta(aid, "produto")) }) { Text("Detalhes") } }
                            }
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
