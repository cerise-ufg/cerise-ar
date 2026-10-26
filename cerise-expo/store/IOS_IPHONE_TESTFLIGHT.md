# iOS — instalar no iPhone e enviar ao TestFlight (CERISE AR 1.1.0, build 2)

O que já foi feito por SSH no Mac (`mac-remoto`, ~/CeriseAR/cerise-expo):
- código sincronizado (sem node_modules/android/ios), `npm ci`, `expo prebuild -p ios`, `pod install` (100 pods);
- **build Release para o iOS Simulator** (`CODE_SIGNING_ALLOWED=NO`) instalado e testado no *iPhone 17 Pro*
  (iOS 26), com capturas de tela de todas as telas e do fluxo de geração 3D contra o mock local.

Limitações da sessão SSH (por isso os passos abaixo ficam para o Eduardo, **na sessão gráfica do Mac**):
- o *keychain* de login fica travado em SSH → não há assinatura de código (`errSecInternalComponent`);
- o build de simulador foi feito **sem o ViroReact** (`CERISE_NO_VIRO=1`): o `ViroKit.framework`
  distribuído pela ReactVision só tem a fatia **arm64 de dispositivo** (`LC_BUILD_VERSION` = iOS, minOS 17.6),
  então não linka para simulador. No iPhone real a RA entra normalmente.
- por causa do ViroKit (minOS 17.6), o `deploymentTarget` do app foi fixado em **iOS 17.6**.

## A. Instalar direto no iPhone (Terminal.app do Mac, logado na sessão gráfica)

```bash
export PATH=/opt/homebrew/bin:$PATH LANG=en_US.UTF-8
cd ~/CeriseAR/cerise-expo
unset CERISE_NO_VIRO CERISE_TEST_MODE          # build completo, COM realidade aumentada
npx expo prebuild -p ios --clean               # regenera ios/ com o plugin do Viro
(cd ios && pod install)
open ios/CERISEAR.xcworkspace
```

No Xcode:
1. Alvo **CERISEAR → Signing & Capabilities**: marcar *Automatically manage signing*, **Team = 6T2ZP362BQ**
   (conta paga "Eduardo Caixeta" já logada no Xcode). Bundle ID: `br.ufg.cerise.arviewer`.
2. Escolher o iPhone (iPhone 14 Pro Max, UDID `00008120-001A031E2E5BC01E`) como destino e o esquema em **Release**
   (*Product → Scheme → Edit Scheme → Run → Build Configuration = Release*).
3. **Product → Run** (⌘R). Na primeira vez o Mac pede a senha do keychain: escolher *Sempre permitir*.

> O app Expo usa o **mesmo bundle ID** do app nativo SwiftUI 1.0.0 que já está no iPhone; a instalação
> substitui o app antigo (versão 1.1.0 build 2 > 1.0.0 build 1).

Alternativa sem abrir o Xcode (mesma sessão gráfica):
```bash
npx expo run:ios --device 00008120-001A031E2E5BC01E --configuration Release
```

## B. Enviar para o TestFlight

Pré-requisito: registro do app `br.ufg.cerise.arviewer` no App Store Connect (já preparado em set/2026 —
ver `ios/TESTFLIGHT.md` na raiz do repositório). `ITSAppUsesNonExemptEncryption=false` já está no Info.plist.

1. No Xcode: destino **Any iOS Device (arm64)** → **Product → Archive**.
2. Na janela *Organizer*: **Distribute App → App Store Connect → Upload** (assinatura automática, team 6T2ZP362BQ).
3. No App Store Connect → *TestFlight*: aguardar o processamento (~10–30 min), responder a pergunta de
   criptografia (já respondida pelo Info.plist) e adicionar o grupo de **teste interno** (até 100 pessoas, sem revisão).
4. Para teste **externo** (link público), enviar o build para a revisão beta da Apple (~1 dia).

Antes de enviar para revisão externa/produção: publicar o servidor 3D em `https://cerise.wenfur.com.br/gen3d`
e a política em `https://cerise.wenfur.com.br/privacidade.html` (ver `store/PUBLICAR_PLAY_STORE.md`, passo 0b).

## C. Refazer o build de simulador + capturas (por SSH)

Scripts usados nesta etapa (cópias em `cerise-expo/tools/ios/`):
- `build-ios-sim.sh` — `npm ci` → `expo prebuild -p ios` → `pod install` → `xcodebuild … -sdk iphonesimulator -configuration Release CODE_SIGNING_ALLOWED=NO` (DerivedData em `~/CeriseAR/build-sim-dd`);
- `rebuild-ios-sim.sh` — só recompila com `CERISE_TEST_MODE=1` (habilita os links de captura);
- `capture-ios.sh` — sobe o mock em `localhost:18096`, instala no *iPhone 17 Pro* e captura as telas com
  `xcrun simctl io booted screenshot`, navegando por `-cerisearLink cerisear://…` (o simulador não aceita toques por SSH).
