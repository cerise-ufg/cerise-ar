# Roteiro de implementação — Aplicativo CERISE AR com geração de modelos 3D

Roteiro para que outra pessoa reproduza o aplicativo CERISE AR 1.1.0 (Plano de Trabalho CERISE 2026, CERISE/EMC/UFG). Autor: Eduardo Martins de Carvalho Caixeta. Os caminhos são relativos à raiz deste repositório; nas referências, [feat] indica arquivos que existem apenas no branch `feat/2026-gen3d-playstore`.

## O que será reproduzido

Este roteiro mostra como compilar, executar e preparar para publicação o aplicativo CERISE AR 1.1.0 (Expo/React Native), que fotografa um objeto, envia a foto ao servidor de geração 3D do CERISE, acompanha a fila, baixa o modelo GLB texturizado e o exibe num visualizador 3D e em realidade aumentada (RA). Ele cobre a Atividade 2 do Objetivo 1 (versão funcional do aplicativo com geração de objetos 3D texturizados, lado do aplicativo) e a Atividade 6 do Objetivo 2 (adequação à Play Store). O servidor de geração 3D tem roteiro próprio (repositório `cerise-2026-gen3d`); aqui ele é usado pronto ou substituído por um servidor simulado (*mock*).

Ao final, você terá:

- o AAB e o APK release do Android assinados com a sua própria chave de *upload*, mais um APK para o emulador x86_64;
- o app rodando no emulador Android (e, se tiver, num aparelho ARM) e no Simulador iOS;
- o fluxo foto → modelo 3D → Meus modelos → visualizador 3D testado contra o *mock* e, se houver acesso, contra o servidor real;
- opcionalmente, um servidor de atualizações OTA próprio e o pacote da Play Store pronto para envio.

## Requisitos

- Computador Windows x86_64 (o projeto usou um notebook com Windows 11) com virtualização habilitada. Compilar o Android no Linux ou no macOS com `./gradlew` não foi testado.
- Mac com Apple Silicon para o iOS (o projeto usou um Mac mini M4 com macOS 26.3.1 e Xcode 26.6).
- Opcional: aparelho Android ARM com ARCore e iPhone com ARKit (iOS 17.6 ou superior), pois a RA não roda em emulador nem em simulador.
- Servidor 3D real: no projeto, rodou numa NVIDIA DGX Spark (GPU GB10, CPU aarch64, 128 GB de memória unificada, Ubuntu 24.04, Docker). O app não depende dessa arquitetura; a adaptação do servidor para x86_64 com GPU NVIDIA comum pertence ao roteiro do servidor e não foi testada aqui. Sem ele, use o *mock*, que roda em qualquer máquina com Node.js.

*Tabela: Software usado na reprodução do aplicativo*

| Software | Versão | Uso |
|---|---|---|
| Git e GitHub CLI (`gh`) | atual | clonar o repositório privado e baixar as *Releases* |
| Node.js e npm | LTS (versão exata não registrada) | dependências do app, *mock*, scripts |
| JDK | 17 | Gradle do Android |
| Android SDK | API 36, *build-tools* (zipalign, apksigner, aapt2), emulador | compilação e verificação |
| Imagem do emulador | Android 16, API 36, x86_64 com Google Play (AVD `Medium_Phone_API_36.0`) | testes no Windows |
| Xcode, CocoaPods, Homebrew | Xcode 26.6 | compilação iOS |
| Python 3 com Pillow | 3.11 | verificador de 16 KB e gráficos da loja |
| Docker | atual | servidor OTA (opcional) |

As dependências do app estão fixadas em `cerise-expo/package-lock.json` (Expo SDK 57, React Native 0.86.3, React 19.2.3, ViroReact 2.58, expo-updates).

Contas: acesso à organização `cerise-ufg` no GitHub (repositório privado, solicitado ao bolsista); para publicar, conta de desenvolvedor do Google Play (taxa única de US$ 25), Apple Developer Program (TestFlight) e um domínio com HTTPS.

