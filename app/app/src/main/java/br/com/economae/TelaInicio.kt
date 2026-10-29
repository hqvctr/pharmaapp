package br.com.economae

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import org.json.JSONObject

/**
 * Aba Início (02 do KV): busca, faixa de boas-vindas, "Explore por categoria" e a vitrine "Ofertas em destaque".
 * A vitrine mostra os alertas de queda quando há (o motor só gera depois de 14 dias de histórico); senão, produtos do catálogo
 * que dá para comprar agora, um pouco de cada categoria.
 */
@Composable
fun AbaInicio(m: Modelo) {
    val cats = m.categorias
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Logotipo(modifier = Modifier.padding(horizontal = 16.dp))
        CampoBuscaFalso("Buscar produtos, marcas ou categorias…", Modifier.padding(horizontal = 16.dp)) { m.ir(Tela.Busca()) }
        Faixa("Cuidado em cada fase", "Ofertas para você e para quem você ama.", MaterialTheme.colorScheme.primaryContainer, MaterialTheme.colorScheme.onPrimaryContainer,
            Modifier.padding(horizontal = 16.dp), botao = "Ver ofertas" to { m.raiz(Tela.Principal(Abas.CATEGORIAS)) })

        Text("Explore por categoria", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 16.dp))
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), Arrangement.SpaceEvenly) {
            cats.forEach { c -> CirculoDeCategoria(c) { m.ir(Tela.Categoria(c.getString("slug"))) } }
        }

        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), Arrangement.SpaceBetween, Alignment.CenterVertically) {
            Text("Ofertas em destaque", style = MaterialTheme.typography.titleMedium)
            TextButton({ m.ir(Tela.Feed) }) { Text("Ver todas →") }
        }
        Carregar(listOf("destaques", cats.size), { buscarDestaques(m, cats) }) { destaques, recarregar ->
            if (destaques.isEmpty()) {
                Text("Ainda não há ofertas para mostrar. Toque numa categoria para ver o que as lojas têm.", style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = 16.dp))
            } else {
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(destaques) { d -> CartaoDestaque(d, Modifier.width(170.dp)) { m.ir(d.tela) } }
                }
            }
        }
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

/** Alertas de queda (até 10) ou, sem nenhum, até 12 produtos intercalados entre as categorias. Falha de uma categoria não derruba as outras. */
suspend fun buscarDestaques(m: Modelo, cats: List<JSONObject>): List<Destaque> = coroutineScope {
    // Tudo em paralelo: alertas e uma página de cada categoria (em série, o Início esperava a soma das respostas).
    val alertas = async { m.api.get("/v1/alertas?limite=10") }
    val porCategoria = cats.map { c -> async { m.api.get(consultaProdutos(categoria = c.getString("slug"), limite = 4)) } }
    val a = alertas.await()
    val deAlertas = if (a.ok) a.corpo?.lista("itens")?.map(::destaqueDeAlerta) ?: emptyList() else emptyList()
    if (deAlertas.isNotEmpty()) return@coroutineScope deAlertas
    intercalar(porCategoria.map { r -> val x = r.await(); if (x.ok) x.corpo?.lista("itens")?.map(::destaqueDeProduto) ?: emptyList() else emptyList() }, 12)
}
