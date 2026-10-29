package br.com.economae

import android.app.Activity
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun TelaEntrar(m: Modelo) {
    val escopo = rememberCoroutineScope()
    val contexto = LocalContext.current
    var servidor by remember { mutableStateOf(m.arm.servidor) }
    var email by remember { mutableStateOf("") }
    var codigo by remember { mutableStateOf("") }
    var enviado by remember { mutableStateOf(false) }
    var ocupado by remember { mutableStateOf(false) }
    var aviso by remember { mutableStateOf<String?>(null) }
    var erro by remember { mutableStateOf<String?>(null) }

    suspend fun testar() {
        m.arm.servidor = servidor
        val r = m.api.get("/v1/configuracao", auth = false)
        if (r.ok && r.corpo != null) { m.config = r.corpo; erro = null; aviso = "Conectado: ${r.corpo.getString("nome_app")}." }
        else { m.config = null; erro = r.mensagem }
    }

    // Se já tem sessão guardada, retoma sem pedir de novo.
    LaunchedEffect(Unit) {
        if (m.arm.access != null && m.arm.servidor.isNotBlank()) {
            ocupado = true
            try { testar(); m.seguirFluxo() } catch (e: SemConexao) { erro = e.message }
            ocupado = false
        }
    }

    fun executar(bloco: suspend () -> Unit) {
        escopo.launch {
            ocupado = true; erro = null; aviso = null
            try { bloco() } catch (e: SemConexao) { erro = e.message } catch (e: Exception) { erro = e.message ?: "Erro inesperado." }
            ocupado = false
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        AberturaDaMarca()
        Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 24.dp), Arrangement.spacedBy(12.dp)) {
            Titulo("Servidor")
            OutlinedTextField(servidor, { servidor = it }, label = { Text("Endereço do servidor") }, placeholder = { Text("https://....trycloudflare.com") },
                singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri), modifier = Modifier.fillMaxWidth())
            OutlinedButton(onClick = { executar { testar() } }, enabled = !ocupado && servidor.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Testar conexão") }

            val metodos = m.config?.optJSONArray("metodos_login")?.textos() ?: emptyList()
            if (m.config != null) {
                Titulo("Entrar por e-mail")
                OutlinedTextField(email, { email = it }, label = { Text("Seu e-mail") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
                Botao(if (enviado) "Enviar o código de novo" else "Enviar código", !ocupado && email.contains("@")) {
                    executar {
                        val r = m.api.post("/v1/auth/email/codigo", JSONObject().put("email", email.trim()), auth = false)
                        if (r.ok) { enviado = true; aviso = "Código enviado. Olhe sua caixa de entrada (e o spam). Vale por 10 minutos." } else erro = r.mensagem
                    }
                }
                if (enviado) {
                    OutlinedTextField(codigo, { codigo = it.filter(Char::isDigit).take(6) }, label = { Text("Código de 6 dígitos") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword), modifier = Modifier.fillMaxWidth())
                    Botao("Entrar", !ocupado && codigo.length == 6) {
                        executar {
                            val r = m.api.post("/v1/auth/email/verificar", JSONObject().put("email", email.trim()).put("codigo", codigo), auth = false)
                            if (r.ok && r.corpo != null) { m.api.guardarSessao(r.corpo); m.seguirFluxo() } else erro = r.mensagem
                        }
                    }
                }
                if ("google" in metodos) {
                    Titulo("Ou")
                    OutlinedButton(onClick = {
                        executar {
                            val token = pedirTokenGoogle(contexto as Activity)
                            val r = m.api.post("/v1/auth/google", JSONObject().put("id_token", token), auth = false)
                            if (r.ok && r.corpo != null) { m.api.guardarSessao(r.corpo); m.seguirFluxo() } else erro = r.mensagem
                        }
                    }, enabled = !ocupado, modifier = Modifier.fillMaxWidth()) { Text("Entrar com Google") }
                }
            }
            aviso?.let { Text(it, color = MaterialTheme.colorScheme.primary) }
            erro?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        }
    }
}

/** Topo da entrada, como a tela de boas-vindas do KV: onda, ilustração, logotipo e a frase da marca. */
@Composable
private fun AberturaDaMarca() {
    Box(Modifier.fillMaxWidth()) {
        // A onda é uma forma de uma cor só; o tema a pinta (rosa-claro no claro, vinho no escuro).
        Image(painterResource(R.drawable.arte_onda), contentDescription = null, contentScale = ContentScale.FillWidth,
            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.primaryContainer), modifier = Modifier.fillMaxWidth())
        Column(Modifier.fillMaxWidth().padding(top = 32.dp, start = 24.dp, end = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Logotipo(estilo = MaterialTheme.typography.displaySmall)
            Spacer(Modifier.height(8.dp))
            Text("Mais amor no seu dia a dia,\npor menos.", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.secondary, textAlign = TextAlign.Center)
            Spacer(Modifier.height(16.dp))
            // Decorativa: não carrega informação, o leitor de tela pula.
            Image(painterResource(R.drawable.arte_mae), contentDescription = null, modifier = Modifier.size(width = 124.dp, height = 160.dp))
            Spacer(Modifier.height(12.dp))
            Text("Prévia de teste. Avisos de queda de preço de fraldas, higiene e mais.", style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}

private class GoogleFalhou(mensagem: String) : Exception(mensagem)

/** ID token do Google pelo Credential Manager, pedido para o cliente Web do servidor (`serverClientId`). */
private suspend fun pedirTokenGoogle(atividade: Activity): String {
    val opcao = GetGoogleIdOption.Builder()
        .setFilterByAuthorizedAccounts(false)
        .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
        .build()
    val pedido = GetCredentialRequest.Builder().addCredentialOption(opcao).build()
    val credencial = try {
        CredentialManager.create(atividade).getCredential(atividade, pedido).credential
    } catch (e: GetCredentialCancellationException) {
        throw GoogleFalhou("Entrada com Google cancelada.")
    } catch (e: GetCredentialException) {
        throw GoogleFalhou("Não deu para entrar com Google (${e.type}). Neste teste só a conta de teste cadastrada consegue entrar. ${e.message ?: ""}".trim())
    }
    if (credencial is CustomCredential && credencial.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
        return GoogleIdTokenCredential.createFrom(credencial.data).idToken
    }
    throw GoogleFalhou("O Google devolveu um tipo de credencial inesperado.")
}
