package br.com.economae

import android.app.Application
import br.com.economae.push.CanalOfertas

open class EconomaeApplication : Application() {
    lateinit var container: Container
        private set

    override fun onCreate() {
        super.onCreate()
        container = criarContainer()
        CanalOfertas.criar(this)
    }

    /** O teste de ponta a ponta troca o endereço do backend. */
    protected open fun criarContainer(): Container = Container(this)
}
