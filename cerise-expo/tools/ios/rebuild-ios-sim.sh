#!/bin/bash
# Recompila (so xcodebuild) o build de Simulador com o JS atualizado.
# CERISE_TEST_MODE=1 habilita os links cerisear:// de captura de telas (foto de exemplo, servidor).
set -euo pipefail
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export CERISE_NO_VIRO=1 CERISE_TEST_MODE=1 CI=1
ROOT=~/CeriseAR
APP=$ROOT/cerise-expo
DD=$ROOT/build-sim-dd
cd "$APP"
if [ -f "$ROOT/cerise-expo-src.tgz" ]; then
  tar -xzf "$ROOT/cerise-expo-src.tgz" -C "$APP" && rm "$ROOT/cerise-expo-src.tgz"
fi
npx expo config --type public | grep -E "testMode|viroEnabled" || true
t0=$(date +%s)
xcodebuild -workspace ios/CERISEAR.xcworkspace -scheme CERISEAR -sdk iphonesimulator -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath "$DD" \
  ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO build 2>&1 | \
  grep -E "error:|BUILD SUCCEEDED|BUILD FAILED" | tail -n 30
echo "xcodebuild: $(( $(date +%s) - t0 )) s"
df -h / | tail -1
echo REBUILD_DONE
