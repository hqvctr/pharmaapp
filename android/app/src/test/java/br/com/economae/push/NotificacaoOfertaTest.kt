package br.com.economae.push

import android.app.Application
import android.app.Notification
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

/** A notificação que o app monta com os dados do push (o backend manda só "data"). */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [36], application = Application::class)
class NotificacaoOfertaTest {
    private val contexto: Application = ApplicationProvider.getApplicationContext()
    private val aviso = "O Ministério da Saúde informa: o aleitamento materno evita infecções e alergias e é recomendado até os 2 (dois) anos de idade ou mais."
    private val dados = mapOf(
        "tipo" to "oferta", "ofertaId" to "o1", "entregaId" to "e1", "loja" to "Farmácia Vida", "privado" to "0",
        "titulo" to "R\$ 5,90 · Papinha Nutri+…", "corpo" to "Menor preço em 94 dias: R\$ 2,59 a menos",
        "expandido" to "Menor preço em 94 dias: R\$ 2,59 a menos\nPreço normal nesta loja: R\$ 8,49.\n$aviso",
        "canal" to "ofertas", "tag" to "o1",
    )

    @Test
    fun `título, corpo, loja e o aviso da NBCAL inteiro no texto aberto`() {
        val n = NotificacaoOferta.construir(contexto, NotificacaoOferta.ler(dados)!!)
        assertEquals("R\$ 5,90 · Papinha Nutri+…", n.extras.getString(Notification.EXTRA_TITLE))
        assertEquals("Menor preço em 94 dias: R\$ 2,59 a menos", n.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
        assertEquals("Farmácia Vida", n.extras.getCharSequence(Notification.EXTRA_SUB_TEXT).toString())
        assertEquals(true, n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString().endsWith(aviso))
        assertNull(n.publicVersion)
    }

    @Test
    fun `categoria privada troca o conteúdo da tela bloqueada por uma versão pública`() {
        val n = NotificacaoOferta.construir(contexto, NotificacaoOferta.ler(dados + ("privado" to "1"))!!)
        val publica = n.publicVersion
        assertEquals(Notification.VISIBILITY_PRIVATE, n.visibility)
        assertNotNull(publica)
        assertEquals("Nova oferta excepcional", publica!!.extras.getString(Notification.EXTRA_TITLE))
        assertEquals("Desbloqueie o celular para ver", publica.extras.getCharSequence(Notification.EXTRA_TEXT).toString())
    }

    @Test
    fun `mensagem sem oferta ou sem título não vira notificação`() {
        assertNull(NotificacaoOferta.ler(dados - "ofertaId"))
        assertNull(NotificacaoOferta.ler(dados - "titulo"))
    }
}
