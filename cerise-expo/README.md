# CERISE AR — app Android/iOS (Expo / React Native)

Aplicativo de realidade aumentada do **CERISE** (Centro de Excelência em Redes Inteligentes Sem Fio e
Serviços Avançados — EMC/UFG). Versão **1.1.0** (Android `versionCode 110`, iOS build 2).

- **Criar modelo 3D**: foto (câmera ou galeria) → servidor de geração 3D do CERISE (API `/api/v1`) →
  fila com posição/ETA/progresso → download do GLB texturizado → *Meus modelos*.
- **Meus modelos**: lista persistida no aparelho com miniaturas e estatísticas; abrir em **3D** (visualizador
  offline com `<model-viewer>` embutido) ou em **RA** (tap-to-place, pinça, rotação).
- **Catálogo** de modelos com licença aberta, **Caça CERISE** (jogo em RA) e atualizações **OTA** self-hosted.
- **Configurações** (URL do servidor + Testar conexão) e **Sobre** (versão, créditos, licenças, privacidade).

Stack: Expo SDK 57 · React Native 0.86 (nova arquitetura, Hermes) · React 19.2 · TypeScript ·
ViroReact 2.58 (ARCore/ARKit) · expo-updates (servidor próprio em `cerise.wenfur.com.br/updates`).

## Estrutura

```
App.tsx                  navegação (pilha), links cerisear://, popup de OTA
src/gen3d/               api.ts (contrato /api/v1) · jobs.ts (fila/polling/download) · glb.ts · settings.ts
src/screens/             Home, Create, MyModels, Viewer (WebView+model-viewer), Ar, Game, Settings, About
assets/viewer/viewer.html  visualizador 3D autocontido (gerado por tools/build-viewer.js)
plugins/                 config plugins: network security restrita, assinatura de upload
tools/mock-gen3d-server.js  mock do servidor 3D (sem dependências)
tools/check-16kb.py      verificação de páginas de 16 KB (ELF + zip) em AAB/APK
tools/ios/               scripts de build/captura do Simulador iOS (Mac por SSH)
store/                   pacote da Play Store (textos, ícone, recurso gráfico, prints, política, formulários)
```

## Contrato da API de geração 3D

| Método | Rota | Uso no app |
|---|---|---|
| GET | `/api/v1/health` | Testar conexão / aviso de servidor fora do ar |
| POST | `/api/v1/jobs` (multipart `image` + `options` JSON) | envio da foto → `202 {job_id, position, eta_seconds}` |
| GET | `/api/v1/jobs/{id}` | polling (1,5 s gerando · 2 s na fila · backoff em falha de rede) |
| GET | `/api/v1/jobs/{id}/model.glb` · `/thumbnail.png` | download para `Documents/gen3d/models/<id>/` |
| DELETE | `/api/v1/jobs/{id}` | cancelar enquanto está na fila |

URL padrão: `https://cerise.wenfur.com.br/gen3d` (produção planejada — **publicação pendente**).
Para testes: emulador → `http://10.0.2.2:18095` (servidor real via `ssh -N -L 127.0.0.1:18095:localhost:8095 spark-bridge`)
ou `http://10.0.2.2:18096` (mock); Simulador iOS → `http://localhost:18096`.

## Rodar o mock do servidor 3D

```bash
node tools/mock-gen3d-server.js --port 18096        # escuta só em 127.0.0.1
# MOCK_SPEED=0.5 (2x mais rápido) · MOCK_FAIL_EVERY=3 (todo 3º job falha) · MOCK_MAX_QUEUE=8
```
O mock simula fila (1 worker), estágios e progresso e devolve **GLBs de exemplo do catálogo** (pato,
capacete, astronauta, rosas) — **não** gera nada a partir da foto. O app marca esses resultados como "servidor MOCK".

## Builds

**Android (Windows)** — o caminho do projeto estoura o limite de 260 caracteres no codegen C++; compile pela junção `C:\cx`:
```powershell
npx expo prebuild -p android --clean --no-install
Set-Content android\local.properties 'sdk.dir=C\:\\Users\\eduar\\AppData\\Local\\Android\\Sdk'
cmd /c mklink /J C:\cx <caminho>\cerise-expo        # uma vez
cd C:\cx\android; .\gradlew.bat :app:bundleRelease :app:assembleRelease
```
O release é assinado com `keystore/cerise-upload.jks` (senha em `keystore/upload.properties`, **fora do git — faça backup**).
Para o emulador x86_64 (que roda as libs ARM por tradução), gere um APK com bibliotecas extraídas:
`.\gradlew.bat :app:assembleRelease '-Pexpo.useLegacyPackaging=true'`.

**iOS (Mac)** — Simulador (sem assinatura, sem RA): `CERISE_NO_VIRO=1 npx expo prebuild -p ios --clean && (cd ios && pod install)`
e `xcodebuild -workspace ios/CERISEAR.xcworkspace -scheme CERISEAR -sdk iphonesimulator -configuration Release CODE_SIGNING_ALLOWED=NO build`.
iPhone/TestFlight: ver `store/IOS_IPHONE_TESTFLIGHT.md` (precisa da sessão gráfica do Mac).

## Resultados medidos (26/10/2026)

| Item | Valor |
|---|---|
| AAB release (ARM, assinado upload) | 55,2 MB · download estimado (bundletool, API 29+): 35,7 MB arm64-v8a, 34,1 MB armeabi-v7a |
| targetSdk / compileSdk / minSdk | 36 / 36 / 24 |
| Permissões no APK final | CAMERA, INTERNET, ACCESS_NETWORK_STATE (+ permissão interna do AndroidX) |
| Páginas de 16 KB | 30/30 `.so` de 64 bits com `PT_LOAD` ≥ 16 KB; `zipalign -c -P 16` OK |
| Build Simulador iOS (Release, sem Viro) | `.app` de 41 MB, iPhone 17 Pro / iOS 26 |

Detalhes, figuras e limitações: `E:\CERISE\FRENTES\REALIDADE AUMENTADA\APP_CERISE_AR\RELATORIO_SECAO.md`.
Publicação: `store/PUBLICAR_PLAY_STORE.md`.
