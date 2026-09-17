# CERISE AR — subir no TestFlight (passo a passo)

O projeto já está preparado (`~/CeriseAR/ios`): Release compila, ícone, versão
1.0.0 (build 1), chave de export-compliance e conta de assinatura (**time
`6T2ZP362BQ` — "Eduardo Caixeta"**) prontos. Faltam só os passos abaixo, que
**precisam da sessão gráfica do Mac** (Archive/assinatura) e do **seu login no
App Store Connect**.

> ⏱️ **Prazo curto (evento em ~2 dias):** o **link PÚBLICO** de TestFlight exige
> revisão de beta da Apple (~1 dia, sem garantia). Pro dia do evento, use
> **Teste Interno** (até 100 pessoas, **sem revisão**, sai na hora). Deixe o link
> público em revisão em paralelo, como bônus.

---

## Parte A — App Store Connect (web, uma vez)

1. Entre em **https://appstoreconnect.apple.com** com a conta do time
   `6T2ZP362BQ`.
2. **Agreements, Tax, and Banking** → o contrato de apps gratuitos precisa estar
   **Active** (aceite se estiver pendente — senão o upload é bloqueado).
3. **Apps → (+) → New App**:
   - Platform: **iOS**
   - Name: **CERISE AR** (se já existir na loja, use ex. "CERISE AR Viewer")
   - Primary Language: **Português (Brasil)**
   - Bundle ID: **br.ufg.cerise.arviewer**
     - Se não aparecer na lista: faça a **Parte B (upload) primeiro** — ela
       registra o bundle — e depois crie o app aqui.
   - SKU: qualquer texto, ex. `cerise-ar-viewer`
   - (Para TestFlight NÃO precisa de screenshots nem descrição.)

---

## Parte B — Archive + Upload (Xcode no Mac)

1. Abra o projeto:
   ```bash
   open ~/CeriseAR/ios/CeriseAR.xcodeproj
   ```
2. Target **CeriseAR** → aba **Signing & Capabilities**:
   - **Team: Eduardo Caixeta** (`6T2ZP362BQ`)
   - **Automatically manage signing** ligado
3. No seletor de device (topo), escolha **Any iOS Device (arm64)**
   (não dá pra Archive com simulador selecionado).
4. Menu **Product → Archive**. O Xcode cria o certificado/profile de
   distribuição sozinho. Se aparecer pop-up de keychain, **"Always Allow"**.
5. Abre o **Organizer**. Clique **Distribute App → App Store Connect → Upload**
   → avance com os padrões (manage signing automático) → **Upload**.
6. Aguarde **"Upload Successful"**.

---

## Parte C — TestFlight (App Store Connect web)

1. Seu app → aba **TestFlight**. O build aparece como **Processing** (~5-30 min).
2. Quando processar:

   **Teste Interno (recomendado pro evento — sem revisão, imediato):**
   - **Users and Access** → adicione as pessoas (Apple ID de cada uma) como
     usuários da conta.
   - TestFlight → **Internal Testing** → crie um grupo → adicione o build →
     adicione os testers. Eles recebem e-mail/convite na hora.

   **Link Público (bônus — precisa de revisão ~1 dia):**
   - TestFlight → **External Testing** → novo grupo → adicione o build →
     preencha **Test Information** → **Submit for Review**.
   - Aprovado → ative **Public Link** → compartilhe a URL (até 10.000 pessoas).

---

## Parte D — Em cada iPhone

1. Instale o app **TestFlight** (App Store).
2. Abra o convite/link → **Install** → CERISE AR aparece na tela inicial.

---

## Reenviar um build novo (se precisar)

O **build number** tem que subir a cada upload. Em `ios/project.yml`:
`CURRENT_PROJECT_VERSION` de `"1"` → `"2"` etc., depois
`./tools/xcodegen/bin/xcodegen generate` e repita a Parte B.

---

## O que está sendo enviado

Este build é o **visualizador AR atual** (home com catálogo + tela AR de
tap-to-place, foto da cena, exportar). **NÃO** é a caça ao tesouro do Summit —
essa é uma feature nova que não fica pronta + revisada + distribuída em 2 dias.
Pro evento, o caminho realista da caça é rodar em **aparelhos preparados**
(Teste Interno / loaner phones).
