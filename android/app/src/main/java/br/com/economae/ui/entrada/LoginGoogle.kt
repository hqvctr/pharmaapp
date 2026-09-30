package br.com.economae.ui.entrada

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import br.com.economae.BuildConfig
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential

sealed interface ResultadoGoogle {
    data class Token(val idToken: String) : ResultadoGoogle
    data object Cancelado : ResultadoGoogle
    data class Falha(val mensagem: String) : ResultadoGoogle
}

/**
 * Credential Manager com o client ID Web como audiência: é esse ID que o backend confere no token.
 * O contexto precisa ser a Activity (o seletor de contas abre por cima dela).
 */
suspend fun obterIdTokenGoogle(activity: Context): ResultadoGoogle {
    val opcao = GetGoogleIdOption.Builder()
        .setServerClientId(BuildConfig.GOOGLE_SERVER_CLIENT_ID)
        .setFilterByAuthorizedAccounts(false)
        .setAutoSelectEnabled(false)
        .build()
    val pedido = GetCredentialRequest.Builder().addCredentialOption(opcao).build()
    return try {
        val credencial = CredentialManager.create(activity).getCredential(activity, pedido).credential
        if (credencial is CustomCredential && credencial.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            ResultadoGoogle.Token(GoogleIdTokenCredential.createFrom(credencial.data).idToken)
        } else {
            ResultadoGoogle.Falha("O Google não devolveu uma credencial válida.")
        }
    } catch (_: GetCredentialCancellationException) {
        ResultadoGoogle.Cancelado
    } catch (_: NoCredentialException) {
        ResultadoGoogle.Falha("Nenhuma conta Google disponível neste aparelho.")
    } catch (e: GetCredentialException) {
        ResultadoGoogle.Falha("Não foi possível entrar com o Google agora.")
    }
}