Espaço e tempo: o build iOS consumiu cerca de 4 GB no Mac (`docs/mac-ios/logs/build-ios-sim.log`), com `npm ci` em 5 s, `pod install` em 46 s e `xcodebuild` em 72 s (`docs/relatorio-2026/resultados/ios-build-resumo.txt`). O primeiro build Gradle não foi cronometrado; como estimativa, reserve 20 GB no Windows e um dia de trabalho para Android e iOS.

## Obtenção do código e dos dados

1. Peça acesso ao repositório e autentique o GitHub CLI com `gh auth login`.

2. Clone o repositório e mude para o branch da versão 1.1.0. O `main` contém o app nativo 1.0.0 (Kotlin e SwiftUI) e o app Expo 1.0.0; as pastas `cerise-expo/plugins/`, `store/`, `tools/` e `src/gen3d/` existem só no branch `feat/2026-gen3d-playstore`.

```bash
git clone https://github.com/cerise-ufg/cerise-ar.git
cd cerise-ar
git switch feat/2026-gen3d-playstore
```

3. Baixe, se quiser, os artefatos de referência: a *release* `v1.1.0` traz o AAB, o APK universal e o APK de emulador; a `v1.0.0` traz os IPAs, os `.xcarchive` e o bundle OTA de setembro de 2026.

```bash
gh release download v1.1.0 -R cerise-ufg/cerise-ar
gh release download v1.0.0 -R cerise-ufg/cerise-ar -p cerise-ar-ota-update-1.0.0-2026-09-18.zip
sha256sum cerise-ar-1.1.0-110.aab
```

4. Compare cada SHA-256 com a tabela de `RELEASES.md` (no Windows: `Get-FileHash .\cerise-ar-1.1.0-110.aab -Algorithm SHA256`). Os `.tar` do iOS se extraem com `tar -xf`; o bundle OTA, com `unzip`, que cria `dist/`.

5. Fotos de teste: use as fotos CC0 de `validation/real/` do repositório `cerise-2026-gen3d` (`cc0_duck.jpg`, `cc0_teapot.jpg`, `cc0_cat.jpg`, `cc0_donkey.jpg`) ou `docs/mac-ios/amostras/` deste repositório.

## Dependências e servidor de teste

1. Instale as dependências exatamente como no `package-lock.json`:

```bash
cd cerise-expo
npm ci
```

2. Suba o *mock* do servidor 3D. Ele reproduz o contrato `/api/v1` (fila com um *worker*, posição, ETA, estágios, progresso, cancelamento) e devolve GLBs de exemplo do catálogo, sem gerar nada a partir da foto; o app marca esses resultados como "servidor MOCK". Por padrão, escuta só em 127.0.0.1.

```bash
node tools/mock-gen3d-server.js --port 18096
# opcionais: MOCK_SPEED=0.5 (2x mais rápido), MOCK_FAIL_EVERY=3, MOCK_MAX_QUEUE=8
```

O log deve começar com `mock gen3d ouvindo em http://127.0.0.1:18096  (4 GLBs de exemplo, speed x1)`, e `GET /api/v1/health` deve devolver `"status":"ok"` e `"model":"mock (GLB de exemplo, sem IA)"`.

3. Servidor real (opcional): ele escuta só no *loopback* da máquina de GPU, na porta 8095. Para alcançá-lo do computador do emulador sem expor nada, use um encaminhamento SSH local:

```powershell
ssh -N -L 127.0.0.1:18095:localhost:8095 <usuario>@<maquina-gpu>
curl http://127.0.0.1:18095/api/v1/health
```

## Compilação e execução no Android

1. Gere a sua chave de *upload* (as do projeto não são distribuídas). Dentro de `cerise-expo`, crie a pasta `keystore/` (ignorada pelo git), gere o keystore e escreva `keystore/upload.properties` no formato lido pelo *plugin* `plugins/with-upload-signing.js`. Guarde o keystore e as senhas num cofre.

```powershell
mkdir keystore
keytool -genkeypair -v -keystore keystore\cerise-upload.jks -alias cerise-upload `
  -keyalg RSA -keysize 4096 -validity 10000
