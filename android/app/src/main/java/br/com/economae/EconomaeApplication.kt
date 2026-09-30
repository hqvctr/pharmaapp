package br.com.economae

import android.app.Application
import br.com.economae.push.CanalOfertas

class EconomaeApplication : Application() {
    lateinit var container: Container
        private set

    override fun onCreate() {
        super.onCreate()
        container = Container(this)
        CanalOfertas.criar(this)
    }
}
