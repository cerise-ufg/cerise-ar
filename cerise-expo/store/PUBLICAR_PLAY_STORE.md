# Publicar o CERISE AR na Google Play — passo a passo

Tudo o que dá para preparar sem a conta do Eduardo já está pronto nesta pasta (`cerise-expo/store/`)
e em `cerise-expo/build-out/`. Os passos marcados com 🔑 exigem o login do Eduardo no Play Console.

| Item pronto | Onde |
|---|---|
| AAB assinado com a chave de **upload** (versão 1.1.0, versionCode 110, targetSdk 36) — rebuild final de 26/10/2026 (~10:33), depois do teste ponta a ponta contra o servidor 3D real | `build-out/cerise-ar-1.1.0-110.aab` (55.157.760 bytes, SHA-256 `1dfba4b8…dcf9`) |
| APK release (instalação direta / testes; mesma versão e mesmo bundle JS do AAB) | `build-out/cerise-ar-1.1.0-110.apk` (83.299.939 bytes, SHA-256 `dd65ae36…05e8`) |
| Keystore de upload + senhas (FORA do git) | `keystore/cerise-upload.jks` + `keystore/upload.properties` |
| Textos da ficha (nome, descrições, notas da versão) | `store/listing-pt-BR.md` (limites conferidos em `store/listing-check.json`) |
| Ícone 512×512, recurso gráfico 1024×500, 7 capturas (2, 3 e 7 com o servidor 3D real; nenhuma com o mock) | `store/icon-512.png`, `store/feature-graphic-1024x500.png`, `store/screenshots/` |
| Política de privacidade (pronta; **publicação pendente**, ver passo 0b) | URL: https://cerise.wenfur.com.br/privacidade.html · fonte: `store/privacidade.html` |
| Respostas: Segurança dos dados, IARC, público-alvo, acesso ao app | `store/formularios-play-console.md` |

---

## 0. Antes de tudo — backup do keystore de upload ⚠️

`keystore/cerise-upload.jks` e `keystore/upload.properties` **não estão no git**. Copie os dois para
um local seguro (ex.: cofre de senhas + pendrive/drive institucional). Se a chave de upload se perder,
dá para pedir a redefinição no Play Console (Play App Signing), mas leva alguns dias.

Impressão digital SHA-256 do certificado de upload (pública, útil para conferir no Console):
`C7:E8:46:6A:27:AF:50:7E:6E:15:92:3A:26:55:29:57:05:30:15:68:AF:B7:ED:F3:98:28:FD:18:64:F1:B6:D9`

## 0b. Publicar a política de privacidade (1 comando)

A página é estática e o container `cerise-ota` (nginx) já serve `/opt/cerise-ota` como raiz de
`https://cerise.wenfur.com.br/`. Basta **adicionar o arquivo** (não altera config nem outros arquivos):

```powershell
scp C:\Users\eduar\AndroidStudioProjects\CeriseAR\cerise-expo\store\privacidade.html wenfur-root:/opt/cerise-ota/privacidade.html
ssh wenfur-root "chmod 644 /opt/cerise-ota/privacidade.html"
curl -I https://cerise.wenfur.com.br/privacidade.html   # deve responder 200 text/html
```

> Em 26/10/2026 a página ainda não havia sido publicada (a URL respondia 404); o passo ficou pendente.

## 0c. (Pendente — decisão do Eduardo) Publicar o APK 1.1.0 para instalação direta

Decisão de 26/10/2026: **nada foi publicado no wenfur**. O APK release final (mesmo código do AAB,
assinado com a chave de upload, testado ponta a ponta contra o servidor 3D real) está em
`build-out/cerise-ar-1.1.0-110.apk`. Para disponibilizá-lo por link direto, quando decidir:

```powershell
scp C:\Users\eduar\AndroidStudioProjects\CeriseAR\cerise-expo\build-out\cerise-ar-1.1.0-110.apk wenfur-root:/opt/cerise-ota/ota/cerise-ar-1.1.0.apk
ssh wenfur-root "chmod 644 /opt/cerise-ota/ota/cerise-ar-1.1.0.apk && sha256sum /opt/cerise-ota/ota/cerise-ar-1.1.0.apk"
curl.exe -sI https://cerise.wenfur.com.br/ota/cerise-ar-1.1.0.apk   # deve responder 200 e Content-Length igual ao arquivo local
Get-FileHash C:\Users\eduar\AndroidStudioProjects\CeriseAR\cerise-expo\build-out\cerise-ar-1.1.0-110.apk -Algorithm SHA256   # conferir com o sha256sum acima
```