```

```
storeFile=cerise-upload.jks
storePassword=<senha do keystore>
keyAlias=cerise-upload
keyPassword=<senha da chave>
```

2. Gere o projeto nativo a partir do `app.json` e dos *plugins*, recrie o `local.properties` (o `--clean` apaga a pasta `android/`) e crie uma junção de caminho curto, porque o caminho do projeto estoura o limite de 260 caracteres do Windows no *codegen* C++:

```powershell
npx expo prebuild -p android --clean --no-install
Set-Content android\local.properties 'sdk.dir=C\:\\Users\\<usuario>\\AppData\\Local\\Android\\Sdk'
cmd /c mklink /J C:\cx <caminho-do-clone>\cerise-ar\cerise-expo    # uma vez
```

3. Compile o AAB e o APK release pela junção e copie-os para `build-out/` (ignorada pelo git):

```powershell
cd C:\cx\android
.\gradlew.bat :app:bundleRelease :app:assembleRelease
mkdir ..\build-out
copy app\build\outputs\bundle\release\app-release.aab ..\build-out\cerise-ar-1.1.0-110.aab
copy app\build\outputs\apk\release\app-release.apk ..\build-out\cerise-ar-1.1.0-110.apk
```

4. Gere o APK de emulador. O app só tem bibliotecas ARM (`armeabi-v7a` e `arm64-v8a`, as únicas do ViroReact, fixadas no `app.json`); o emulador x86_64 as executa por tradução, mas só as encontra se forem extraídas na instalação. O comando sobrescreve o APK anterior, por isso copie-o antes:

```powershell
.\gradlew.bat :app:assembleRelease '-Pexpo.useLegacyPackaging=true'
copy app\build\outputs\apk\release\app-release.apk `
  ..\build-out\cerise-ar-1.1.0-110-emulador-legacypackaging.apk
```

5. No Device Manager do Android Studio, crie um AVD Medium Phone com Android 16 (API 36), Google Play e x86_64, inicie-o e instale o APK adequado (num aparelho ARM, o universal):

```powershell
adb install C:\cx\build-out\cerise-ar-1.1.0-110-emulador-legacypackaging.apk   # emulador
adb install C:\cx\build-out\cerise-ar-1.1.0-110.apk                            # aparelho ARM
adb logcat -s ReactNativeJS
```

O `logcat` mostra, ao fim de cada download, a linha `[gen3d] modelo pronto {...}` com os tempos de envio, fila, geração e download medidos pelo app.

## Configuração do servidor e teste do fluxo

1. No app, abra Configurações e informe a URL: `http://10.0.2.2:18096` (emulador → *mock*), `http://10.0.2.2:18095` (emulador → servidor real pelo encaminhamento) ou `http://localhost:18096` (Simulador iOS → *mock*). Toque em Testar conexão: deve aparecer "Conectado", com estado, modelo, GPU, fila e *presets*.

2. Em Criar modelo 3D, escolha a foto pela câmera ou pela galeria (no emulador, arraste a foto para a janela para copiá-la), a qualidade (Rápido, Padrão ou Alto) e as opções Textura colorida e Remover fundo, e toque em Gerar modelo 3D.

3. Acompanhe a posição na fila, a ETA e o progresso por estágio. O card Pronto mostra tamanho, vértices, triângulos e tempo total, com Ver em 3D e Ver em RA.

4. Em Meus modelos, abra os detalhes (tempos no app e, com o servidor real, "No servidor: fila X s · GPU Y s") e o visualizador 3D, que funciona sem rede. A RA exige aparelho físico. Excluir um modelo também apaga a foto e o modelo no servidor.

![App no emulador contra o servidor real: teste de conexão, servidor 3D online, seletor de fotos e escolha do preset](docs/relatorio-2026/evidencias/fig13-android-real-config-criar.png)

*Figura: App no emulador contra o servidor real: teste de conexão, servidor 3D online, seletor de fotos e escolha do preset.*

