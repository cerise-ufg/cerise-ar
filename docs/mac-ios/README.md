# Builds iOS no Mac mini (material auxiliar)

Arquivos trazidos da pasta `~/CeriseAR` do Mac mini M4 (macOS 26.3.1, Xcode 26.6) usado para os builds iOS.
Os scripts principais de build e captura do Simulador estão versionados em `cerise-expo/tools/ios/`
(`build-ios-sim.sh`, `rebuild-ios-sim.sh`, `capture-ios.sh`); aqui ficam os complementos.

| Pasta / arquivo | Conteúdo |
|---|---|
| `scripts/thumbs-ios.sh` | renderiza os GLBs de exemplo do *mock* no visualizador 3D do app (Simulador) para gerar miniaturas |
| `miniaturas-ios/` | saída do `thumbs-ios.sh` (pato, capacete, astronauta, rosas) |
| `amostras/` | `rhino.jpg` e `turtle.jpg`: renderizações de dois objetos do Google Scanned Objects (Schleich African Black Rhino e Vtech Roll & Learn Turtle; CC-BY 4.0), usadas como fotos de entrada nos testes do Simulador |
| `logs/build-sim.log` | build do app nativo iOS (SwiftUI/ARKit) para o Simulador, sem assinatura, em 16/09/2026 (*BUILD SUCCEEDED*) |
| `logs/build-dev.log`, `logs/install.log` | tentativas de build Debug assinado e instalação no iPhone por SSH em 16/09/2026 (`ios/scripts/install-iphone.sh`); falharam na assinatura porque o *keychain* não é acessível numa sessão SSH (ver `ios/INSTALL-IPHONE-MAC.md`) |
| `logs/build-ios-sim.log`, `logs/rebuild-ios-sim.log`, `logs/capture-ios.log` | build Release do app Expo 1.1.0 para o Simulador e captura das telas em 26/10/2026 |

As capturas do Simulador (`shots-ios/`) e o log do *mock* estão em `docs/relatorio-2026/evidencias/ios/`.
Os IPAs e `.xcarchive` exportados em setembro estão nos *Releases* (ver `RELEASES.md`).
Não foram trazidos: `node_modules/`, `cerise-expo/ios/` (gerado pelo `expo prebuild`, com `Pods/`), o
DerivedData do Simulador (`build-sim-dd/`), as pastas `.build/` do SwiftPM e o binário do XcodeGen.