- **Não** altere `/opt/cerise-ota/ota/version.json`: ele é lido pelo app nativo antigo (1.0.0, `cerise-1.apk`) para
  oferecer atualização; mudar o `apkUrl` ali empurraria a 1.1.0 para quem tem a versão antiga — decisão separada.
- Em 26/10/2026 `https://cerise.wenfur.com.br/ota/cerise-ar-1.1.0.apk` respondia **404** (nada publicado) e
  `https://cerise.wenfur.com.br/ota/cerise-1.apk` respondia 200 (APK antigo, 66 MB).
- A geração 3D só funciona fora da rede interna depois que o servidor 3D for exposto (passo 7.1).
- O APK é assinado com a chave de **upload**; com o Play App Signing, a versão da Play é assinada por outra
  chave. Quem instalar pelo link direto não recebe atualização pela Play (precisa desinstalar antes).

## 0d. Chave de API do servidor 3D (só se a exposição usar `GEN3D_API_KEYS`)

O app envia o cabeçalho `X-API-Key` quando é compilado (ou publicado por OTA) com a variável
`EXPO_PUBLIC_GEN3D_API_KEY` definida; sem ela, nenhum cabeçalho é enviado (caso deste AAB). A chave fica
embutida no bundle JS — serve contra uso casual, junto com o *rate limit* do servidor, não como segredo forte.

```powershell
$env:EXPO_PUBLIC_GEN3D_API_KEY = '<a mesma chave de gen3d.secrets.env no Spark>'
cd C:\cx\android; .\gradlew.bat :app:bundleRelease :app:assembleRelease
```

## 1. 🔑 Conta de desenvolvedor

1. Acesse https://play.google.com/console e entre com a conta Google que será dona do app.
2. Se ainda não houver conta de desenvolvedor: pague a taxa única (US$ 25), escolha **Pessoal** ou
   **Organização** e conclua a verificação de identidade (documento + telefone).
   - Conta **Organização** (ex.: em nome da UFG/fundação) exige número D-U-N-S e **não** tem a regra dos 12 testadores.
   - Conta **Pessoal criada após nov/2023**: para liberar a produção é obrigatório um **teste fechado com
     pelo menos 12 testadores ativos por 14 dias seguidos** (ver passo 6).

## 2. 🔑 Criar o app

*Todos os apps → Criar app*:
- Nome: `CERISE AR: Foto em 3D e RA` · Idioma padrão: **Português (Brasil) – pt-BR**
- Tipo: **App** · Gratuito
- Aceitar as declarações (políticas do programa e leis de exportação dos EUA).

> **Nome do pacote:** o AAB usa `com.cerisear`. Se o Console disser que o pacote já existe em outra
> conta, é preciso trocar `android.package` em `app.json` (ex.: `br.ufg.cerise.ar`), rodar
> `npx expo prebuild -p android --clean` e gerar o AAB de novo (ver "Gerar novo AAB" no fim).

## 3. 🔑 Configurar o app (painel "Configurar o app")

Use as respostas prontas de `store/formularios-play-console.md`:
1. **Política de privacidade:** `https://cerise.wenfur.com.br/privacidade.html`
2. **Acesso ao app:** "Todas as funcionalidades estão disponíveis sem restrições" + instruções para revisores.
3. **Anúncios:** "Não, meu app não contém anúncios".
4. **Classificação do conteúdo:** questionário IARC (resultado esperado: Livre).
5. **Público-alvo:** 13–15, 16–17, 18+.
6. **Segurança dos dados:** conforme a tabela (Fotos e Nome, opcionais, não compartilhados, criptografados em trânsito).
7. **Apps de governo / recursos financeiros / saúde:** Não.
8. **Categoria e contato:** Educação; e-mail de suporte do Eduardo; site do CERISE.