![Fluxo de geração com o servidor real: envio da foto, geração da malha, texturização e resultado em 13,5 s no total](docs/relatorio-2026/evidencias/fig14-android-real-fluxo-geracao.png)

*Figura: Fluxo de geração com o servidor real: envio da foto, geração da malha, texturização e resultado em 13,5 s no total.*

O build release bloqueia `http://` para qualquer host exceto `10.0.2.2`, `localhost` e `127.0.0.1` (*plugin* `plugins/with-network-security.js`); num aparelho físico, use um servidor com HTTPS. Para um teste de laboratório, nunca no build da loja, o *plugin* aceita a opção `hosts` no `app.json` e o *mock* aceita `--host 0.0.0.0`; esse caso não foi testado no projeto.

## Compilação e execução no iOS

1. Simulador. O `ViroKit.framework` só tem a fatia arm64 de dispositivo, por isso o build de simulador usa `CERISE_NO_VIRO=1`, que remove o módulo de RA (o app esconde as entradas de RA). O script do projeto supõe o clone em `~/CeriseAR`, compila para o iPhone 17 Pro (troque o `-destination` se o seu Xcode não tiver esse simulador) e grava o `.app` em `~/CeriseAR/build-sim-dd`:

```bash
gh auth login                  # no Mac, se ainda não autenticou
gh repo clone cerise-ufg/cerise-ar ~/CeriseAR
cd ~/CeriseAR && git switch feat/2026-gen3d-playstore
bash cerise-expo/tools/ios/build-ios-sim.sh
```

O equivalente manual, dentro de `~/CeriseAR/cerise-expo`, é o abaixo. Mantenha `CERISE_NO_VIRO=1` exportada em todos os passos: o `react-native.config.js` a lê no *autolinking*, que roda no `pod install`, e sem ela o ViroReact volta a ser ligado. O `-derivedDataPath` grava o `.app` no caminho usado no passo 2.

```bash
export CERISE_NO_VIRO=1
npm ci
npx expo prebuild -p ios --clean --no-install
(cd ios && pod install)
xcodebuild -workspace ios/CERISEAR.xcworkspace -scheme CERISEAR -sdk iphonesimulator \
  -configuration Release -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath ~/CeriseAR/build-sim-dd CODE_SIGNING_ALLOWED=NO build
```

2. Abra o Simulador (Xcode → Open Developer Tool → Simulator), instale e abra o app e suba o *mock* no Mac; depois configure `http://localhost:18096` e repita o teste do fluxo (arraste uma foto para o Simulador para adicioná-la à galeria):

```bash
xcrun simctl install booted \
  ~/CeriseAR/build-sim-dd/Build/Products/Release-iphonesimulator/CERISEAR.app
xcrun simctl launch booted br.ufg.cerise.arviewer
node ~/CeriseAR/cerise-expo/tools/mock-gen3d-server.js --port 18096
```

Para refazer as capturas do projeto sem interação, copie `docs/mac-ios/amostras` para `~/CeriseAR/samples` e rode `bash cerise-expo/tools/ios/rebuild-ios-sim.sh` (recompila com `CERISE_TEST_MODE=1`, que habilita os links `cerisear://`) e `bash cerise-expo/tools/ios/capture-ios.sh` (telas em `~/CeriseAR/shots-ios`).

3. iPhone e TestFlight. Troque `ios.bundleIdentifier` no `app.json` por um identificador seu (`br.ufg.cerise.arviewer` pertence à conta do projeto) e, na sessão gráfica do Mac, gere o projeto com RA:

```bash
cd ~/CeriseAR/cerise-expo
unset CERISE_NO_VIRO CERISE_TEST_MODE
npx expo prebuild -p ios --clean
(cd ios && pod install)
open ios/CERISEAR.xcworkspace
```

