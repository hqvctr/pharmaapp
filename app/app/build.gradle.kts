plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "br.com.economae"
    compileSdk = 35

    defaultConfig {
        applicationId = "br.com.economae"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "0.1.1-previa"
        // ID de cliente OAuth Web do servidor (público): o app pede o ID token do Google para ele.
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"984598232826-so1nrq35e06bb4aka2nhl7j3r0if3fuf.apps.googleusercontent.com\"")
        buildConfigField("String", "TENANT", "\"padrao\"")
    }

    signingConfigs {
        // Chave de teste do projeto (versionada de propósito; não é segredo). Mantém o mesmo SHA-1 em todo build,
        // que é o que o cliente Android do Google Cloud reconhece. A de release da Play é outra e nunca entra aqui.
        create("previa") {
            storeFile = file("previa.keystore")
            storePassword = "android"
            keyAlias = "economae-previa"
            keyPassword = "android"
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            signingConfig = signingConfigs.getByName("previa")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(bom)
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    // Entrar com Google (Credential Manager). Precisa de Google Play Services no aparelho.
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
