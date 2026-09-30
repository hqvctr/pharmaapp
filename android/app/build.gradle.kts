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

    buildTypes {
        debug {
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
}
