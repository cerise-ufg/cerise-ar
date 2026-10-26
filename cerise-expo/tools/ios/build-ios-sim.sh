#!/bin/bash
# Build do CERISE AR (Expo) para o iOS Simulator, sem assinatura. Roda no Mac via SSH.
# CERISE_NO_VIRO=1: o ViroKit.framework so tem fatia arm64 de DISPOSITIVO (LC_BUILD_VERSION iOS),
# entao o simulador e compilado sem o modulo de RA (o app esconde as entradas de RA).
set -euo pipefail
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
export CERISE_NO_VIRO=1
export CI=1
ROOT=~/CeriseAR
APP=$ROOT/cerise-expo
DD=$ROOT/build-sim-dd
cd "$APP"
step() { echo; echo "=== $(date '+%H:%M:%S') $*"; df -h / | tail -1; }

step "npm ci"
t0=$(date +%s)
npm ci --no-audit --no-fund
echo "npm ci: $(( $(date +%s) - t0 )) s"

step "expo prebuild -p ios (CERISE_NO_VIRO=1)"
npx expo prebuild -p ios --clean --no-install

step "pod install"
t0=$(date +%s)
(cd ios && pod install)
echo "pod install: $(( $(date +%s) - t0 )) s"

WS=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WS" .xcworkspace)
echo "workspace=$WS scheme=$SCHEME"

step "xcodebuild Release iphonesimulator"
t0=$(date +%s)
xcodebuild -workspace "$WS" -scheme "$SCHEME" -sdk iphonesimulator -configuration Release \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath "$DD" \
  ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO build 2>&1 | \
  grep -E "error:|warning: .*deprecated.*Viro|BUILD SUCCEEDED|BUILD FAILED|\*\* |Compiling|Linking" | grep -vE "^\s*$" | tail -n 60
echo "xcodebuild: $(( $(date +%s) - t0 )) s"

APPDIR=$(ls -d "$DD"/Build/Products/Release-iphonesimulator/*.app | head -1)
echo "APP=$APPDIR"
du -sh "$APPDIR"
step "fim"
echo BUILD_IOS_SIM_DONE
