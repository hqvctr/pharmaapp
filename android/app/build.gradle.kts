plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

// Push só liga com o google-services.json do Firebase (fica fora do git). Sem ele o app compila e roda,
// e a tela de conta explica que as notificações não estão disponíveis neste build.
val temFirebase = file("google-services.json").exists()
if (temFirebase) apply(plugin = "com.google.gms.google-services")

fun propriedade(nome: String, padrao: String): String = (project.findProperty(nome) as String?) ?: padrao

android {
    namespace = "br.com.economae"
    compileSdk = 37

    defaultConfig {
        // Não pode mudar depois da primeira publicação no Google Play.
        applicationId = "br.com.economae"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "TENANT", "\"economae\"")
        // ID do cliente Web do projeto no Google Cloud (docs/operacao/google-cloud.md). Não é segredo.
        buildConfigField(
            "String",
            "GOOGLE_SERVER_CLIENT_ID",
            "\"984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com\"",
        )
        buildConfigField("boolean", "PUSH_DISPONIVEL", temFirebase.toString())
    }

    signingConfigs {
        // Chave de debug versionada: o mesmo SHA-1 em qualquer computador, cadastrado no cliente OAuth
        // Android do Google (docs/operacao/google-cloud.md). Release usa outra chave, fora do git.
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            signingConfig = signingConfigs.getByName("debug")
            applicationIdSuffix = ".debug"
            // Emulador alcança o backend local do computador por 10.0.2.2. Outro valor: -Peconomae.apiUrl=...
            buildConfigField("String", "API_URL", "\"${propriedade("economae.apiUrl", "http://10.0.2.2:3000/")}\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            buildConfigField("String", "API_URL", "\"${propriedade("economae.apiUrl", "https://api.invalido/")}\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
        // Robolectric precisa dos recursos do app para rodar as telas na JVM.
        unitTests.isIncludeAndroidResources = true
    }
}

dependencies {
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play.services)
    implementation(libs.googleid)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.messaging)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}

// Jornada de ponta a ponta contra o backend local (scripts/pronto-fase4.sh passa os dois valores);
// sem eles o teste é pulado. As capturas de tela saem em app/build/outputs/roborazzi/.
tasks.withType<Test>().configureEach {
    // Robolectric com SDK 36 mexe em campos internos do FileDescriptor (JDK 17+ fecha o acesso).
    jvmArgs(
        "--add-opens=java.base/java.io=ALL-UNNAMED",
        "--add-opens=java.base/java.lang=ALL-UNNAMED",
        "--add-exports=java.base/jdk.internal.access=ALL-UNNAMED",
    )
    systemProperty("roborazzi.test.record", "true")
    listOf("economae.e2e.apiUrl", "economae.e2e.apiLog").forEach { nome ->
        project.findProperty(nome)?.let { systemProperty(nome, it) }
    }
}
