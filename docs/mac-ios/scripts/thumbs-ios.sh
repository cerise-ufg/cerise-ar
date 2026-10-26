#!/bin/bash
# Renderiza os GLBs de exemplo do mock no visualizador 3D do app (simulador) para servir de miniaturas do mock.
export PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH
BID=br.ufg.cerise.arviewer
OUT=~/CeriseAR/thumbs-ios; mkdir -p $OUT
UDID=$(xcrun simctl list devices booted | grep -m1 "iPhone 17 Pro (" | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')
for m in duck helmet astronaut flower; do
  xcrun simctl terminate "$UDID" $BID >/dev/null 2>&1; sleep 1
  xcrun simctl launch "$UDID" $BID -cerisearLink "cerisear://viewer?catalog=$m" >/dev/null
  sleep 12
  xcrun simctl io "$UDID" screenshot --type=png "$OUT/$m.png" >/dev/null 2>&1 && echo "ok $m"
done
echo THUMBS_DONE
