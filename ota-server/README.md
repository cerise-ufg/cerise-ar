# CERISE AR — servidor de OTA self-hosted (Expo Updates)

Serve o **protocolo expo-updates v1** (manifest + assets) do próprio servidor
(wenfur), sem EAS e sem conta Expo. O app (`cerise-expo`) aponta
`updates.url = https://cerise.wenfur.com.br/updates/manifest`.

## Componentes
- `server.js` — Express: `GET /manifest` (monta o manifesto a partir do
  `metadata.json` do `expo export`, com hashes SHA-256 base64url) e
  `GET /assets` (serve bundle + assets). `204` quando não há update novo.
- `Dockerfile` — container Node.
- `publish-update.mjs` — `expo export` + upload do bundle pro servidor.

## Layout no servidor
```
/opt/cerise-ota/updates/<runtimeVersion>/<updateId>/
    metadata.json  update.json  _expo/...  assets/...
```
O `runtimeVersion` é a `version` do app (política `appVersion`). O servidor
serve o update mais novo (por `createdAt`) daquele runtime + plataforma.

## Deploy (wenfur, 2.24.79.5)
Container `cerise-ota-server` na rede `wenfur_wenfur`, atrás do Caddy:
```
cerise.wenfur.com.br {
    handle_path /updates/* { reverse_proxy cerise-ota-server:3000 }
    handle_path /ota/*     { reverse_proxy cerise-ota:80 }   # APK nativo
}
```

## Publicar um update (JS/telas/fluxo/textos)
```
node ota-server/publish-update.mjs "o que mudou"
```
Só chega em installs com o MESMO runtime (mesma `version`). Mudou nativo /
`app.json` / dependência nativa? Precisa de **build novo**, não OTA.

## Limites (honestos)
- **iOS**: a Apple permite (3.3.2) — mas exige um build que embuta `updates.url`.
- Parte **nativa do Viro/AR** não vai por OTA (só JS + assets empacotados).
- Sem code signing por enquanto (só HTTPS). Dá pra adicionar
  `updates.codeSigningCertificate` depois pra assinar os manifestos.
