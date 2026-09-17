import java.util.Properties
import java.io.FileInputStream

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

// Signing config for release/OTA builds. keystore.properties is gitignored;
// every OTA update MUST be signed with the same keystore or Android rejects it.
val keystoreProperties = Properties().apply {
    val f = rootProject.file("keystore.properties")
    if (f.exists()) load(FileInputStream(f))
}

android {
    namespace = "com.cerisear"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cerisear"
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Where the app checks for OTA updates. Points to a JSON manifest served
        // over HTTPS (see webar/../ota or the server). Change here when the host
        // is finalized; the updater no-ops gracefully if it can't be reached.
        buildConfigField(
            "String",
            "OTA_MANIFEST_URL",
            "\"https://cerise.wenfur.com.br/ota/version.json\""
        )
    }

    signingConfigs {
        create("release") {
            val sf = keystoreProperties.getProperty("storeFile")
            if (sf != null) {
                storeFile = rootProject.file(sf)
                storePassword = keystoreProperties.getProperty("storePassword")
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Sign release with the CERISE keystore when it is present.
            if (keystoreProperties.getProperty("storeFile") != null) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    // Filament / SceneView assets must not be compressed.
    androidResources {
        noCompress += listOf("filamat", "ktx", "glb")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)
    implementation(libs.androidx.constraintlayout)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.ktx)

    // 3D + AR (Google Filament + ARCore) — published on Maven Central.
    implementation(libs.sceneview.ar)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
