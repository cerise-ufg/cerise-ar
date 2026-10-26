# CERISE AR

Aplicativo de realidade aumentada (RA) do **CERISE** — Centro de Excelência em Redes Inteligentes Sem Fio e
Serviços Avançados (EMC/UFG). O repositório reúne todas as versões do app desenvolvidas em 2026: o app nativo
Android (Kotlin/SceneView) e iOS (SwiftUI/ARKit), a reescrita multiplataforma em Expo/React Native com
atualizações OTA próprias, o jogo em RA **Caça CERISE** (CERISE Summit, set/2026) e a versão **1.1.0**, que gera
objetos 3D a partir de fotos usando o servidor de geração 3D do CERISE e foi preparada para a Google Play.

**Autor:** Eduardo Martins de Carvalho Caixeta (bolsista — CERISE/EMC/UFG).
**Coordenação da área:** Prof. Dr. Carlos Galvão Pinheiro Junior (Realidade Aumentada).

## Atividades do Plano de Trabalho CERISE 2026 cobertas

| Objetivo · Atividade | O que está aqui |
|---|---|
| **O1 · A2** — versão funcional do aplicativo com suporte à geração de objetos 3D texturizados (componente móvel) | `cerise-expo/src/gen3d/` (cliente da API `/api/v1`, fila, *polling*, download, *Meus modelos*), visualizador 3D offline, integração validada ponta a ponta contra o servidor 3D real (branch `feat/2026-gen3d-playstore`) |
| **O2 · A6** — aplicativo publicado na Play Store (adequação aos requisitos técnicos e normativos) | `cerise-expo/store/` (ficha, gráficos, política de privacidade, formulários do Play Console, guia de publicação), verificações de 16 KB/assinatura/SDK alvo em `docs/relatorio-2026/resultados/`; o AAB final está nos *Releases* |

O texto técnico completo (objetivo, metodologia, implementação, resultados, limitações e próximos passos) está em
[`docs/relatorio-2026/RELATORIO_SECAO.md`](docs/relatorio-2026/RELATORIO_SECAO.md), com as figuras em
`docs/relatorio-2026/evidencias/` e os dados medidos em `docs/relatorio-2026/resultados/`.

## Branches

| Branch | Estado |
|---|---|
| `main` | estado de 18/09/2026 (26 commits de código, de 25/06 a 18/09/2026, mais a documentação): app nativo Android e iOS, app Expo 1.0.0 com o jogo Caça CERISE, servidor OTA próprio |
| `feat/2026-gen3d-playstore` | versão **1.1.0** (26/10/2026): tudo o que está em `main` + geração 3D a partir de foto, *Meus modelos*, visualizador 3D offline, Configurações/Sobre, adequação à Play Store e integração com o servidor 3D real. Ainda não foi incorporada ao `main` (o *pull request* estava em rascunho) |

A documentação (este README, `RELEASES.md`, `docs/`) é a mesma nas duas branches; as pastas marcadas com
`[feat]` abaixo (`cerise-expo/src/gen3d/`, `cerise-expo/plugins/`, `cerise-expo/store/`, `cerise-expo/tools/`)
existem apenas na branch `feat/2026-gen3d-playstore`.

## Estrutura

```
cerise-expo/            app multiplataforma (Expo SDK 57, React Native 0.86, ViroReact 2.58, expo-updates)
  App.tsx, src/         navegação, telas (Home, Criar 3D, Meus modelos, Visualizador, RA, Jogo, Configurações, Sobre)
  src/gen3d/            [feat] cliente do contrato /api/v1, gerenciador de jobs, leitura de GLB, configurações
  assets/               ícones, fonte Work Sans, modelos .glb do catálogo e do jogo, visualizador 3D embutido
  plugins/              [feat] config plugins (assinatura de upload, network security restrita)
  store/                [feat] pacote da Play Store e guias de publicação (Android e iOS)
  tools/                [feat] mock do servidor 3D, verificador de 16 KB, scripts do Simulador iOS
app/                    app nativo Android 1.0.0 (Kotlin + SceneView 2.3.0/ARCore) com OTA de APK
ios/                    app nativo iOS (SwiftUI + ARKit/SceneKit + GLTFKit2), projeto via XcodeGen
ota-server/             servidor OTA self-hosted do protocolo expo-updates (Node/Express + Dockerfile)
webar/                  modelos .glb de um protótipo WebAR (apenas os modelos estão versionados)
logos/, screenshots/    marca do CERISE e capturas do app nativo (jun/2026)
docs/relatorio-2026/    relatório técnico da atividade, evidências (figuras/capturas) e resultados medidos
docs/mac-ios/           scripts, logs e capturas auxiliares dos builds iOS feitos no Mac mini (set e out/2026)
RELEASES.md             artefatos grandes (AAB, APKs, IPAs, xcarchives, bundle OTA) com SHA-256
```

