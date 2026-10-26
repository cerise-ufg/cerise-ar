# Respostas para os formulários do Play Console — CERISE AR 1.1.0

Referência: comportamento real do código desta versão (`cerise-expo/`, branch `feat/2026-gen3d-playstore`).
Revise se o app mudar (principalmente rede, permissões e SDKs).

---

## 1. Segurança dos dados (Data safety)

**Coleta e compartilhamento**

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha algum dos tipos de dados do usuário exigidos? | **Sim** (fotos enviadas para gerar 3D; apelido opcional no ranking do jogo) |
| Todos os dados do usuário coletados pelo app são criptografados em trânsito? | **Sim** — produção usa apenas HTTPS (`https://cerise.wenfur.com.br/...`). O cleartext só é liberado para `10.0.2.2`/`localhost`/`127.0.0.1` (testes locais; `res/xml/network_security_config.xml`). |
| Vocês oferecem uma forma de os usuários pedirem a exclusão dos dados? | **Sim** — por e-mail de contato (política de privacidade) e exclusão automática em até 7 dias. Modelos locais: botão *Excluir* no app. |
| O app usa SDKs de anúncios/analytics/crash de terceiros? | **Não** |

**Tipos de dados declarados**

| Categoria → tipo | Coletado | Compartilhado | Opcional? | Processamento efêmero? | Finalidade |
|---|---|---|---|---|---|
| Fotos e vídeos → **Fotos** | Sim | Não | **Sim** (só quando o usuário toca em *Gerar modelo 3D*) | Não (fica até 7 dias no servidor) | **Funcionalidade do app** |
| Informações pessoais → **Nome** (apelido no ranking do jogo Caça CERISE) | Sim | Não | **Sim** (pode ficar em branco = "Anônimo") | Não | **Funcionalidade do app** |
| Atividade no app / Info e desempenho do app / Identificadores do dispositivo / Localização / Contatos / Financeiro / Saúde / Mensagens / Áudio / Arquivos | **Não** | — | — | — | — |

Observações:
- *Compartilhado = Não*: o processamento é feito em servidores do próprio projeto (CERISE/UFG e servidor contratado pelo projeto); o Google considera "transferência a prestador de serviço que processa em nome do desenvolvedor" como **não** compartilhamento.
- Endereço IP em logs técnicos do servidor não precisa ser declarado como dado coletado quando usado apenas para entregar o serviço/segurança, mas está descrito na política.
- As imagens da câmera em RA (ARCore) são processadas só no aparelho → **não** declarar.
- Permissão `AD_ID` está **bloqueada** no manifesto (`tools:node="remove"`): responder **"Não"** à pergunta de ID de publicidade.

## 2. Classificação do conteúdo (questionário IARC)

- E-mail para o certificado IARC: e-mail do desenvolvedor (Eduardo).
- Categoria do app: **Todos os outros tipos de apps** (não é jogo puro, nem rede social/comunicação). *Se o Console insistir em "Jogo" por causa da Caça CERISE, responder como jogo casual com as mesmas respostas abaixo.*

| Pergunta (resumo) | Resposta |
|---|---|
| Violência / sangue / armas | Não |
| Medo / terror | Não |
| Conteúdo sexual / nudez | Não |
| Linguagem imprópria | Não |
| Drogas, álcool, tabaco | Não |
| Apostas / jogos de azar / simulação de cassino | Não |
| Usuários interagem ou trocam conteúdo entre si (chat, UGC visível a outros)? | **Não** — o modelo 3D gerado fica só no aparelho de quem o criou. O ranking do jogo mostra apelidos e tempos (sem chat, sem mensagens). Se o formulário perguntar especificamente sobre "nomes de usuário visíveis a outros", responder **Sim, apenas apelido em ranking**. |
| Compartilha a localização do usuário com outros? | Não |
| Permite compras digitais? | Não |
| Conteúdo gerado pelo usuário é publicado? | Não |

Resultado esperado: **Livre (L) / PEGI 3 / ESRB Everyone** (ClassInd "Livre").

## 3. Público-alvo e conteúdo

- Faixas etárias: **13–15, 16–17 e 18+** (não marcar menores de 13 → o app não entra no programa *Famílias* e não precisa de SDKs certificados para crianças).
- O app pode atrair crianças sem querer? **Não** (app acadêmico/tecnológico; personagens do jogo são genéricos, sem apelo infantil dirigido).
- Anúncios: **Não contém anúncios**.

## 4. Acesso ao app (App access)

- **Todas as funcionalidades estão disponíveis sem restrições de acesso** (sem login).
- Instruções para os revisores (campo de texto livre):

```
O app não exige login. Para testar a criação de modelos 3D: toque em "Criar modelo 3D", tire uma foto de um objeto (ou escolha da galeria), escolha a qualidade e toque em "Gerar modelo 3D". O processamento é feito no servidor do CERISE (https://cerise.wenfur.com.br/gen3d) e pode levar de 1 a 5 minutos; o progresso aparece na tela. O resultado fica em "Meus modelos" e pode ser visto em 3D ou em realidade aumentada (RA exige aparelho compatível com ARCore). O catálogo de modelos e o jogo Caça CERISE funcionam sem servidor.
```

> **Atenção:** o servidor de geração 3D precisa estar **publicado e respondendo** em `https://cerise.wenfur.com.br/gen3d` antes de enviar para revisão de **produção**; caso contrário o revisor verá "Servidor 3D não respondeu" e pode reprovar por funcionalidade quebrada.

## 5. Outras declarações

| Declaração | Resposta |
|---|---|
| Anúncios | Não contém anúncios |
| App de governo | Não (projeto acadêmico de universidade pública; não representa órgão de governo) |
| Recursos financeiros | Nenhum |
| Saúde | Não é app de saúde |
| Notícias | Não |
| VPN / Serviço em primeiro plano / Acessibilidade | Não usa |
| Permissões de fotos e vídeos (política 2025) | Não solicita `READ_MEDIA_IMAGES/VIDEO`: usa o **seletor de fotos do sistema** (Photo Picker) |
| Permissão de localização | Bloqueada no manifesto (`ACCESS_FINE/COARSE_LOCATION` removidas) |
| `REQUEST_INSTALL_PACKAGES` | Não usa (o autoatualizador de APK do app nativo antigo não existe nesta versão; atualizações de JS vêm por expo-updates, permitido pela política) |
| Exclusão de conta | Não se aplica (o app não cria contas) |
| Política de privacidade | https://cerise.wenfur.com.br/privacidade.html |
