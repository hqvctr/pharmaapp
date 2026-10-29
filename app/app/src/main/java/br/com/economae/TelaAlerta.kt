package br.com.economae

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

/** Moldura com título e botão de voltar, usada pelas telas de detalhe. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Moldura(titulo: String, aoVoltar: () -> Unit, conteudo: @Composable () -> Unit) {
    Scaffold(topBar = {
        TopAppBar(title = { Text(titulo, maxLines = 1, style = MaterialTheme.typography.titleLarge) },
            navigationIcon = { IconButton(aoVoltar) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Voltar") } })
    }) { margem ->
        androidx.compose.foundation.layout.Box(Modifier.padding(margem).fillMaxSize()) { conteudo() }
    }
}

@Composable
fun TelaAlerta(m: Modelo, id: String, origem: String) {
    val escopo = rememberCoroutineScope()
    val contexto = LocalContext.current
    // Registra a abertura uma vez por visita (o contrato aceita repetir com outra chave, mas não há por quê).
    LaunchedEffect(id) {
        try { m.api.post("/v1/alertas/$id/eventos", JSONObject().put("tipo", "aberto").put("origem", origem), extra = Api.novaChave()) } catch (_: SemConexao) {}
    }
    Moldura("Promoção", { m.voltar() }) {
        Carregar(listOf(id, m.versao), { m.api.get("/v1/alertas/$id") }) { r, recarregar ->
            val a = r.corpo
            if (!r.ok || a == null) { Erro(if (r.status == 404) "Esta promoção não está mais disponível." else r.mensagem, recarregar); return@Carregar }
            val p = a.getJSONObject("produto")
            val loja = a.getJSONObject("loja")
            var mensagem by remember { mutableStateOf<String?>(null) }
            var dialogoDenuncia by remember { mutableStateOf(false) }
            var dialogoSilenciar by remember { mutableStateOf(false) }
            val ativa = a.getString("situacao") == "ativa"

            fun evento(tipo: String) = escopo.launch {
                try { m.api.post("/v1/alertas/$id/eventos", JSONObject().put("tipo", tipo).put("origem", origem), extra = Api.novaChave()) } catch (_: SemConexao) {}
            }

            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), Arrangement.spacedBy(6.dp)) {
                val queda = percentual(a.getDouble("queda"))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Selo("-$queda", TipoSelo.Destaque, descricao = "queda de $queda", estilo = MaterialTheme.typography.labelLarge)
                    a.textoOuNulo("rotulo_condicao")?.let { Selo(it, tipoDoRotulo(it), estilo = MaterialTheme.typography.labelLarge) }
                }
                Text(p.getString("nome"), style = MaterialTheme.typography.titleLarge)
                Text("${loja.getString("nome")} · ${embalagemTexto(p)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(reais(a.getInt("preco_centavos")), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.tertiary)
                Text("Referência: ${reais(a.getInt("preco_referencia_centavos"))} (mediana dos últimos 30 dias)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                if (!ativa) Text(if (a.getString("situacao") == "em_revisao") "Esta oferta está em revisão." else "Esta promoção já acabou.", color = MaterialTheme.colorScheme.error)

                a.optJSONObject("prova")?.let { prova ->
                    // A faixa "Economize" do KV: rosa-claro, cantos de 16.
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer), shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth().padding(top = 6.dp)) {
                        Column(Modifier.padding(14.dp)) {
                            val dias = prova.getInt("dias_medidos")
                            Text("Nesta loja, em $dias ${if (dias == 1) "dia medido" else "dias medidos"}:", style = MaterialTheme.typography.labelLarge)
                            Text("menor ${reais(prova.getInt("menor_preco_centavos"))} · maior ${reais(prova.getInt("maior_preco_centavos"))}", style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                if (a.optBoolean("sem_historico_verificado")) Text("Oferta cadastrada à mão: sem histórico de preço verificado.", style = MaterialTheme.typography.bodySmall)

                Titulo("Entrega e condições")
                val cob = a.getJSONObject("cobertura")
                Linha("Entrega para", "CEP ${cepBonito(cob.getString("cep"))}")
                cob.inteiroOuNulo("prazo_dias")?.let { Linha("Prazo", "$it dia(s)") }
                Linha("Frete", freteTexto(a.getJSONObject("frete")))
                if (a.optBoolean("entrega_a_confirmar")) Text("A entrega para o seu CEP deve ser confirmada na loja.", style = MaterialTheme.typography.bodySmall)
                a.textoOuNulo("valida_ate")?.let { Linha("Vale até", dataHora(it)) }
                Linha("Coletado em", dataHora(a.getString("coletada_em")))

                a.lista("advertencias").forEach { adv ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer), shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                        Text(adv.getString("texto"), Modifier.padding(12.dp), style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Botao(if (a.optBoolean("link_afiliado")) "Ver na loja (link de afiliado)" else "Ver na loja", ativa) {
                    evento("clicado"); abrirNoNavegador(contexto, a.getString("link"))
                }
                if (a.optBoolean("link_afiliado")) Text("Este link pode render uma comissão ao economae, sem custo para você.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                OutlinedButton({
                    evento("compartilhado")
                    val envio = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "${p.getString("nome")} por ${reais(a.getInt("preco_centavos"))} na ${loja.getString("rede")}: ${a.getString("link")}")
                    contexto.startActivity(Intent.createChooser(envio, "Compartilhar").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                }, Modifier.fillMaxWidth()) { Text("Compartilhar") }

                Titulo("Sua opinião")
                val valorAv = a.optJSONObject("avaliacao")?.getString("valor")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("util" to "Útil", "nao_util" to "Não útil").forEach { (valor, rotulo) ->
                        OutlinedButton({
                            escopo.launch {
                                try { val s = m.api.put("/v1/alertas/$id/avaliacao", JSONObject().put("valor", valor)); if (s.ok) recarregar() else mensagem = s.mensagem } catch (e: SemConexao) { mensagem = e.message }
                            }
                        }) { Text(if (valorAv == valor) "✓ $rotulo" else rotulo) }
                    }
                }
                val den = a.optJSONObject("denuncia")
                if (den != null) Text("Você denunciou: ${if (den.getString("motivo") == "preco_errado") "preço errado" else "sem estoque"}.", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton({ dialogoDenuncia = true }, enabled = ativa || den != null) { Text(if (den == null) "Denunciar" else "Mudar denúncia") }
                    OutlinedButton({ dialogoSilenciar = true }) { Text("Silenciar") }
                }
                SeguirProduto(m, p.getString("id"), a.optBoolean("seguido")) { recarregar() }
                mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }

            if (dialogoDenuncia) {
                AlertDialog(onDismissRequest = { dialogoDenuncia = false }, title = { Text("O que está errado?") },
                    text = { Text("Se várias pessoas denunciarem, a oferta some do feed até um operador conferir.") },
                    confirmButton = {
                        Column {
                            listOf("preco_errado" to "O preço está errado", "sem_estoque" to "Sem estoque").forEach { (motivo, rotulo) ->
                                TextButton({
                                    dialogoDenuncia = false
                                    escopo.launch {
                                        try { val s = m.api.put("/v1/alertas/$id/denuncia", JSONObject().put("motivo", motivo)); if (s.ok) { mensagem = null; recarregar() } else mensagem = s.mensagem } catch (e: SemConexao) { mensagem = e.message }
                                    }
                                }) { Text(rotulo) }
                            }
                        }
                    }, dismissButton = { TextButton({ dialogoDenuncia = false }) { Text("Cancelar") } })
            }
            if (dialogoSilenciar) {
                val marca = p.optJSONObject("marca")
                AlertDialog(onDismissRequest = { dialogoSilenciar = false }, title = { Text("Silenciar") },
                    text = { Text("\"Sem push\" só para de avisar; \"Sumir\" também tira do feed e da pesquisa.") },
                    confirmButton = {
                        Column {
                            fun silenciar(tipo: String, alvo: String, alcance: String) {
                                dialogoSilenciar = false
                                escopo.launch {
                                    try { val s = m.api.put("/v1/silenciamentos/$tipo/$alvo", JSONObject().put("alcance", alcance)); if (s.ok) { m.mudou(); m.voltar() } else mensagem = s.mensagem } catch (e: SemConexao) { mensagem = e.message }
                                }
                            }
                            TextButton({ silenciar("loja", loja.getString("id"), "push") }) { Text("Loja ${loja.getString("rede")}: sem push") }
                            TextButton({ silenciar("loja", loja.getString("id"), "tudo") }) { Text("Loja ${loja.getString("rede")}: sumir") }
                            if (marca != null) {
                                TextButton({ silenciar("marca", marca.getString("chave"), "push") }) { Text("Marca ${marca.getString("nome")}: sem push") }
                                TextButton({ silenciar("marca", marca.getString("chave"), "tudo") }) { Text("Marca ${marca.getString("nome")}: sumir") }
                            }
                        }
                    }, dismissButton = { TextButton({ dialogoSilenciar = false }) { Text("Cancelar") } })
            }
        }
    }
}

/** Botão de seguir/deixar de seguir (a estrela). Segue com o aviso padrão: promoção excepcional ligada, o resto desligado. */
@Composable
fun SeguirProduto(m: Modelo, produtoId: String, seguido: Boolean, aoMudar: () -> Unit) {
    val escopo = rememberCoroutineScope()
    var erro by remember { mutableStateOf<String?>(null) }
    OutlinedButton({
        escopo.launch {
            try {
                val r = if (seguido) m.api.delete("/v1/seguidos/$produtoId") else m.api.put("/v1/seguidos/$produtoId", JSONObject().put("avisos",
                    JSONObject().put("promocao_excepcional", true).put("queda_percentual", JSONObject.NULL).put("voltou_estoque", false).put("menor_preco_180d", false).put("promocao_acabando", false)))
                if (r.ok) { m.mudou(); aoMudar() } else erro = if (r.status == 404) "Este produto não pode ser seguido (por regra legal, só aparece nas promoções)." else r.mensagem
            } catch (e: SemConexao) { erro = e.message }
        }
    }, Modifier.fillMaxWidth()) { Text(if (seguido) "★ Seguindo (toque para deixar de seguir)" else "☆ Seguir este produto") }
    erro?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }
}
