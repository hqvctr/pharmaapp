package br.com.economae.push

import android.Manifest
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import br.com.economae.EconomaeApplication
import br.com.economae.MainActivity
import br.com.economae.R
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.launch

/**
 * Com o app em segundo plano o próprio sistema mostra a notificação e, no toque, abre a MainActivity
 * com os dados (ofertaId, entregaId) nos extras. Com o app aberto a mensagem chega aqui.
 */
class ServicoMensagens : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        val app = application as EconomaeApplication
        app.container.escopo.launch { app.container.registrarAparelhoSeLogado(token) }
    }

    override fun onMessageReceived(mensagem: RemoteMessage) {
        val ofertaId = mensagem.data[CanalOfertas.EXTRA_OFERTA] ?: return
        val titulo = mensagem.notification?.title ?: return
        val corpo = mensagem.notification?.body.orEmpty()
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val abrir = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra(CanalOfertas.EXTRA_OFERTA, ofertaId)
            mensagem.data[CanalOfertas.EXTRA_ENTREGA]?.let { putExtra(CanalOfertas.EXTRA_ENTREGA, it) }
        }
        val pendente = PendingIntent.getActivity(this, ofertaId.hashCode(), abrir, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notificacao = NotificationCompat.Builder(this, getString(R.string.canal_ofertas_id))
            .setSmallIcon(android.R.drawable.star_on)
            .setContentTitle(titulo)
            .setContentText(corpo)
            // O corpo pode trazer o aviso legal da NBCAL: mostra tudo, sem cortar.
            .setStyle(NotificationCompat.BigTextStyle().bigText(corpo))
            .setContentIntent(pendente)
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(this).notify(ofertaId, 0, notificacao)
    }
}