## 4. 🔑 Ficha da loja

*Crescimento → Presença na loja → Página principal da loja*: colar os textos de `listing-pt-BR.md`, enviar
`icon-512.png`, `feature-graphic-1024x500.png` e 4–8 imagens de `screenshots/` (telefone).

## 5. 🔑 Teste interno (primeiro envio do AAB)

1. *Testar e lançar → Testes → Teste interno → Criar nova versão*.
2. Aceitar o **Play App Signing** (o Google gera e guarda a chave de assinatura do app; a nossa é só a de upload).
3. Enviar `build-out/cerise-ar-1.1.0-110.aab`. Nome da versão: `1.1.0 (110)`. Notas: as de `listing-pt-BR.md`.
4. Criar a lista de testadores (e-mails) → Salvar → **Revisar versão → Iniciar lançamento**.
5. Abrir o link de participação no celular, instalar pela Play Store e verificar: abrir, catálogo, RA,
   Criar 3D (com o servidor no ar), Meus modelos, visualização 3D.
6. Conferir o **relatório de pré-lançamento** (Play testa em aparelhos reais e aponta falhas/acessibilidade).

## 6. 🔑 Teste fechado (obrigatório para conta pessoal nova)

1. *Testes → Teste fechado → Criar faixa* → promover a versão do teste interno.
2. Adicionar **≥ 12 testadores** (lista de e-mails ou Grupo do Google) — ex.: equipe do CERISE e alunos.
3. Os 12 precisam **aceitar o convite, instalar e manter o app instalado por 14 dias seguidos**.
4. Depois dos 14 dias: *Painel → Solicitar acesso à produção* (responder o questionário sobre o teste).

## 7. 🔑 Produção

1. **Antes de enviar:** o servidor de geração 3D tem que estar publicado e respondendo em
   `https://cerise.wenfur.com.br/gen3d/api/v1/health` (senão o revisor verá "Servidor 3D não respondeu").
   Em 26/10/2026 o servidor está pronto e foi validado ponta a ponta com este app, mas só é acessível pela
   rede interna (encaminhamento SSH local); a **exposição pública é decisão pendente do Eduardo** — proposta,
   riscos e passos em `cerise-2026-gen3d/server/README.md`. Conferência depois de expor:
   `curl.exe -s https://cerise.wenfur.com.br/gen3d/api/v1/health` deve devolver `"status":"ok"`.
2. *Produção → Criar nova versão* → promover a versão testada → países: Brasil (ou todos) → **Enviar para revisão**.
3. A primeira revisão costuma levar de alguns dias a ~1 semana.

## Gerar novo AAB (próximas versões)

```powershell
# 1) aumente "version" (ex.: 1.1.1) e android.versionCode (ex.: 111) em cerise-expo/app.json
# 2) gere o projeto nativo e compile pela junção curta (limite de 260 caracteres do Windows):
cd C:\Users\eduar\AndroidStudioProjects\CeriseAR\cerise-expo
npx expo prebuild -p android --clean --no-install
Set-Content android\local.properties 'sdk.dir=C\:\\Users\\eduar\\AppData\\Local\\Android\\Sdk'
cmd /c mklink /J C:\cx C:\Users\eduar\AndroidStudioProjects\CeriseAR\cerise-expo   # se a junção ainda não existir
cd C:\cx\android
.\gradlew.bat :app:bundleRelease :app:assembleRelease
# AAB: android\app\build\outputs\bundle\release\app-release.aab (assinado com keystore/upload.properties)
```

Mudanças só de JavaScript (telas, textos, fluxo) podem ir por **OTA** para quem já tem a mesma versão
nativa (`node ota-server/publish-update.mjs "mensagem"`, runtime = `version` do app.json). Mudanças nativas,
de permissões ou de `app.json` exigem novo AAB pela Play Store.

## Conformidade técnica verificada nesta versão

Ver as Seções 3.2, 4.1 e 5 do `docs/relatorio-2026/RELATORIO_SECAO.md` (targetSdk 36, permissões mínimas, 16 KB,
tamanho do AAB, assinatura, cleartext restrito, Photo Picker, sem AD_ID).
