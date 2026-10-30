package br.com.economae

import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.List
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONObject

private val ABAS = listOf("Início", "Categorias", "Favoritos", "Avisos", "Perfil")
private val ICONES = listOf(Icons.Rounded.Home, Icons.Rounded.List, Icons.Rounded.Favorite, Icons.Rounded.Notifications, Icons.Rounded.Person)

@Composable
fun TelaPrincipal(m: Modelo, aba: Int) {
    Scaffold(bottomBar = {
        // Barra do KV: branca, item ativo em rosa.
        val c = MaterialTheme.colorScheme
        val cores = NavigationBarItemDefaults.colors(selectedIconColor = c.onPrimaryContainer, selectedTextColor = c.primary, indicatorColor = c.primaryContainer,
            unselectedIconColor = c.onSurfaceVariant, unselectedTextColor = c.onSurfaceVariant)
        NavigationBar(containerColor = c.surfaceContainerLow) {
            ABAS.forEachIndexed { i, nome ->
                NavigationBarItem(selected = i == aba, onClick = { m.raiz(Tela.Principal(i)) }, colors = cores, label = { Text(nome, style = MaterialTheme.typography.labelMedium) }, icon = {
                    BadgedBox(badge = { if (i == Abas.AVISOS && m.naoLidos > 0) Badge { Text(m.naoLidos.toString()) } }) {
                        Icon(ICONES[i], contentDescription = null) // o rótulo embaixo já nomeia a aba
                    }
                })
            }
        }
    }) { margem ->
        Box(Modifier.padding(margem).fillMaxSize()) {
            when (aba) {
                Abas.INICIO -> AbaInicio(m)
                Abas.CATEGORIAS -> AbaCategorias(m)
                Abas.FAVORITOS -> AbaFavoritos(m)
                Abas.AVISOS -> AbaAvisos(m)
                else -> AbaConta(m)
            }
        }
    }
    // Convite das notificações, logo que a pessoa entra no app (DECISIONS 104).
    ConviteNotificacoes(m)
}

