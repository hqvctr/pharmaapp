package br.com.economae

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

fun abrirNoNavegador(contexto: android.content.Context, url: String) {
    contexto.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
}

@Composable
fun TelaTermos(m: Modelo) {
    val escopo = rememberCoroutineScope()
    val contexto = LocalContext.current
    val cfg = m.config
    var aceito by remember { mutableStateOf(false) }
    var notificacoes by remember { mutableStateOf(false) }
    var ocupado by remember { mutableStateOf(false) }
    var erro by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), Arrangement.spacedBy(12.dp)) {
        Text("Antes de começar", style = MaterialTheme.typography.headlineSmall)
        Text("Leia os termos de uso e a política de privacidade. Os textos ainda estão em revisão jurídica (prévia).")
        if (cfg != null) {
            OutlinedButton({ abrirNoNavegador(contexto, cfg.getJSONObject("termos").getString("url")) }, Modifier.fillMaxWidth()) { Text("Ler os termos de uso") }
            OutlinedButton({ abrirNoNavegador(contexto, cfg.getJSONObject("privacidade").getString("url")) }, Modifier.fillMaxWidth()) { Text("Ler a política de privacidade") }
        }
        Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(aceito, { aceito = it }); Text("Li e aceito os termos e a política", Modifier.weight(1f)) }
        Row(verticalAlignment = Alignment.CenterVertically) { Switch(notificacoes, { notificacoes = it }); Text("  Quero receber avisos de queda de preço (as notificações push ainda não funcionam nesta prévia)", Modifier.weight(1f)) }
        Botao("Continuar", aceito && !ocupado && cfg != null) {
            escopo.launch {
                ocupado = true; erro = null
                try {
                    val corpo = JSONObject().put("termos_versao", cfg!!.getJSONObject("termos").getString("versao")).put("notificacoes", notificacoes)
                    val r = m.api.put("/v1/me/consentimentos", corpo)
                    if (r.ok) m.seguirFluxo() else erro = r.mensagem
                } catch (e: SemConexao) { erro = e.message }
                ocupado = false
            }
        }
        erro?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    }
}

@Composable
fun TelaPreferencias(m: Modelo, aoSalvar: () -> Unit) {
    val escopo = rememberCoroutineScope()
    val cfg = m.config
    val limiteCeps = m.usuario?.getJSONObject("plano")?.getInt("ceps_permitidos") ?: 1
    Carregar(m.versao, { m.api.get("/v1/preferencias") }) { r, _ ->
        val p = r.corpo
        if (!r.ok || p == null || cfg == null) { Erro(r.mensagem.ifBlank { "Configuração indisponível." }); return@Carregar }
        val escolhidas = remember { mutableStateListOf<String>().also { it.addAll(p.getJSONArray("categorias").textos()) } }
        val ceps = remember { mutableStateListOf<String>().also { l -> l.addAll(p.getJSONArray("ceps").textos()); if (l.isEmpty()) l.add("") } }
        var ocupado by remember { mutableStateOf(false) }
        var erro by remember { mutableStateOf<String?>(null) }
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp), Arrangement.spacedBy(8.dp)) {
            Text("O que você quer acompanhar", style = MaterialTheme.typography.headlineSmall)
            cfg.getJSONArray("categorias").objetos().forEach { c ->
                val slug = c.getString("slug")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(slug in escolhidas, { if (it) escolhidas.add(slug) else escolhidas.remove(slug) })
                    Text(c.getString("rotulo"))
                }
            }
            Titulo("Onde você recebe")
            Text(if (limiteCeps == 1) "No plano gratuito vale 1 CEP (só números, 8 dígitos)." else "Até $limiteCeps CEPs (só números, 8 dígitos).", style = MaterialTheme.typography.bodyMedium)
            ceps.forEachIndexed { i, c ->
                OutlinedTextField(c, { ceps[i] = it.filter(Char::isDigit).take(8) }, label = { Text("CEP ${i + 1}") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
            }
            if (ceps.size < limiteCeps) OutlinedButton({ ceps.add("") }) { Text("Adicionar CEP") }
            Botao("Salvar", !ocupado && escolhidas.isNotEmpty() && ceps.all { it.length == 8 }) {
                escopo.launch {
                    ocupado = true; erro = null
                    try {
                        val corpo = JSONObject().put("categorias", JSONArray(escolhidas.toList())).put("ceps", JSONArray(ceps.toList()))
                            .put("silencio", p.opt("silencio") ?: JSONObject.NULL).put("limite_diario", p.opt("limite_diario") ?: JSONObject.NULL)
                        val s = m.api.put("/v1/preferencias", corpo)
                        if (s.ok) { m.mudou(); aoSalvar() } else erro = s.mensagem
                    } catch (e: SemConexao) { erro = e.message }
                    ocupado = false
                }
            }
            erro?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}
