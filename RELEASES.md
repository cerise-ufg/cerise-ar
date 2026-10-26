# Artefatos grandes (GitHub Releases)

Os binários do app não são versionados no git (são grandes e regeneráveis a partir do código, exceto pela
assinatura). Eles ficam anexados aos *Releases* deste repositório, com o SHA-256 abaixo para conferência.
Nenhum arquivo passa de 1,9 GB, então não há partes a remontar.

## Release `v1.1.0` — versão 1.1.0 (versionCode 110), rebuild final de 26/10/2026

| Arquivo | Tamanho (bytes) | SHA-256 | Conteúdo |
|---|---|---|---|
| `cerise-ar-1.1.0-110.aab` | 55.157.760 | `1dfba4b8c321b352afb4c072aea1608dc9ed49e6dbecb402df6b8baf5cdedcf9` | Android App Bundle para a Google Play (ABIs `armeabi-v7a` e `arm64-v8a`, targetSdk 36), assinado com a chave de **upload** |
| `cerise-ar-1.1.0-110.apk` | 83.299.939 | `dd65ae362cbd3a4623e0eb304fda7f86b54df0a184f12630e169e86528ce05e8` | APK universal release (instalação direta em aparelhos ARM), mesmo código e mesmo bundle JS do AAB |
| `cerise-ar-1.1.0-110-emulador-legacypackaging.apk` | 48.616.475 | `c0ff8d2d9f98c57a470b5188f8cf1981caf5ec72463bcf71b0bb9bf146c132b4` | APK de teste para emulador x86_64 (bibliotecas nativas extraídas, `expo.useLegacyPackaging=true`); mesmo bundle JS. Usado no teste ponta a ponta contra o servidor 3D real |

## Release `v1.0.0` — versões de jun–set/2026

| Arquivo | Tamanho (bytes) | SHA-256 | Conteúdo |
|---|---|---|---|
| `cerise-ar-nativo-1.0.0-1-release.apk` | 66.032.287 | `0cb8b030e8dd4e8820df699d3607883bec23613eab1b6490a0bf7845744b4ef8` | app nativo Android (Kotlin/SceneView) `com.cerisear` 1.0.0 (versionCode 1), release de 17/09/2026, assinado com a chave release do app nativo (`CN=CERISE AR, OU=CERISE, O=UFG`, SHA-256 `c69f13de…3c0901`), a mesma exigida pelas atualizações OTA de APK |
| `cerise-ar-ios-ipa-2026-09.tar` | 58.152.960 | `f7f173e471764a3d008bd04d140392beebf16a9bed6bcda95b9588a71f71cb8d` | `build/export/CeriseAR.ipa` (app nativo SwiftUI/ARKit, 17/09/2026) e `build/export-expo/CERISEAR.ipa` (app Expo, 18/09/2026), exportados para o App Store Connect (TestFlight), com `ExportOptions.plist`, `DistributionSummary.plist` e `Packaging.log` |
| `cerise-ar-ios-xcarchive-2026-09.tar` | 144.363.520 | `af8b576466ebbddb0d636983428f171125842cc989ddd98df6fca2a04251406f` | `CeriseAR.xcarchive` e `CeriseAR-expo.xcarchive` (produtos e dSYMs dos dois IPAs acima, para simbolização de falhas) |
| `cerise-ar-ota-update-1.0.0-2026-09-18.zip` | 9.778.576 | `5c27892c3371acd8eaafde4a3cbfc836fe1fe560e08cb263c48d9414dacd77f3` | saída do `expo export` (`dist/`: `metadata.json`, `update.json`, bundles Hermes Android/iOS e assets) do update OTA de 18/09/2026 para o *runtime* 1.0.0 ("remove trex e triceratops (nao capturavam)"), no formato servido pelo `ota-server/` |

## Como baixar e conferir

```bash
gh release download v1.1.0 -R <organizacao>/cerise-ar          # ou v1.0.0; -p <arquivo> para um só
sha256sum cerise-ar-1.1.0-110.aab                              # comparar com a tabela
```

No Windows: `Get-FileHash .\cerise-ar-1.1.0-110.aab -Algorithm SHA256`.

## Como usar / extrair

- **AAB:** enviar no Play Console (teste interno → teste fechado → produção), conforme
  `cerise-expo/store/PUBLICAR_PLAY_STORE.md`. Para gerar APKs locais: `bundletool build-apks --bundle=cerise-ar-1.1.0-110.aab --output=cerise.apks`.
- **APK:** `adb install cerise-ar-1.1.0-110.apk` (aparelho ARM) ou `adb install cerise-ar-1.1.0-110-emulador-legacypackaging.apk` (emulador x86_64).
- **IPAs e xcarchives:** `tar -xf cerise-ar-ios-ipa-2026-09.tar` / `tar -xf cerise-ar-ios-xcarchive-2026-09.tar`
  (criam `build/...`). Os IPAs são assinados para distribuição no App Store Connect; só instalam via TestFlight/App Store.
- **Bundle OTA:** `unzip cerise-ar-ota-update-1.0.0-2026-09-18.zip` cria `dist/`; o layout no servidor está em `ota-server/README.md`
  (`/opt/cerise-ota/updates/<runtimeVersion>/<updateId>/`).

As chaves de assinatura (keystores) não fazem parte dos *Releases* nem do git.