No Xcode, em CERISEAR → Signing & Capabilities, marque Automatically manage signing e escolha a sua equipe; selecione o iPhone, a configuração Release (Product → Scheme → Edit Scheme) e Product → Run. Para o TestFlight: destino Any iOS Device (arm64), Product → Archive e, no Organizer, Distribute App → App Store Connect → Upload; no App Store Connect, adicione testadores internos na aba TestFlight. Detalhes em `cerise-expo/store/IOS_IPHONE_TESTFLIGHT.md` e `ios/TESTFLIGHT.md`. Na versão 1.1.0, essa etapa foi documentada, mas não executada.

## Servidor OTA próprio (opcional)

O app usa o protocolo expo-updates com servidor próprio, sem EAS. A `runtimeVersion` é a `version` do `app.json` (1.1.0), e só JavaScript e *assets* vão por OTA.

1. Construa e suba o servidor (Node/Express, porta 3000), com os dados num volume e a URL pública em `PUBLIC_BASE`, atrás de um *proxy* HTTPS (o `ota-server/README.md` traz a regra do Caddy: `handle_path /updates/*` → `reverse_proxy cerise-ota-server:3000`):

```bash
docker build -t cerise-ota-server ota-server/
docker run -d --name cerise-ota-server -p 3000:3000 -v <pasta-de-dados>:/data \
  -e PUBLIC_BASE=https://<seu-dominio>/updates cerise-ota-server
curl -i -H "expo-runtime-version: 1.1.0" -H "expo-platform: android" http://localhost:3000/manifest
```

Sem publicações, o manifesto responde 204. Para testar sem compilar, copie o conteúdo do `dist/` da *release* `v1.0.0` para `<pasta-de-dados>/updates/1.0.0/<nome-qualquer>/` e repita o `curl` com `expo-runtime-version: 1.0.0`: a resposta passa a 200, com o `launchAsset`.

2. No `app.json`, troque `updates.url` por `https://<seu-dominio>/updates/manifest` e recompile (mudança nativa). No `ota-server/publish-update.mjs`, ajuste `SSH_HOST` (o seu servidor) e `REMOTE_ROOT` (`<pasta-de-dados>/updates`) e publique, na raiz do repositório:

```bash
node ota-server/publish-update.mjs "o que mudou"
```

O script executa `npx expo export --platform all --clear`, grava `dist/update.json` e copia `dist/` para `REMOTE_ROOT/<runtimeVersion>/<id>/`; os apps com a mesma `runtimeVersion` recebem a atualização na próxima abertura. O placar do jogo Caça CERISE usa o mesmo servidor (`SCORES_URL` em `src/screens/GameScreen.tsx`).

## Preparação da publicação na Play Store

1. No `app.json`, ajuste `android.package` (o `com.cerisear` pode já estar em uso na loja), `version` e `android.versionCode` (que cresce a cada envio) e rode de novo `npx expo prebuild -p android --clean --no-install`.

2. Publique o servidor 3D com HTTPS e defina a URL padrão na constante `DEFAULT_SERVER` de `src/gen3d/settings.ts`. Se o servidor exigir chave (`GEN3D_API_KEYS`), defina `$env:EXPO_PUBLIC_GEN3D_API_KEY = '<sua chave>'` antes do Gradle; a chave fica embutida no bundle e só protege contra uso casual.

3. Adapte `store/privacidade.html` (controlador, contato, retenção), publique-a numa URL HTTPS e atualize `PRIVACY_URL` em `src/screens/AboutScreen.tsx` e `extra.privacyPolicyUrl` no `app.json`.

4. Revise a ficha `store/listing-pt-BR.md`, confira os limites de caracteres e, se trocar as capturas, regenere ícone, recurso gráfico e capturas (na raiz do repositório):

```bash
node cerise-expo/store/check-listing.js
python cerise-expo/store/make-graphics.py docs/relatorio-2026/evidencias
```

5. Recompile e verifique o AAB (seção seguinte) e siga as etapas 1 a 7 de `store/PUBLICAR_PLAY_STORE.md`, com as respostas de `store/formularios-play-console.md`: criar o app; configurar política, acesso, anúncios, IARC, público-alvo (13+) e segurança dos dados; preencher a ficha; enviar o AAB ao teste interno, aceitando o Play App Signing; fazer o teste fechado (12 testadores por 14 dias, exigido de contas pessoais criadas após novembro de 2023); e só então pedir a produção, com o servidor 3D respondendo na URL pública. Os passos 0b e 0c do guia são específicos do servidor do projeto.

