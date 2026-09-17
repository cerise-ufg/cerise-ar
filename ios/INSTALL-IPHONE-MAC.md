# CERISE AR — instalar no iPhone (build no Mac)

Guia de copiar/colar. O app iOS (SwiftUI + ARKit + GLTFKit2, gerado com XcodeGen)
compila **só no macOS**. O código já está no Mac em `~/CeriseAR/ios`.

- iPhone alvo: **"Huawei Phone"** (iPhone 14 Pro Max, iOS 26.6.1) — UDID
  `00008120-001A031E2E5BC01E`, conectado por Wi-Fi.
- Time de assinatura recomendado: **`6T2ZP362BQ`** ("Eduardo Caixeta", conta paga
  já logada no Xcode; tem profile curinga que cobre qualquer bundle).

> **Por que às vezes falha por SSH:** o `codesign` precisa da chave privada do
> certificado, e o keychain fica **inacessível numa sessão SSH** (`errSecInternalComponent`).
> Na sessão gráfica do Mac (Terminal.app / Xcode) funciona. Alternativamente,
> destrave o keychain uma vez (Opção C) e o SSH passa a assinar.

---

## Opção A — no Terminal.app DO MAC (mais simples)

Abra o **Terminal** no próprio Mac e cole:

```bash
cd ~/CeriseAR/ios && ./scripts/install-iphone.sh --team 6T2ZP362BQ --device 00008120-001A031E2E5BC01E
```

Se aparecer um pop-up pedindo acesso ao keychain, clique **"Sempre Permitir"**.
No fim, o CERISE AR é instalado no iPhone.

---

## Opção B — pelo Xcode (cliques)

```bash
open ~/CeriseAR/ios/CeriseAR.xcodeproj
```

No Xcode: target **CeriseAR** → aba **Signing & Capabilities** → **Team: Eduardo
Caixeta** → escolher o **"Huawei Phone"** no seletor de device → **⌘R**.

---

## Opção C — destravar o keychain uma vez e deixar o build rodar por SSH

Rode ESTES DOIS comandos uma vez, num terminal do Mac (vai pedir a **senha de
login do Mac**):

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
security set-key-partition-list -S apple-tool:,apple:,codesign: -s ~/Library/Keychains/login.keychain-db
```

Depois disso, o build/instalação pode ser disparado por SSH (inclusive por mim):

```bash
cd ~/CeriseAR/ios && ./scripts/install-iphone.sh --team 6T2ZP362BQ --device 00008120-001A031E2E5BC01E
```

---

## Comandos crus (se o script falhar / para depurar)

```bash
# 1. gerar o projeto (XcodeGen já está em ios/tools)
cd ~/CeriseAR/ios
./tools/xcodegen/bin/xcodegen generate

# 2. compilar + assinar para o dispositivo
xcodebuild \
  -project CeriseAR.xcodeproj -scheme CeriseAR -configuration Debug \
  -destination "id=00008120-001A031E2E5BC01E" \
  -derivedDataPath .build -allowProvisioningUpdates \
  DEVELOPMENT_TEAM=6T2ZP362BQ CODE_SIGN_STYLE=Automatic \
  build

# 3. instalar no iPhone
xcrun devicectl device install app --device 00008120-001A031E2E5BC01E \
  .build/Build/Products/Debug-iphoneos/CeriseAR.app
```

---

## Referência: conectar no Mac por SSH (a partir do Windows / PowerShell)

O alias `mac-remoto` já está em `C:\Users\eduar\.ssh\config` (túnel reverso via
`wenfur-root`, porta 22023). Use o **PowerShell** (OpenSSH nativo):

```powershell
ssh mac-remoto "sw_vers && xcodebuild -version"
```

Se `mac-remoto` recusar conexão, o túnel caiu; espere reconectar (autossh) ou
cheque no servidor:

```powershell
ssh wenfur-root "ss -tln | grep :22023"
```

---

## Estado atual (2026-09-16)

- App **compila 100%** (corrigido o API drift do GLTFKit2:
  `GLTFAsset.load(with:options:handler:)`).
- Projeto gerado, XcodeGen instalado em `ios/tools`, iPhone acessível por Wi-Fi.
- Único passo pendente: **autorizar a assinatura** (Opção A, B ou C acima) —
  precisa da sessão gráfica do Mac ou da senha de login.
