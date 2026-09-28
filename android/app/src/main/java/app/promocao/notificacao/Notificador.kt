package app.promocao.notificacao

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import app.promocao.MainActivity
import app.promocao.R
import app.promocao.formato.Formato
import app.promocao.formato.Prova
import app.promocao.formato.Selo
import app.promocao.modelo.Categoria
import app.promocao.modelo.CoberturaUi
import app.promocao.modelo.OfertaUi
import app.promocao.ui.componentes.rotulo
import app.promocao.ui.theme.CoresClaras
import androidx.compose.ui.graphics.toArgb

/**
 * A notificação é a tela principal (PROPOSTA 2). Um só tipo de aviso: oferta excepcional.
 * Nunca anúncio, lembrete ou "sentimos sua falta" (diretriz Android; Play Ads policy).
 */
object Notificador {
    const val CANAL_OFERTAS = "ofertas_excepcionais"
    const val CANAL_APP = "avisos_app"
    const val GRUPO = "ofertas"
    const val EXTRA_OFERTA = "oferta_id"
    const val EXTRA_DESTINO = "destino"
    const val DESTINO_AJUSTES = "ajustes"
    const val EXTRA_CATEGORIA = "categoria"

    fun criarCanais(context: Context, limiteDiario: Int = 3) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CANAL_OFERTAS, context.getString(R.string.canal_ofertas_nome), NotificationManager.IMPORTANCE_HIGH).apply {
                description = context.getString(R.string.canal_ofertas_descricao, limiteDiario)
            },
        )
        nm.createNotificationChannel(
            NotificationChannel(CANAL_APP, context.getString(R.string.canal_app_nome), NotificationManager.IMPORTANCE_LOW),
        )
    }

    fun podeNotificar(context: Context): Boolean =
        (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            NotificationManagerCompat.from(context).areNotificationsEnabled()

    /** Texto expandido: normal, prova, cobertura, conferido e por que chegou (UX_COPY 1). */
    fun textoExpandido(context: Context, o: OfertaUi): String {
        val selo = Prova.selo(o)
        val linhas = mutableListOf<String>()
        linhas += TextosNotificacao.texto(o, ModelosNotificacao.de(context))
        linhas += context.getString(R.string.notif_expandido_normal, Formato.reais(o.prova.precoNormalCentavos))
        linhas += when {
            selo.tipo == Selo.Tipo.MENOR && selo.dias == null -> context.getString(R.string.notif_expandido_menor_meses)
            selo.tipo == Selo.Tipo.MENOR -> context.getString(R.string.notif_expandido_menor_dias, selo.dias!!)
            else -> context.getString(R.string.notif_expandido_quase)
        }
        linhas += when (val c = o.cobertura) {
            is CoberturaUi.EntregaCep -> context.getString(R.string.notif_expandido_entrega, c.prazoDias)
            CoberturaUi.EntregaAConfirmar -> context.getString(R.string.notif_expandido_entrega_confirmar)
            is CoberturaUi.Retirada -> context.getString(R.string.notif_expandido_retirada, Formato.km(c.distanciaKm))
        }
        linhas += context.getString(R.string.notif_expandido_rodape, Formato.hora(o.conferidoEm), context.getString(o.categoria.rotulo))
        return linhas.joinToString("\n")
    }

    fun construir(context: Context, o: OfertaUi): android.app.Notification {
        val m = ModelosNotificacao.de(context)
        val abrirDetalhe = PendingIntent.getActivity(
            context, o.id.hashCode(),
            Intent(context, MainActivity::class.java).putExtra(EXTRA_OFERTA, o.id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val abrirLoja = PendingIntent.getActivity(
            context, o.id.hashCode() + 1, Intent(Intent.ACTION_VIEW, Uri.parse(o.link)),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val ajustar = PendingIntent.getActivity(
            context, o.id.hashCode() + 2,
            Intent(context, MainActivity::class.java)
                .putExtra(EXTRA_DESTINO, DESTINO_AJUSTES)
                .putExtra(EXTRA_CATEGORIA, o.categoria.chave)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        return NotificationCompat.Builder(context, CANAL_OFERTAS)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setColor(ContextCompat.getColor(context, R.color.marca_primaria))
            .setContentTitle(TextosNotificacao.titulo(o, m))
            .setContentText(TextosNotificacao.texto(o, m))
            .setSubText(o.loja)
            // Sem foto (hoje sempre, S-09): ícone da categoria. Com foto, BigPictureStyle (fase 3).
            .setLargeIcon(iconeCategoria(context, o.categoria))
            .setStyle(NotificationCompat.BigTextStyle().bigText(textoExpandido(context, o)))
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setGroup(GRUPO)
            .setAutoCancel(true)
            .setContentIntent(abrirDetalhe)
            .addAction(0, context.getString(R.string.notif_acao_loja), abrirLoja)
            .addAction(0, context.getString(R.string.notif_acao_ajustar), ajustar)
            .build()
    }

    /** Resumo do grupo quando há mais de um aviso ao mesmo tempo (N7). */
    fun construirGrupo(context: Context, ofertas: List<OfertaUi>): android.app.Notification {
        val m = ModelosNotificacao.de(context)
        val estilo = NotificationCompat.InboxStyle()
        ofertas.forEach { estilo.addLine(TextosNotificacao.titulo(it, m)) }
        val titulo = context.getString(R.string.notif_grupo_titulo, ofertas.size)
        return NotificationCompat.Builder(context, CANAL_OFERTAS)
            .setSmallIcon(R.drawable.ic_notificacao)
            .setColor(ContextCompat.getColor(context, R.color.marca_primaria))
            .setContentTitle(titulo)
            .setStyle(estilo.setBigContentTitle(titulo))
            .setGroup(GRUPO)
            .setGroupSummary(true)
            .setAutoCancel(true)
            .build()
    }

    /** Publica os avisos respeitando a permissão. Limite diário e silêncio são aplicados no servidor (S-17). */
    fun mostrar(context: Context, ofertas: List<OfertaUi>) {
        if (!podeNotificar(context)) return
        val nm = NotificationManagerCompat.from(context)
        try {
            ofertas.forEach { nm.notify(it.id.hashCode(), construir(context, it)) }
            if (ofertas.size > 1) nm.notify(GRUPO.hashCode(), construirGrupo(context, ofertas))
        } catch (_: SecurityException) {
            // Permissão revogada entre a checagem e o envio: nada a fazer; o feed continua com as ofertas.
        }
    }

    private fun iconeCategoria(context: Context, c: Categoria): Bitmap {
        val tamanho = (64 * context.resources.displayMetrics.density).toInt()
        val bmp = Bitmap.createBitmap(tamanho, tamanho, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val fundo = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = CoresClaras.provaContainer.toArgb() }
        canvas.drawRoundRect(RectF(0f, 0f, tamanho.toFloat(), tamanho.toFloat()), tamanho * 0.2f, tamanho * 0.2f, fundo)
        val icone = ContextCompat.getDrawable(context, iconeRes(c))!!.mutate()
        icone.setTint(CoresClaras.sobreProvaContainer.toArgb())
        val margem = (tamanho * 0.22f).toInt()
        icone.setBounds(margem, margem, tamanho - margem, tamanho - margem)
        icone.draw(canvas)
        return bmp
    }

    private fun iconeRes(c: Categoria): Int = when (c) {
        Categoria.MERCEARIA -> R.drawable.ic_cat_mercearia
        Categoria.PERECIVEIS -> R.drawable.ic_cat_pereciveis
        Categoria.HIGIENE_INTIMA -> R.drawable.ic_cat_higiene_intima
        Categoria.MAQUIAGEM -> R.drawable.ic_cat_maquiagem
        Categoria.HIGIENE_BEBE -> R.drawable.ic_cat_higiene_bebe
        Categoria.LIMPEZA -> R.drawable.ic_cat_limpeza
        Categoria.CUIDADOS_PESSOAIS -> R.drawable.ic_cat_cuidados_pessoais
        Categoria.MEDICAMENTOS_ISENTOS -> R.drawable.ic_cat_medicamentos_isentos
    }
}
