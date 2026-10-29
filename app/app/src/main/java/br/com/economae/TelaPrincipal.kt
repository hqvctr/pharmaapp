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
import androidx.compose.material.icons.rounded.Search
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

private val ABAS = listOf("Promoções", "Buscar", "Avisos", "Conta")
private val ICONES = listOf(Icons.Rounded.Home, Icons.Rounded.Search, Icons.Rounded.Notifications, Icons.Rounded.Person)

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
                    BadgedBox(badge = { if (i == 2 && m.naoLidos > 0) Badge { Text(m.naoLidos.toString()) } }) {
                        Icon(ICONES[i], contentDescription = null) // o rótulo embaixo já nomeia a aba
                    }
                })
            }
        }
    }) { margem ->
        Box(Modifier.padding(margem).fillMaxSize()) {
            when (aba) {
                0 -> AbaFeed(m)
                1 -> AbaBuscar(m)
                2 -> AbaAvisos(m)
                else -> AbaConta(m)
            }
        }
    }
}

// ------------------------------------------------------------------------------------------------ feed
@Composable
fun AbaFeed(m: Modelo) {
    var categoria by remember { mutableStateOf<String?>(null) }
    val cats = m.config?.optJSONArray("categorias")?.objetos() ?: emptyList()
    Column(Modifier.fillMaxSize()) {
        Logotipo(modifier = Modifier.padding(16.dp, 16.dp, 16.dp, 0.dp))
        Text("Promoções para você", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(16.dp, 8.dp, 16.dp, 4.dp))
        // Chips do KV: o escolhido em rosa cheio.
        val coresChip = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary)
        LazyRow(contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { FilterChip(categoria == null, { categoria = null }, { Text("Todas") }, colors = coresChip) }
            items(cats) { c -> FilterChip(categoria == c.getString("slug"), { categoria = c.getString("slug") }, { Text(c.getString("rotulo")) }, colors = coresChip) }
        }
        Carregar(listOf(categoria, m.versao), {
            m.api.get("/v1/alertas?limite=30" + (categoria?.let { "&categoria=$it" } ?: ""))
        }) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) {
                val motivo = when (corpo.textoOuNulo("vazio_por")) {
                    "sem_ceps" -> "Você ainda não cadastrou um CEP. Vá em Conta → Categorias e CEP."
                    "sem_categorias" -> "Você ainda não escolheu categorias. Vá em Conta → Categorias e CEP."
                    else -> "Nenhuma promoção ativa agora. O feed só mostra ofertas coletadas nas últimas horas, das categorias que você marcou."
                }
                var escolhidas by remember { mutableStateOf<String?>(null) }
                LaunchedEffect(m.versao) {
                    try {
                        val p = m.api.get("/v1/preferencias")
                        val rotulos = m.config?.optJSONArray("categorias")?.objetos()?.associate { it.getString("slug") to it.getString("rotulo") } ?: emptyMap()
                        if (p.ok && p.corpo != null) escolhidas = p.corpo.getJSONArray("categorias").textos().joinToString(", ") { rotulos[it] ?: it }
                    } catch (_: SemConexao) {}
                }
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), Arrangement.spacedBy(12.dp), Alignment.CenterHorizontally) {
                    // Decorativa: o texto abaixo explica o vazio.
                    Image(painterResource(R.drawable.arte_vazio_feed), contentDescription = null, modifier = Modifier.size(120.dp))
                    Text(motivo, style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center)
                    escolhidas?.takeIf { it.isNotBlank() }?.let {
                        Text("Categorias que você acompanha: $it.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                        Text("Se nenhuma delas tem oferta coletada agora, a lista fica vazia. Troque em Conta → Categorias e CEP.", style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
                    }
                    Botao("Mudar categorias e CEP") { m.ir(Tela.Preferencias) }
                    OutlinedButton(recarregar, Modifier.fillMaxWidth()) { Text("Atualizar") }
                }
                return@Carregar
            }
            LazyColumn(contentPadding = androidx.compose.foundation.layout.PaddingValues(12.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(itens, key = { it.getString("id") }) { a -> CartaoAlerta(a) { m.ir(Tela.Alerta(a.getString("id"))) } }
                item { OutlinedButton(recarregar, Modifier.fillMaxWidth()) { Text("Atualizar") } }
            }
        }
    }
}

