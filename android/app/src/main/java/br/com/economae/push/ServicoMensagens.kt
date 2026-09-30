package br.com.economae.push

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import br.com.economae.EconomaeApplication
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.launch

/**
 * Recebe o push (só dados, backend/src/push/fcm.ts) e mostra a notificação montada por
 * NotificacaoOferta. O toque abre a MainActivity com ofertaId e entregaId nos extras.
 */
class ServicoMensagens : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        val app = application as EconomaeApplication
        app.container.escopo.launch { app.container.registrarAparelhoSeLogado(token) }
    }

    override fun onMessageReceived(mensagem: RemoteMessage) {
        // O backend manda só dados: esta função roda com o app aberto ou em segundo plano.
        val dados = NotificacaoOferta.ler(mensagem.data) ?: return
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        // A mesma tag substitui a notificação anterior da mesma oferta (decisão 59).
        NotificationManagerCompat.from(this).notify(dados.tag, 0, NotificacaoOferta.construir(this, dados))
    }
}