// ------------------------------------------------------------------------------------------------ avisos
@Composable
fun AbaAvisos(m: Modelo) {
    val escopo = rememberCoroutineScope()
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(16.dp, 16.dp, 8.dp, 4.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Avisos", style = MaterialTheme.typography.titleLarge)
            TextButton({
                escopo.launch {
                    try {
                        val agora = java.time.Instant.now().toString()
                        m.api.post("/v1/avisos/leitura", JSONObject().put("ate", agora))
                        m.atualizarNaoLidos(); m.mudou()
                    } catch (_: SemConexao) {}
                }
            }) { Text("Marcar todos como lidos") }
        }
        Carregar(m.versao, { m.api.get("/v1/avisos?limite=50") }, puxar = true) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            LaunchedEffect(corpo.optInt("nao_lidos")) { m.naoLidos = corpo.optInt("nao_lidos") }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) { Vazio("Nenhum aviso ainda. As promoções excepcionais das suas categorias e os avisos dos produtos que você segue chegam aqui."); return@Carregar }
            LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(itens, key = { it.getString("id") }) { a ->
                    val lido = !a.isNull("lido_em")
                    val alerta = a.textoOuNulo("alerta_id")
                    Cartao(aoTocar = {
                        escopo.launch {
                            try { m.api.post("/v1/avisos/leitura", JSONObject().put("ids", org.json.JSONArray(listOf(a.getString("id"))))); m.atualizarNaoLidos() } catch (_: SemConexao) {}
                        }
                        if (alerta != null) m.ir(Tela.Alerta(alerta, "central")) else m.ir(Tela.Produto(a.getJSONObject("produto").getString("id")))
                    }) {
                        Column(Modifier.padding(14.dp)) {
                            Text(tituloDoAviso(a.getString("tipo")), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, fontWeight = if (lido) FontWeight.Normal else FontWeight.Bold)
                            Text(a.getJSONObject("produto").getString("nome"), style = MaterialTheme.typography.titleSmall)
                            val preco = a.inteiroOuNulo("preco_centavos")
                            Text(listOfNotNull(a.optJSONObject("loja")?.getString("nome"), preco?.let { reais(it) }, dataHora(a.getString("criado_em"))).joinToString(" · "),
                                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

private fun tituloDoAviso(tipo: String) = when (tipo) {
    "promocao_excepcional" -> "Promoção excepcional"
    "queda_percentual" -> "Queda de preço"
    "voltou_estoque" -> "Voltou ao estoque"
    "menor_preco_180d" -> "Menor preço em 180 dias"
    "promocao_acabando" -> "Promoção acabando"
    else -> tipo
}

// ------------------------------------------------------------------------------------------------ conta
@Composable
fun AbaConta(m: Modelo) {
    val escopo = rememberCoroutineScope()
    val contexto = LocalContext.current
    val u = m.usuario
    var mensagem by remember { mutableStateOf<String?>(null) }
    var confirmarExclusao by remember { mutableStateOf(false) }
    // Recalcula ao voltar das configurações do Android (a versão muda quando a conta recarrega).
    var permitidas by remember(m.versao, u) { mutableStateOf(Push.permitido(contexto)) }
    val pedirNotificacoes = rememberPedirNotificacoes { ok ->
        permitidas = ok
        escopo.launch {
            try {
                m.api.put("/v1/me/consentimentos", JSONObject().put("notificacoes", true))
                m.recarregarUsuario()
                Push.registrar(m.api)
            } catch (e: SemConexao) { mensagem = e.message }
        }
    }
    if (u == null) { Erro("Conta não carregada."); return }
    val plano = u.getJSONObject("plano")
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), Arrangement.spacedBy(6.dp)) {
        Text("Perfil", style = MaterialTheme.typography.titleLarge)
        Text(u.getString("email"))
        Text("Plano ${plano.getString("tipo")} · ${plano.getInt("ceps_permitidos")} CEP(s)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Entrou por: ${u.getJSONArray("metodos_login").textos().joinToString(", ")}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        HorizontalDivider(Modifier.padding(vertical = 8.dp))

        OutlinedButton({ m.ir(Tela.Preferencias) }, Modifier.fillMaxWidth()) { Text("Categorias e CEP") }
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Avisos por notificação", Modifier.weight(1f))
            Switch(u.getBoolean("notificacoes_consentidas"), { ligado ->
                // Ligar pede a permissão do Android (13+) e registra o aparelho; desligar faz a API apagar o registro dos aparelhos.
                if (ligado) pedirNotificacoes()
                else escopo.launch {
                    try { m.api.put("/v1/me/consentimentos", JSONObject().put("notificacoes", false)); m.recarregarUsuario() } catch (e: SemConexao) { mensagem = e.message }
                }
            })
        }
        if (u.getBoolean("notificacoes_consentidas") && !permitidas) {
            Text(TEXTO_NOTIFICACAO_BLOQUEADA, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            // Pede ao Android; se ele não deixar mais perguntar, leva às configurações.
            TextButton({ pedirNotificacoes() }) { Text("Permitir notificações") }
        } else {
            Text("Promoções excepcionais das categorias escolhidas e avisos dos produtos que você segue, respeitando o silêncio e o limite diário.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Titulo("Silenciados")
        Carregar(m.versao, { m.api.get("/v1/silenciamentos") }) { r, _ ->
            val itens = r.corpo?.lista("itens") ?: emptyList()
            if (itens.isEmpty()) Text("Nada silenciado.", style = MaterialTheme.typography.bodySmall)
            itens.forEach { s ->
                Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
                    Text("${s.getString("nome")} (${s.getString("tipo")}, ${if (s.getString("alcance") == "tudo") "some de tudo" else "sem push"})", Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
                    TextButton({ escopo.launch { try { m.api.delete("/v1/silenciamentos/${s.getString("tipo")}/${s.getString("alvo")}"); m.mudou() } catch (e: SemConexao) { mensagem = e.message } } }) { Text("Remover") }
                }
            }
        }
        Titulo("Produtos que você segue")
        Carregar(m.versao, { m.api.get("/v1/seguidos?limite=50") }) { r, _ ->
            val itens = r.corpo?.lista("itens") ?: emptyList()
            if (itens.isEmpty()) Text("Você ainda não segue nenhum produto. Abra um produto e toque em Seguir.", style = MaterialTheme.typography.bodySmall)
            itens.forEach { s ->
                val p = s.getJSONObject("produto")
                Text(p.getString("nome"), Modifier.fillMaxWidth().clickable { m.ir(Tela.Produto(p.getString("id"))) }.padding(vertical = 6.dp), style = MaterialTheme.typography.bodyMedium)
            }
        }
        HorizontalDivider(Modifier.padding(vertical = 8.dp))

        OutlinedButton({
            escopo.launch {
                try {
                    val r = m.api.get("/v1/me/exportacao")
                    if (r.ok) {
                        val envio = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, "economae-dados.json").putExtra(Intent.EXTRA_TEXT, r.bruto)
                        contexto.startActivity(Intent.createChooser(envio, "Seus dados").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    } else mensagem = if (r.codigo == "muitas_requisicoes") "Você já exportou há pouco. Tente daqui a 1 hora." else r.mensagem
                } catch (e: SemConexao) { mensagem = e.message }
            }
        }, Modifier.fillMaxWidth()) { Text("Exportar meus dados") }
        OutlinedButton({
            escopo.launch { try { m.api.post("/v1/auth/sair") } catch (_: SemConexao) {}; m.sair() }
        }, Modifier.fillMaxWidth()) { Text("Sair") }
        OutlinedButton({ confirmarExclusao = true }, Modifier.fillMaxWidth()) { Text("Excluir minha conta", color = MaterialTheme.colorScheme.error) }
        mensagem?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        Spacer(Modifier.height(8.dp))
        Text("Servidor: ${m.arm.servidor}\nVersão ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (confirmarExclusao) {
        AlertDialog(onDismissRequest = { confirmarExclusao = false },
            title = { Text("Excluir a conta?") },
            text = { Text("Isso apaga seus dados (preferências, produtos seguidos, avisos, avaliações) e não dá para desfazer.") },
            confirmButton = {
                TextButton({
                    confirmarExclusao = false
                    escopo.launch {
                        try {
                            val r = m.api.delete("/v1/me", JSONObject().put("confirmacao", "excluir"))
                            if (r.ok) m.sair() else mensagem = r.mensagem
                        } catch (e: SemConexao) { mensagem = e.message }
                    }
                }) { Text("Excluir", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton({ confirmarExclusao = false }) { Text("Cancelar") } })
    }
}
