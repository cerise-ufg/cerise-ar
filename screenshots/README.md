# CERISE AR — Capturas de tela (Android)

Capturas do app rodando no emulador **Medium_Phone_API_36.0** (1080×2400),
build de debug, com o logo oficial do CERISE e a tipografia Work Sans.

| Arquivo | Tela |
|---|---|
| `01_home.png` | Tela inicial — logo oficial CERISE, categorias, carrossel de modelos, card de detalhe e CTA |
| `02_categoria_pokemon.png` | Filtro de categoria **Pokémon** (mostra o Pikachu) |
| `03_categoria_natureza.png` | Filtro de categoria **Natureza** (Arara animada + Rosas), com cores de destaque por categoria |
| `04_modelo_pikachu.png` | Modelo **Pikachu** selecionado — anel amarelo, card de detalhe atualizado |
| `05_menu.png` | Menu superior (Créditos / Exportar) |
| `06_creditos.png` | Diálogo de **Créditos** — autores e licenças dos 8 modelos |
| `07_exportar.png` | Diálogo **Exportar** — Salvar arquivo / Compartilhar o `.glb` |
| `08_app_icon.png` | Ícone do app (emblema oficial CERISE) |

## Sobre a tela de AR
A tela de **Realidade Aumentada** (câmera + modelo 3D) **não pode ser capturada
no emulador**: ela usa um `SurfaceView`/OpenGL, que o `screencap` do Android grava
como preto, e o AVD não tem câmera real nem ARCore. Essa tela precisa ser testada/
capturada em um **aparelho físico compatível com ARCore** — lá aparecem a câmera ao
vivo, o modelo posicionado, o botão de foto (obturador) e os controles.
