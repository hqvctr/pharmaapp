package br.com.economae.push

import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import br.com.economae.MainActivity
import br.com.economae.R

/**
 * Notificação de oferta montada pelo app a partir dos dados do push (o backend manda só "data",
 * backend/src/push/fcm.ts). Assim o app controla sempre, com o app aberto ou não:
 * - o texto expandido, onde o aviso da NBCAL vai inteiro;
 * - a loja na linha de cima;
 * - a versão pública, que esconde o produto na tela bloqueada quando a categoria revela dado
 *   sensível (gestação; proposta de UX N9).
 */
object NotificacaoOferta {
    data class Dados(
        val ofertaId: String,
        val entregaId: String?,
        val titulo: String,
        val corpo: String,
        val expandido: String,
        val loja: String?,
        val privado: Boolean,
        val tag: String,
    )

    /** Null quando a mensagem não é de oferta ou vem incompleta: nada é mostrado. */
    fun ler(dados: Map<String, String>): Dados? {
        val ofertaId = dados[CanalOfertas.EXTRA_OFERTA] ?: return null
        val titulo = dados["titulo"] ?: return null
        val corpo = dados["corpo"].orEmpty()
        return Dados(
            ofertaId = ofertaId,
            entregaId = dados[CanalOfertas.EXTRA_ENTREGA],
            titulo = titulo,
            corpo = corpo,
            expandido = dados["expandido"] ?: corpo,
            loja = dados["loja"],
            privado = dados["privado"] == "1",
            tag = dados["tag"] ?: ofertaId,
        )
    }

    fun construir(contexto: Context, d: Dados): Notification {
        val abrir = Intent(contexto, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(CanalOfertas.EXTRA_OFERTA, d.ofertaId)
            d.entregaId?.let { putExtra(CanalOfertas.EXTRA_ENTREGA, it) }
        }
        val pendente = PendingIntent.getActivity(contexto, d.ofertaId.hashCode(), abrir, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val canal = contexto.getString(R.string.canal_ofertas_id)
        val construtor = NotificationCompat.Builder(contexto, canal)
            .setSmallIcon(android.R.drawable.star_on)
            .setContentTitle(d.titulo)
            .setContentText(d.corpo)
            // Aberta: preço normal, prova, por que chegou e o aviso legal inteiro, sem cortar.
            .setStyle(NotificationCompat.BigTextStyle().bigText(d.expandido))
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setContentIntent(pendente)
            .setAutoCancel(true)
        d.loja?.let { construtor.setSubText(it) }
        if (d.privado) {
            // Celular bloqueado: só "Nova oferta excepcional"; o produto aparece depois de desbloquear.
            // O Android mostra a versão pública quando o aparelho oculta conteúdo sensível na tela
            // bloqueada; com "mostrar todo o conteúdo", vale a escolha da pessoa. SECRET esconderia o
            // aviso inteiro, e a mãe perderia a promoção.
            val publica = NotificationCompat.Builder(contexto, canal)
                .setSmallIcon(android.R.drawable.star_on)
                .setContentTitle(contexto.getString(R.string.notificacao_privada_titulo))
                .setContentText(contexto.getString(R.string.notificacao_privada_texto))
                .build()
            construtor.setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setPublicVersion(publica)
        }
        return construtor.build()
    }
}