## Verificação do resultado

Em `C:\cx`, com a pasta *build-tools* do SDK no PATH, verifique os artefatos:

```powershell
python tools/check-16kb.py build-out/cerise-ar-1.1.0-110.aab build-out/cerise-ar-1.1.0-110.apk
zipalign -c -P 16 -v 4 build-out/cerise-ar-1.1.0-110.apk
aapt2 dump badging build-out/cerise-ar-1.1.0-110.apk
apksigner verify --print-certs build-out/cerise-ar-1.1.0-110.apk
jarsigner -verify build-out/cerise-ar-1.1.0-110.aab
```

![Verificação do AAB e do APK release: páginas de 16 KB, zipalign, SDK alvo 36, permissões e ABIs](docs/relatorio-2026/evidencias/fig07-terminal-playstore-16kb.png)

*Figura: Verificação do AAB e do APK release: páginas de 16 KB, zipalign, SDK alvo 36, permissões e ABIs.*

Os tamanhos do seu build devem ser próximos dos de referência, e o certificado será o da sua chave. Na tabela, `resultados/` é `docs/relatorio-2026/resultados/`.

*Tabela: Valores de referência medidos no projeto*

| Verificação | Resultado esperado | Arquivo |
|---|---|---|
| `check-16kb.py` | AAB e APK: 30/30 `.so` de 64 bits com PT_LOAD ≥ 16 KB; offset no zip alinhado: 30/30 | `resultados/final-check-16kb.json` |
| `zipalign -c -P 16` | Verification successful | `resultados/final-artefatos-verificacao.txt` |
| `aapt2 dump badging` | versionCode 110, versionName 1.1.0, minSdk 24, targetSdk 36; CAMERA, INTERNET, ACCESS_NETWORK_STATE; ABIs arm64-v8a e armeabi-v7a | `resultados/apk-badging.txt` |
| Tamanhos | AAB 55.157.760 B; APK 83.299.939 B; APK de emulador 48.616.475 B | `resultados/final-artefatos-verificacao.txt` |
| Simulador iOS | BUILD SUCCEEDED; `.app` de 41 MB, 1.1.0 build 2, iOS mínimo 17.6 | `resultados/ios-build-resumo.txt` |
| Fluxo com o *mock* | geração simulada de 12 s, 18 s e 26 s (Rápido, Padrão e Alto, com textura); Padrão: 23,2 s no total | `tools/mock-gen3d-server.js`; Tabela 3 de `RELATORIO_SECAO.md` |
| Fluxo com o servidor real, sem fila | total de 13,5 s (Rápido), 17,1 s (Padrão) e 31,5 s (Alto); reenvio da mesma foto pelo cache: 1,0 s | `resultados/real-tempos-app.csv` |
| GLB recebido | textura JPEG, maior dimensão 0,300 m; 10.000, 19.998 e 39.998 triângulos por *preset* | `resultados/real-tempos-app.csv` |
| Exclusão no app | `GET /api/v1/jobs/{id}` passa de 200 a 404 | `resultados/real-exclusao-servidor.txt` |

Para regenerar a tabela de tempos a partir dos registros brutos, execute na raiz `python docs/relatorio-2026/resultados/scripts/tempos_e2e.py docs/relatorio-2026/resultados/real-logcat-app.txt docs/relatorio-2026/resultados/real-jobs-servidor.json`; o `real-tempos-app.csv` gerado é idêntico ao versionado.

## Problemas comuns e soluções

