# CERISE AR — iOS

Porte iOS do app **CERISE AR** (visualizador de modelos 3D em Realidade Aumentada),
equivalente à versão Android. Mesma marca (CERISE/UFG), mesmas cores, mesma fonte
(Work Sans) e **os mesmos modelos `.glb`**.

## Stack
- **SwiftUI** — tela inicial (catálogo, categorias, exportação, créditos)
- **ARKit + SceneKit (`ARSCNView`)** — experiência em AR
- **[GLTFKit2](https://github.com/warrenm/GLTFKit2)** — carrega os arquivos `.glb` no SceneKit (via Swift Package Manager)

Funcionalidades (paridade com Android): detecção de planos + coaching, toque para
posicionar, animação dos modelos, pop-in ao posicionar, pinça/rotação/arraste,
**foto da cena** salva na galeria, limpar cena, exportar/compartilhar o `.glb`.

## Pré-requisitos
- macOS com **Xcode 15+**
- **[XcodeGen](https://github.com/yonaskolb/XcodeGen)** — `brew install xcodegen`
- Um **iPhone/iPad com ARKit** (A12+); ARKit **não** roda no Simulador.

## Como abrir e rodar
```bash
cd ios
xcodegen generate          # gera CeriseAR.xcodeproj a partir de project.yml
open CeriseAR.xcodeproj
```
No Xcode:
1. Selecione o target **CeriseAR** → aba **Signing & Capabilities** → escolha seu *Team*
   (o bundle id padrão é `br.ufg.cerise.arviewer`; ajuste se necessário).
2. O Xcode resolve o pacote **GLTFKit2** automaticamente (File ▸ Packages ▸ Resolve
   se precisar).
3. Conecte um device real e **Run** (⌘R).

> Observação: o projeto `.xcodeproj` é **gerado** pelo XcodeGen e está no `.gitignore`.
> Versionamos apenas `project.yml` + código + recursos. Se preferir versionar o
> `.xcodeproj`, remova a linha correspondente do `.gitignore`.

## Estrutura
```
ios/
├── project.yml                 # definição do projeto (XcodeGen) + dependência GLTFKit2
├── CeriseAR/
│   ├── App/CeriseARApp.swift
│   ├── Models/ModelCatalog.swift
│   ├── Views/                  # HomeView, ModelCard, Credits, ARContainer
│   ├── AR/ARViewController.swift
│   ├── Support/                # Theme (cores/fonte), ModelExporter
│   ├── Resources/Models/*.glb  # os 8 modelos (iguais ao Android)
│   ├── Resources/Fonts/WorkSans-Variable.ttf
│   ├── Assets.xcassets         # AccentColor (cerise) + AppIcon (placeholder)
│   └── Info.plist              # ARKit required, usos de câmera/galeria, fonte
```

## Pendências de lançamento
- **App icon**: `Assets.xcassets/AppIcon` está vazio (placeholder) — adicione a arte 1024×1024.
- **Pikachu**: modelo de fã (marca Nintendo) — reveja antes de publicar.
- Conferir as **atribuições CC-BY** (tela de Créditos) conforme a política da loja.
