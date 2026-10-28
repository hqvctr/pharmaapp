#!/usr/bin/env bash
# Gera o APK de prévia do app (app/) em app/app/build/outputs/apk/debug/app-debug.apk.
# Precisa de Java 17+ e do Android SDK (plataforma 35 e build-tools 35.0.0). Aponte ANDROID_HOME para ele.
set -euo pipefail
cd "$(dirname "$0")/../app"
: "${ANDROID_HOME:?Defina ANDROID_HOME com a pasta do Android SDK}"
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew --no-daemon testDebugUnitTest assembleDebug
APK=app/build/outputs/apk/debug/app-debug.apk
echo
echo "APK: $(pwd)/$APK"
"$ANDROID_HOME"/build-tools/35.0.0/apksigner verify --print-certs "$APK" | grep -E "SHA-1"