## Como reproduzir

### App Expo (Android) — branch `feat/2026-gen3d-playstore`

Requisitos: Node.js + npm, Android SDK (API 36), JDK 17. No Windows o caminho do projeto estoura o limite de
260 caracteres no *codegen* C++; compile por uma junção curta:

```powershell
cd cerise-expo
npm ci
npx expo prebuild -p android --clean --no-install     # gera android/ a partir de app.json + plugins/
Set-Content android\local.properties 'sdk.dir=C\:\\Users\\<usuario>\\AppData\\Local\\Android\\Sdk'
cmd /c mklink /J C:\cx <caminho>\cerise-expo          # uma vez
cd C:\cx\android
.\gradlew.bat :app:bundleRelease :app:assembleRelease
# APK para emulador x86_64 (libs ARM por tradução):
.\gradlew.bat :app:assembleRelease '-Pexpo.useLegacyPackaging=true'
```

O release é assinado com a chave de upload lida de `cerise-expo/keystore/upload.properties`
(`storeFile`, `storePassword`, `keyAlias`, `keyPassword`); sem esse arquivo o *plugin* cai para a chave de debug.

### App Expo (iOS, Simulador) — Mac com Xcode

```bash
cd cerise-expo && npm ci
CERISE_NO_VIRO=1 npx expo prebuild -p ios --clean && (cd ios && pod install)
xcodebuild -workspace ios/CERISEAR.xcworkspace -scheme CERISEAR -sdk iphonesimulator \
  -configuration Release CODE_SIGNING_ALLOWED=NO build
```

`CERISE_NO_VIRO=1` remove o módulo de RA (o `ViroKit.framework` não tem fatia de simulador). Scripts usados:
`cerise-expo/tools/ios/` e `docs/mac-ios/scripts/`. iPhone/TestFlight: `cerise-expo/store/IOS_IPHONE_TESTFLIGHT.md`.

### Mock do servidor 3D e servidor real — branch `feat/2026-gen3d-playstore`

```bash
node cerise-expo/tools/mock-gen3d-server.js --port 18096   # contrato /api/v1, devolve GLBs de exemplo
```

O servidor de geração 3D real fica no repositório `cerise-2026-gen3d`. Para testar pelo emulador sem expor o
servidor: `ssh -N -L 127.0.0.1:18095:localhost:8095 spark-bridge` e, no app, Configurações → `http://10.0.2.2:18095`.

### Apps nativos (nas duas branches)

- Android: `./gradlew :app:assembleRelease` na raiz (assina se existir `keystore.properties` com
  `storeFile`, `storePassword`, `keyAlias`, `keyPassword`; ver `app/build.gradle.kts`).
- iOS: `cd ios && xcodegen generate && open CeriseAR.xcodeproj` (detalhes em `ios/README.md`,
  `ios/INSTALL-IPHONE-MAC.md` e `ios/TESTFLIGHT.md`).

### Servidor OTA

`ota-server/` (Dockerfile + `server.js`); publicação de um update JS: `node ota-server/publish-update.mjs "mensagem"`.
Detalhes em `ota-server/README.md`.

### Gráficos e tabelas do relatório

```bash
python docs/relatorio-2026/resultados/scripts/tempos_e2e.py docs/relatorio-2026/resultados/real-logcat-app.txt docs/relatorio-2026/resultados/real-jobs-servidor.json
python docs/relatorio-2026/resultados/scripts/grafico_tempos_e2e.py docs/relatorio-2026
python docs/relatorio-2026/resultados/scripts/pacote_play.py cerise-expo/store docs/relatorio-2026/evidencias/fig10-pacote-play-store.png
python cerise-expo/store/make-graphics.py docs/relatorio-2026/evidencias
python cerise-expo/tools/check-16kb.py cerise-ar-1.1.0-110.aab cerise-ar-1.1.0-110.apk
```