@Composable
fun CartaoAlerta(a: JSONObject, aoAbrir: () -> Unit) {
    val p = a.getJSONObject("produto")
    val loja = a.getJSONObject("loja")
    val queda = percentual(a.getDouble("queda"))
    // Cartão das listas do KV: selos no topo, nome, loja, preço em verde e o de antes em cinza.
    Cartao(aoTocar = aoAbrir) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                if (a.optBoolean("destaque")) Selo("DESTAQUE", TipoSelo.Destaque)
                a.textoOuNulo("rotulo_condicao")?.let { Selo(it, tipoDoRotulo(it)) }
                Spacer(Modifier.weight(1f))
                Selo("-$queda", TipoSelo.Queda, descricao = "queda de $queda")
            }
            Text(p.getString("nome"), style = MaterialTheme.typography.titleSmall)
            Text("${loja.getString("nome")} · ${embalagemTexto(p)}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(reais(a.getInt("preco_centavos")), style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.tertiary)
                Text("antes ${reais(a.getInt("preco_referencia_centavos"))}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp))
            }
            if (a.getString("situacao") != "ativa") Text("Esta promoção já acabou ou está em revisão", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

// ------------------------------------------------------------------------------------------------ buscar
@Composable
fun AbaBuscar(m: Modelo) {
    var texto by remember { mutableStateOf("") }
    var consulta by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(12.dp)) {
        OutlinedTextField(texto, { texto = it }, label = { Text("Nome, marca ou código de barras") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { consulta = texto.trim() }))
        Spacer(Modifier.height(8.dp))
        if (consulta.length < 2) { Vazio("Digite pelo menos 2 letras e toque em buscar."); return@Column }
        Carregar(listOf(consulta, m.versao), { m.api.get("/v1/produtos?limite=30&q=" + java.net.URLEncoder.encode(consulta, "UTF-8")) }) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) { Vazio("Nenhum produto encontrado para \"$consulta\"."); return@Carregar }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(itens, key = { it.getString("id") }) { p ->
                    Cartao(aoTocar = { m.ir(Tela.Produto(p.getString("id"))) }) {
                        Column(Modifier.padding(14.dp)) {
                            Text(p.getString("nome"), style = MaterialTheme.typography.titleSmall)
                            Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween) {
                                Text(embalagemTexto(p), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                val menor = p.inteiroOuNulo("menor_preco_centavos")
                                if (menor != null) Text("a partir de ${reais(menor)}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.tertiary)
                                else Text("sem oferta na sua região", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            if (p.optBoolean("seguido")) Text("★ seguindo", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
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
        Carregar(m.versao, { m.api.get("/v1/avisos?limite=50") }) { r, recarregar ->
            val corpo = r.corpo
            if (!r.ok || corpo == null) { Erro(r.mensagem, recarregar); return@Carregar }
            LaunchedEffect(corpo.optInt("nao_lidos")) { m.naoLidos = corpo.optInt("nao_lidos") }
            val itens = corpo.lista("itens")
            if (itens.isEmpty()) { Vazio("Nenhum aviso ainda. Os avisos dos produtos que você segue chegam aqui (o envio automático ainda não existe nesta prévia)."); return@Carregar }
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
    if (u == null) { Erro("Conta não carregada."); return }
    val plano = u.getJSONObject("plano")
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), Arrangement.spacedBy(6.dp)) {
        Text("Conta", style = MaterialTheme.typography.titleLarge)
        Text(u.getString("email"))
        Text("Plano ${plano.getString("tipo")} · ${plano.getInt("ceps_permitidos")} CEP(s)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text("Entrou por: ${u.getJSONArray("metodos_login").textos().joinToString(", ")}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        HorizontalDivider(Modifier.padding(vertical = 8.dp))

        OutlinedButton({ m.ir(Tela.Preferencias) }, Modifier.fillMaxWidth()) { Text("Categorias e CEP") }
        Row(Modifier.fillMaxWidth(), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Avisos por notificação", Modifier.weight(1f))
            Switch(u.getBoolean("notificacoes_consentidas"), { ligado ->
                escopo.launch {
                    try { m.api.put("/v1/me/consentimentos", JSONObject().put("notificacoes", ligado)); m.recarregarUsuario() } catch (e: SemConexao) { mensagem = e.message }
                }
            })
        }
        Text("O envio de notificações push ainda não existe nesta prévia; esta chave só grava o seu consentimento.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

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
