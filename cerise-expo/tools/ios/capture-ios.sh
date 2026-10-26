#!/bin/bash
# Instala o build de Simulador (teste) no iPhone 17 Pro, sobe o mock local e captura as telas.
# Navegacao: relanca o app com o argumento -cerisearLink <url> (o simulador nao aceita toques
# via SSH e `simctl openurl` pede confirmacao na tela).
set -uo pipefail
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
ROOT=~/CeriseAR
APP=$ROOT/build-sim-dd/Build/Products/Release-iphonesimulator/CERISEAR.app
BID=br.ufg.cerise.arviewer
OUT=$ROOT/shots-ios
UDID=$(xcrun simctl list devices available | grep -m1 "iPhone 17 Pro (" | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
echo "UDID=$UDID"
rm -rf "$OUT"; mkdir -p "$OUT"
shot() { sleep "${2:-3}"; xcrun simctl io "$UDID" screenshot --type=png "$OUT/$1.png" >/dev/null 2>&1 && echo "shot $1 $(date +%H:%M:%S) $(stat -f %z "$OUT/$1.png")"; }
open_link() { xcrun simctl terminate "$UDID" $BID >/dev/null 2>&1; sleep 1; xcrun simctl launch "$UDID" $BID -cerisearLink "$1" >/dev/null; }

pkill -f "mock-gen3d-server.js --port 18096" 2>/dev/null || true
(cd $ROOT/cerise-expo && nohup node tools/mock-gen3d-server.js --port 18096 > $ROOT/mock-ios.log 2>&1 < /dev/null &)
sleep 1; curl -s localhost:18096/api/v1/health; echo

xcrun simctl shutdown "$UDID" 2>/dev/null || true
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
xcrun simctl status_bar "$UDID" override --time "10:26" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4 2>/dev/null
xcrun simctl uninstall "$UDID" $BID 2>/dev/null || true
xcrun simctl install "$UDID" "$APP" && echo installed
DATA=$(xcrun simctl get_app_container "$UDID" $BID data)
mkdir -p "$DATA/Documents/gen3d" && cp $ROOT/samples/rhino.jpg "$DATA/Documents/gen3d/sample.jpg"

xcrun simctl launch "$UDID" $BID >/dev/null; shot 01-home 8
open_link "cerisear://create"; shot 02-criar-servidor-offline 7
open_link "cerisear://settings?server=http://localhost:18096"; shot 03-config-conexao-ok 6
# um job "alto" na frente (via curl) para o do app aparecer na fila
curl -s -F "image=@$ROOT/samples/turtle.jpg;type=image/jpeg" -F 'options={"preset":"alto","texture":true,"remove_background":true}' localhost:18096/api/v1/jobs; echo
open_link "cerisear://create?photo=sample.jpg&preset=rapido&start=1"; shot 04-criar-foto 2.5
shot 05-fila 3.5
sleep 24; shot 06-gerando 1
for i in $(seq 1 40); do
  st=$(curl -s localhost:18096/api/v1/health | grep -o '"queue_length":[0-9]*' | cut -d: -f2)
  [ "$st" = "0" ] && break; sleep 1
done
shot 07-pronto 4
open_link "cerisear://models"; shot 08-meus-modelos 5
open_link "cerisear://viewer?latest=1"; shot 09-visualizador-3d 12
open_link "cerisear://viewer?catalog=helmet"; shot 10-visualizador-catalogo 12
open_link "cerisear://about"; shot 11-sobre 5
open_link "cerisear://home"; shot 12-home-com-modelos 5
xcrun simctl status_bar "$UDID" clear 2>/dev/null
cp $ROOT/mock-ios.log "$OUT/mock-ios.log"
cp "$DATA/Documents/gen3d/models.json" "$OUT/models-ios.json" 2>/dev/null
echo CAPTURE_DONE