## Resultados principais (medidos em 26/10/2026)

**Integração ponta a ponta contra o servidor 3D real** (emulador Android 16 → encaminhamento SSH local → API no
DGX Spark; fotos reais CC0; todos com textura e remoção de fundo) — `docs/relatorio-2026/resultados/real-tempos-app.csv`:

| Objeto · *preset* | Envio | Fila | Geração | Download | **Total (app)** | Fila / execução no servidor | GLB |
|---|---|---|---|---|---|---|---|
| Pato de borracha · Rápido | 0,41 s | 1,25 s | 11,19 s | 0,67 s | **13,5 s** | 0,24 s / 11,20 s | 348.164 B, 10.000 triângulos |
| Burro (estatueta) · Rápido | 0,49 s | 1,35 s | 11,24 s | 0,45 s | **13,5 s** | 0,20 s / 11,26 s | 407.240 B, 10.000 triângulos |
| Bule de prata · Padrão | 0,66 s | 1,36 s | 14,42 s | 0,61 s | **17,1 s** | 0,09 s / 14,73 s | 637.016 B, 19.998 triângulos |
| Gato (estatueta) · Alto | 0,39 s | 1,21 s | 29,04 s | 0,90 s | **31,5 s** | 0,22 s / 30,17 s | 1.514.424 B, 39.998 triângulos |
| Gato · Padrão, atrás de 1 job Alto de outro cliente | 0,40 s | 28,25 s | 15,81 s | 0,46 s | **44,9 s** | 27,85 s / 15,88 s | 677.632 B, 19.998 triângulos |
| Pato · Rápido, reenvio da mesma foto (cache) | 0,29 s | 0,28 s | 0 | 0,43 s | **1,0 s** | 0 / 0 | 348.164 B |

- Download do GLB de 398 KB antes/depois da correção no app: 5,0 s → 0,45 s (total 18,0 s → 13,5 s) —
  `resultados/real-antes-depois-download.txt`.
- Exclusão no app → servidor: `GET` 200 → 404, pasta do job removida, `gen3d_user_deleted_total` = 1 —
  `resultados/real-exclusao-servidor.txt`.
- GLBs entregues: textura JPEG, maior dimensão 0,30 m, sem Draco/meshopt/KTX2 — `resultados/real-jobs-servidor.json`.

**Adequação à Google Play** (AAB/APK `cerise-ar-1.1.0-110`) — `docs/relatorio-2026/resultados/`:

| Requisito | Resultado |
|---|---|
| SDK | `targetSdkVersion` 36, `compileSdk` 36, `minSdk` 24 |
| Páginas de 16 KB | 30/30 `.so` de 64 bits com `PT_LOAD` ≥ 16 KB (AAB e APK); `zipalign -c -P 16`: *Verification successful* |
| Permissões | `CAMERA`, `INTERNET`, `ACCESS_NETWORK_STATE` (+ permissão interna do AndroidX) |
| Assinatura | certificado de upload `CN=CERISE AR Upload, OU=CERISE EMC, O=Universidade Federal de Goias` (SHA-256 `C7:E8:46:6A:…:B6:D9`) |
| Tamanho | AAB 55.157.760 bytes; download estimado pela Play (API 29+): 35.651.915 B (arm64-v8a) e 34.086.672 B (armeabi-v7a) |
| Restrição às ABIs ARM | AAB 75.841.899 → 55.155.542 bytes (−27 %); APK universal 116.815.617 → 83.296.083 bytes (−29 %) |

**iOS (Simulador):** build Release sem assinatura em 72 s de `xcodebuild` (100 *pods*), `.app` de 41 MB
(`br.ufg.cerise.arviewer` 1.1.0, build 2), executado no iPhone 17 Pro (iOS 26) — `resultados/ios-build-resumo.txt`.

## Artefatos em *Releases*

