package br.com.economae

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import org.json.JSONObject

/** Uma fileira do Início já pronta para desenhar. */
class FileiraInicio(val id: String, val titulo: String, val itens: List<JSONObject>, val verTodas: VerTodas?)

/**
 * Aba Início, no modelo das lojas (Shopee, Mercado Livre, Amazon): topo com o CEP de entrega e a busca, atalhos de categoria, as
 * fileiras de GET /v1/inicio (fileira sem produto não vem), "Vistos recentemente" (guardado no aparelho) e, no fim, a grade
 * "Para você", que não acaba: quedas verificadas primeiro, depois menor preço em 180 dias, depois o resto, alternando categorias.
 */
@Composable
fun AbaInicio(m: Modelo) {
    var cep by remember { mutableStateOf<String?>(null) }
    var fileiras by remember { mutableStateOf<List<FileiraInicio>>(emptyList()) }
    var vistos by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    LaunchedEffect(Unit) {
        try {
            val r = m.api.get("/v1/inicio")
            val c = r.corpo
            if (r.ok && c != null) {
                cep = c.textoOuNulo("cep")
                fileiras = c.lista("fileiras").map { f ->
                    FileiraInicio(f.getString("id"), f.getString("titulo"), f.lista("itens"), f.optJSONObject("ver_todas")?.let(::verTodasDe))
                }
            }
        } catch (_: SemConexao) {} // sem as fileiras, a grade "Para você" ainda mostra o erro e o "tentar de novo"
        val ids = m.arm.vistos
        if (ids.isNotEmpty()) try {
            val r = m.api.get("/v1/produtos?limite=30&ids=" + ids.take(30).joinToString(","))
            if (r.ok && r.corpo != null) vistos = naOrdemDosVistos(ids, r.corpo.lista("itens"))
        } catch (_: SemConexao) {}
    }
    val todas = comVistos(fileiras, vistos)

    ListaProdutos(m, consultaProdutos(ordem = Ordem.ParaVoce), "Ainda não há ofertas nas lojas que entregam no seu CEP, nas categorias que você escolheu.", grade = true,
        rodapeVazio = {
            linhaInteira("mudar") { OutlinedButton({ m.ir(Tela.Preferencias) }, Modifier.fillMaxWidth()) { Text("Mudar categorias e CEP") } }
        }) {
        linhaInteira("topo") {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Logotipo()
                EntregandoEm(cep) { m.ir(Tela.Preferencias) }
                CampoBuscaFalso("Buscar produtos, marcas ou categorias…") { m.ir(Tela.Busca()) }
            }
        }
        linhaInteira("categorias") {
            Row(Modifier.fillMaxWidth(), Arrangement.SpaceEvenly) {
                m.categorias.forEach { c -> CirculoDeCategoria(c) { m.ir(Tela.Categoria(c.getString("slug"))) } }
            }
        }
        todas.forEach { f ->
            fileira(m, f.titulo, f.itens, f.id, f.verTodas?.let { v -> { m.ir(Tela.Lista(f.titulo, v)) } })
        }
        // O feed de alertas continua: é o único lugar dos produtos com aviso legal (NBCAL), que não entram nas listas.
        linhaInteira("promocoes") {
            TextButton({ m.ir(Tela.Feed) }, Modifier.fillMaxWidth()) { Text("Todas as promoções verificadas →") }
        }
        linhaInteira("para-voce") { Text("Para você", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 4.dp)) }
    }
}

/** "Vistos recentemente" entra depois das fileiras de queda e de favoritos (o que mudou de preço vem antes do que a pessoa já viu). */
fun comVistos(fileiras: List<FileiraInicio>, vistos: List<JSONObject>): List<FileiraInicio> {
    if (vistos.isEmpty()) return fileiras
    val depois = fileiras.indexOfLast { it.id == "baixaram_de_preco" || it.id == "favoritos_mais_baratos" } + 1
    return fileiras.take(depois) + FileiraInicio("vistos", "Vistos recentemente", vistos, null) + fileiras.drop(depois)
}

/** "Entregando em 14020-260 ›": o CEP muda tudo o que aparece, então fica à vista; tocar leva às preferências. */
@Composable
fun EntregandoEm(cep: String?, aoTocar: () -> Unit) {
    Row(Modifier.clickable(role = Role.Button, onClick = aoTocar).padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Text(if (cep != null) "Entregando em ${cepBonito(cep)}" else "Informe seu CEP", style = MaterialTheme.typography.bodyMedium)
        Icon(Icons.AutoMirrored.Rounded.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(18.dp))
    }
}

@Composable
fun CirculoDeCategoria(c: JSONObject, aoAbrir: () -> Unit) {
    val slug = c.getString("slug")
    val cores = coresDaCategoria(slug)
    Column(Modifier.clickable(role = Role.Button, onClick = aoAbrir).padding(4.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Surface(shape = CircleShape, color = cores.fundo, contentColor = cores.texto, modifier = Modifier.size(64.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(iconeDaCategoria(slug), contentDescription = null, modifier = Modifier.size(28.dp)) }
        }
        Text(c.getString("rotulo"), style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center)
    }
}