- Erro de caminho longo no *codegen* C++ do Gradle no Windows: compile sempre pela junção `C:\cx` (limite de 260 caracteres).
- "SDK location not found" após `expo prebuild --clean`: a pasta `android/` foi recriada sem o `local.properties`; grave-o de novo.
- Aviso `[cerise] keystore/upload.properties ausente`: o release foi assinado com a chave de depuração; crie o `upload.properties`.
- App fecha ao abrir no emulador x86_64: instale o APK de emulador (`-Pexpo.useLegacyPackaging=true`), porque o `SoLoader` não encontra as bibliotecas ARM não comprimidas sob tradução. O build da loja mantém o empacotamento padrão.
- Não acrescente `x86` ou `x86_64` às ABIs: o ViroReact não tem essas bibliotecas, e o app encerrava com `UnsatisfiedLinkError: libviro_renderer.so`.
- RA no emulador: com o Google Play Services for AR instalado, o ARCore x86 não carrega no processo ARM traduzido (`AR_ERROR_FATAL`) e o ViroReact encerra o app; sem ele, o app mostra "RA indisponível". Teste a RA em aparelho físico.
- ViroKit não linka no Simulador iOS: use `CERISE_NO_VIRO=1`. Para iPhone, faça `unset CERISE_NO_VIRO` e um novo `npx expo prebuild -p ios --clean`, senão o app vai sem RA.
- Assinatura iOS por SSH falha com `errSecInternalComponent`: o *keychain* fica travado em sessões SSH; assine na sessão gráfica ou destrave-o (Opção C de `ios/INSTALL-IPHONE-MAC.md`).
- Páginas de 16 KB: a Play as exige para apps com alvo Android 15 ou superior; se o `check-16kb.py` listar uma biblioteca fora do padrão, atualize a dependência que a fornece.
- "Servidor 3D não respondeu" num aparelho físico: o release bloqueia `http://` fora dos endereços de teste; use HTTPS. Avisos "Servidor 3D iniciando" ou "em pausa" indicam que o pedido espera o *worker* carregar o modelo.
- A atualização OTA não chega: o app só aceita a mesma `runtimeVersion` (a `version` do `app.json`); mudanças nativas exigem novo build.

## Referências do repositório

- [`README.md`](README.md) e [`RELEASES.md`](RELEASES.md): visão geral, branches e artefatos com SHA-256.
- [`cerise-expo/app.json`](cerise-expo/app.json), `cerise-expo/app.config.js` [feat] e `cerise-expo/README.md` [feat]: configuração nativa, `CERISE_NO_VIRO`, `CERISE_TEST_MODE`, contrato da API e builds.
- `cerise-expo/plugins/` [feat]: assinatura de *upload* (`with-upload-signing.js`) e bloqueio de `http://` (`with-network-security.js`).
- `cerise-expo/src/gen3d/` [feat]: cliente da API, fila, download e URL padrão (`settings.ts`).
- `cerise-expo/tools/` [feat]: *mock* (`mock-gen3d-server.js`), verificador de 16 KB (`check-16kb.py`), gerador do visualizador (`build-viewer.js`) e scripts do iOS (`ios/`).
- `cerise-expo/store/` [feat]: `PUBLICAR_PLAY_STORE.md`, `IOS_IPHONE_TESTFLIGHT.md`, `formularios-play-console.md`, `listing-pt-BR.md` e `privacidade.html`.
- [`ota-server/`](ota-server/): servidor OTA ([`server.js`](ota-server/server.js), [`Dockerfile`](ota-server/Dockerfile), [`publish-update.mjs`](ota-server/publish-update.mjs), [`README.md`](ota-server/README.md)).
- [`docs/relatorio-2026/RELATORIO_SECAO.md`](docs/relatorio-2026/RELATORIO_SECAO.md), [`evidencias/`](docs/relatorio-2026/evidencias/) e [`resultados/`](docs/relatorio-2026/resultados/): texto técnico, figuras e dados medidos.
- [`docs/mac-ios/`](docs/mac-ios/): logs e amostras dos builds iOS.
- [`ios/INSTALL-IPHONE-MAC.md`](ios/INSTALL-IPHONE-MAC.md) e [`ios/TESTFLIGHT.md`](ios/TESTFLIGHT.md): assinatura e envio no Mac.