Os binários não ficam no git; estão listados em [`RELEASES.md`](RELEASES.md) com tamanho, SHA-256 e instruções:
AAB e APK da versão 1.1.0 (loja e emulador), APK do app nativo 1.0.0, IPAs exportados para o App Store Connect
(set/2026), os `.xcarchive` com dSYMs e o bundle OTA publicado em 18/09/2026.

## O que não está aqui e por quê

| Item | Motivo | Como obter / onde fica |
|---|---|---|
| `cerise-expo/keystore/cerise-upload.jks` e `upload.properties`; `keystore/cerise-release.jks` e `keystore.properties` (app nativo) | **segredos** (chaves de assinatura e senhas) — fora do git por segurança | somente na máquina do autor; fazer backup em cofre de senhas. A chave de upload da Play pode ser redefinida no Play Console (Play App Signing) |
| chave de API do servidor 3D (`EXPO_PUBLIC_GEN3D_API_KEY` / `gen3d.secrets.env`) | segredo | definida só no ambiente de build quando o servidor exigir `X-API-Key` (passo 0d de `cerise-expo/store/PUBLICAR_PLAY_STORE.md`) |
| `node_modules/`, `cerise-expo/android/` e `cerise-expo/ios/` (gerados pelo `expo prebuild`), `ios/Pods`, `DerivedData`, `.gradle/`, `build/`, `.expo/`, `dist/` | artefatos regeneráveis de build | `npm ci`, `npx expo prebuild`, `pod install`, Gradle/Xcode (ver "Como reproduzir"); o `dist/` publicado por OTA está nos *Releases* |
| build de simulador `build-sim-dd/` e pastas `.build/` do Mac; APK de depuração do app nativo (25/06/2026) | artefatos de build regeneráveis / substituídos pelo release | `cerise-expo/tools/ios/build-ios-sim.sh`; `./gradlew :app:assembleDebug` |
| `.idea/`, `.kotlin/`, `local.properties`, `ios/CeriseAR.xcodeproj` | configurações locais de IDE/máquina e projeto gerado pelo XcodeGen | criados pelo Android Studio / `xcodegen generate` |
| XcodeGen (binário em `ios/tools/` no Mac) | ferramenta de terceiros | `brew install xcodegen` (versão usada: 2.46.0) |
| *Google Play Services for AR* 1.57 para emulador, `bundletool` 1.18.3 | software de terceiros | GitHub `google-ar/arcore-android-sdk` (releases) e `google/bundletool` (releases) |
| servidor de geração 3D (FastAPI/worker no DGX Spark) e fotos CC0 de validação (Wikimedia Commons) | pertencem à frente de geração 3D | repositório `cerise-2026-gen3d` (fontes das fotos em `validation/real/fontes.json`) |
| imagem Docker do `ota-server` | imagem gerada; o Dockerfile está no repo | `docker build -t cerise-ota-server ota-server/` |

## Licença e créditos

O repositório **não tem arquivo LICENSE** — decisão do autor (todos os direitos reservados, salvo os componentes
de terceiros abaixo). `cerise-expo/LICENSE` é o arquivo MIT do *template* do Expo (650 Industries), mantido como veio
do `create-expo-app`.

Componentes e modelos 3D de terceiros (créditos também na tela Sobre/Créditos do app): React Native/React (MIT),
Expo SDK (MIT), ViroReact (MIT), `<model-viewer>` (Apache-2.0) com three.js (MIT), react-native-webview (MIT),
SceneView (Apache-2.0), GLTFKit2 (MIT), fonte Work Sans (SIL OFL 1.1); modelos `.glb` CC0/CC-BY de Khronos glTF
Sample Models, three.js examples, Poly by Google, Poly Pizza, Gobkit (CC0) e outros, com autor e licença
listados em `cerise-expo/src/catalog.ts`, `cerise-expo/src/game.ts` e `ios/CeriseAR/Models/ModelCatalog.swift`.
As imagens em `docs/mac-ios/amostras/` são renderizações do Google Scanned Objects (CC-BY 4.0).
O modelo `pikachu.glb` (personagem de franquia, fora do catálogo da versão de loja) e o `dancers/dancer1.glb`
(amostra 8th Wall/Mixamo) têm licença de redistribuição a confirmar antes de qualquer publicação aberta do código.
