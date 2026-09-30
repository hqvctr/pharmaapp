package br.com.economae.dados

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences as PreferenciasDataStore
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

/** Onde o token de sessão fica guardado. Interface para os testes usarem memória. */
interface ArmazemSessao {
    val token: Flow<String?>
    suspend fun tokenAtual(): String? = token.first()
    suspend fun salvar(token: String)
    suspend fun limpar()
}

// Arquivo "sessao" fica fora do backup (res/xml/regras_extracao_dados.xml).
private val Context.dataStoreSessao: DataStore<PreferenciasDataStore> by preferencesDataStore(name = "sessao")
private val CHAVE_TOKEN = stringPreferencesKey("token")

class ArmazemSessaoDataStore(private val contexto: Context) : ArmazemSessao {
    override val token: Flow<String?> = contexto.dataStoreSessao.data.map { it[CHAVE_TOKEN] }

    override suspend fun salvar(token: String) {
        contexto.dataStoreSessao.edit { it[CHAVE_TOKEN] = token }
    }

    override suspend fun limpar() {
        contexto.dataStoreSessao.edit { it.remove(CHAVE_TOKEN) }
    }
}
