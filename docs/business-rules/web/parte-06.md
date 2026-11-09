---
id: rn-web-parte-06
title: 'Regras de negócio — Web — parte 6 (desde RN-728)'
sidebar_label: 'Web — parte 6 (desde RN-728)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 6 (desde RN-728)

## A Anamnese não paga duas vezes pela mesma janela, e o resgate de gate não reinicia ciclo que espera alguém (RN-722)

<a id="rn-728"></a>

### RN-728 — A mensagem do usuário tem uma bolha só, e o card do Dev Lead tem um primário só {#rn-728}

- **Regra:** (1) a bolha OTIMISTA da mensagem enviada a um agente sai do fio
  assim que o `chat.message` com o `mensagemId` que a api devolveu no aceite
  está no log — casamento por id, nunca por texto, e sem esperar o fim do
  turno; o nome dela sai do MESMO `autorDaMensagem` da bolha do log
  ([RN-652](parte-05.md#rn-652)), com o e-mail do token só como fallback. Antes as duas
  conviviam durante o turno, uma com o nome e outra com o e-mail. (2) No card
  "passou o bastão ao Dev Lead", aceitar o handoff é o gesto primário e
  "Ativar execução" é SECUNDÁRIO, com o aviso do que pula: sem plano, os devs
  pegam as tarefas como estão ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)).
- **Onde:** `apps/web/src/lib/mensagem-otimista.ts:14` (`otimistaJaNoLog`),
  `apps/web/src/lib/mensagem-otimista.ts:22` (`nomeDaMensagemOtimista`),
  `apps/web/src/routes/SessionPage.tsx:791` (`otimistaJaNoLog`),
  `apps/web/src/routes/session-timeline-montagem.tsx:644`
  (`handleActivateExecution`)
- **Teste:** `apps/web/src/lib/mensagem-otimista.test.ts` (feliz: o id no log
  tira a otimista; falha: id ausente ou de outro tipo a mantém; o nome é o da
  linha de membro), `apps/web/src/routes/SessionPage.cancelar-turno.test.tsx`
  ("com o turno em curso, a otimista sai quando o chat.message do aceite chega
  ao log"),
  `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`
  ("o aceite é o primário; "Ativar execução" é secundário e diz o que pula")
- **Origem:** AT-409 e AT-410 (TP-01 de 03/10); a forma do card é decisão do
  dono ("Secundário com aviso")

<a id="rn-736"></a>

### RN-736 — O campo "Nome do projeto" não ganha foco sozinho nem se chama "name" {#rn-736}

- **Regra:** no passo de detalhes do assistente de projeto, o campo "Nome do
  projeto" NÃO recebe `autoFocus` e usa `id`/`name` `project-title` (desde a RN-834, `projeto-slug`), nunca
  "name" puro; os atributos que desligam gerenciadores de senha
  (`data-1p-ignore`, `data-lpignore`, `data-bwignore`, `data-form-type="other"`)
  continuam vindo da fonte única `SEM_AUTOFILL` (RN-729). Decisão: sem foco
  automático em caso nenhum (nem por teclado) — o menu "Contact Info" dessas
  extensões abre no FOCO, ignora `autocomplete="off"` e cobria a página; um
  clique ou Tab a mais é o preço. Os nomes dos atributos são os documentados
  publicamente por 1Password, LastPass, Bitwarden e Dashlane, não medidos
  contra cada extensão aqui.
- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx:746` (`projeto-slug`),
  `apps/web/src/lib/conversa-comecou.ts:29` (`SEM_AUTOFILL`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx` ("RN-736: o campo
  de nome não ganha foco sozinho nem se chama \"name\"" e o de RN-729, que
  confere os quatro atributos)
- **Origem:** AT-418 (TP-01, 2ª rodada de 03/10)

<a id="rn-740"></a>

### RN-740 — O campo "Nome do projeto" declara que não sugere nada, e o resto da lacuna é da extensão {#rn-740}

- **Regra:** `SEM_AUTOFILL` acrescenta `aria-autocomplete="none"` (a árvore
  acessível diz que o campo não oferece sugestão) e `data-protonpass-ignore`
  (o atributo que o Proton Pass documenta). O rótulo visível e o nome
  acessível continuam "Nome do projeto": trocar só o `aria-label` quebraria o
  "rótulo no nome" (WCAG 2.5.3), e trocar o rótulo visível é decisão de
  produto, não tomada. Medido no TP-01 de 03/10: o menu "Contact Info" abre ao
  focar/digitar mesmo com os atributos da RN-736 — a extensão provavelmente
  classifica pelo TEXTO do rótulo. Se o próximo TP-01 reproduzir com estes
  atributos, a lacuna é da EXTENSÃO e fica declarada aqui.
- **Onde:** `apps/web/src/lib/conversa-comecou.ts:29` (`SEM_AUTOFILL`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx` ("RN-740: …")
- **Origem:** AT-425 (TP-01, 3ª rodada de 03/10)

<a id="rn-747"></a>

### RN-747 — O plano do Dev Lead diz quantos dev agents sobem, não quantos pede {#rn-747}

- **Regra:** aprovar `propose_execution_plan` ativa a execução (RN-677), e a
  ativação sobe UM dev agent por módulo; o `agentes` por módulo do plano é
  recomendação. O cartão de aprovação diz "sobe N dev agent(s), um por
  módulo" e, quando o plano pede mais que isso, que os agentes a mais só sobem
  se o usuário aceitar paralelizar depois — paralelizar é teto da RN-154 e
  nunca é auto-aprovado nem embutido na aprovação do plano. O resultado da
  ferramenta que volta ao Dev Lead diz o mesmo, e a descrição de `agentes`
  pede para não prometer ganho de paralelismo. A aspa do modelo nas pontas do
  resumo é removida antes de a frase citá-lo, para não sobrar `coberto."`.
- **Onde:** `apps/web/src/lib/aprovacoes.ts:360` (`propose_execution_plan`),
  `apps/engine/lib/engine/agents/dev_lead_tools.ex:276` (`sobem`), `:249`
  (`classificar`), `:97` (`spec`)
- **Teste:** `apps/web/src/lib/aprovacoes.test.ts` ("plano com 2 agentes num
  módulo único diz que sobe 1…"; "plano sem agente a mais não fala de
  paralelizar"), `apps/engine/test/engine/agents/dev_lead_tools_test.exs`
  ("agente a mais no plano é dito como NÃO subindo")
- **Origem:** AT-437 (08/10: o plano aprovado prometia "2 agentes no módulo
  único… ~40% de ganho" e a execução subiu 1 dev)

<a id="rn-748"></a>

### RN-748 — A espera por aprovação fecha a faixa do turno e leva o cartão à vista {#rn-748}

- **Regra:** quando o agente suspende o turno esperando aprovação humana
  (`agent.status: awaiting_approval`, hoje o Dev Lead no
  `propose_execution_plan`, RN-284), a tela de Sessão trata isso como FIM de
  turno também pelo CANAL — não só pela leitura do log (`turnoTerminouNoLog`,
  que já o fazia): a faixa de atividade sai, e com ela "Pôr na fila" e
  "Parar". E, quando uma espera NOVA aparece no log (o `seq` da espera mais
  recente muda depois da abertura), o fio rola até o fim SEM a guarda dos
  120px da RN-173, porque o cartão de aprovação é o que a pessoa precisa ver.
  Reabrir a sessão com uma espera antiga não rola nada além da abertura de
  sempre.
- **Onde:** `apps/web/src/lib/session-channel.ts:239` (`awaiting_approval`),
  `apps/web/src/lib/session-turno.ts:422` (`awaiting_approval`),
  `seqDaEsperaPorAprovacao` (removido na RN-951, `apps/web/src/lib/session-rolagem.ts`),
  `esperaPorAprovacao` (removido)
- **Teste:** `apps/web/src/lib/session-channel.test.ts` (`onAgentStatus repassa
  awaiting_approval (RN-748)`), `apps/web/src/lib/session-rolagem.test.ts`
  (`seqDaEsperaPorAprovacao (RN-748)`: espera mais recente; sem espera, `null`)
- **Origem:** AT-432 (TP-01: o Dev Lead em `awaiting_approval` com a faixa
  "Montando o plano de execução" ativa e o cartão fora da vista)

<a id="rn-749"></a>

### RN-749 — A resposta cortada pelo teto oferece a continuação num clique {#rn-749}

- **Regra:** a bolha do agente cujo fecho termina na linha que o engine
  acrescenta à resposta cortada pelo teto de saída (RN-737, nos dois idiomas)
  mostra, com a sessão ativa, o botão "Continuar de onde parou". O clique manda
  ao MESMO agente o texto "Continue de onde parou." (no idioma da interface)
  pelo mesmo envio do composer — com turno em curso, entra na fila dele
  (RN-673) —, e o rascunho que a pessoa está escrevendo não é tocado. Só o
  fecho tem o botão; os passos do turno não. A tela reconhece a linha pelo
  texto, e as duas frases são o contrato com `Engine.Harness.RespostaCortada`.
- **Onde:** `apps/web/src/lib/resposta-cortada.ts:14` (`respostaCortada`),
  `apps/web/src/routes/session-timeline-montagem.tsx:954` (`respostaCortada`),
  `apps/web/src/routes/SessionPage.tsx:439` (`continuarRespostaCortada`),
  `:685` (`enviarMensagem`)
- **Teste:** `apps/web/src/lib/resposta-cortada.test.ts` (`respostaCortada
  (RN-749)`: as duas linhas reconhecidas; resposta inteira e a frase no meio do
  texto não)
- **Origem:** AT-434 (TP-01: a resposta cortada não oferecia ação, e o usuário
  teve de adivinhar "continue")

<a id="rn-750"></a>

### RN-750 — O colapso por agente deixa o fecho de cada agente aberto {#rn-750}

- **Regra:** o colapso de mensagens por agente depois que ele passa o bastão
  (RN-138) nunca recolhe a ÚLTIMA mensagem daquele agente no fio — o fecho,
  que no handoff é o resumo que a pessoa acabou de ler. Recolhe-se o que veio
  antes dele na mesma sequência, e só com duas ou mais entradas (uma sozinha
  não vira cabeçalho, a régua de sempre da RN-138). Sequências anteriores do
  mesmo agente, separadas por outra fala, colapsam como antes. O corte do fio
  (RN-644) não muda: ele roda sobre a lista já agrupada.
- **Onde:** `apps/web/src/routes/session-fio.tsx:155` (`fechoDeCadaAgente`),
  `:181` (`fechoPorAgente`), `:190` (`indiceDoFecho`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`
  (`duas mensagens consecutivas do PO colapsam...`: duas recolhidas e o fecho
  aberto; `RN-750: com duas mensagens, o fecho fica aberto e a outra, sozinha,
  não vira grupo`)
- **Origem:** AT-435 (TP-01: no handoff o fio recolhia a resposta inteira do
  Criativo, "Criativo · 2 mensagens", escondendo o resumo)

<a id="rn-751"></a>

### RN-751 — A Sessão e o catálogo não saltam: composer, aba ativa, barra de lote e rolagem {#rn-751}

- **Regra:** quatro correções de layout, cada uma uma regra de tela.
  (1) O composer não espreme o campo durante o turno: os botões não encolhem
  nem quebram texto, e descem de linha quando não cabem. (2) Sem a moldura do
  projeto montada, a aba que a sidebar marca é a que a ROTA implica — na tela
  de Sessão, o Chat —, e só fora disso a padrão. (3) A barra de ação em lote
  do catálogo de modelos SOBREPÕE a lista, presa ao pé da janela, e a seção
  ganha um respiro no fim enquanto ela está aberta; inserida no fluxo, ela
  empurrava a lista e o checkbox fugia do cursor. (4) O fio "acompanha o fim"
  (RN-173) também quando a pessoa ESTAVA no fim antes de a altura mudar — a
  intenção é medida no gesto de rolar, e a rolagem grampeada com conteúdo
  menor que a janela não a muda. A guarda dos 120px continua: quem rolou para
  cima não é arrastado. A causa do topo no aceite do handoff da Infra não foi
  reproduzida no navegador; a correção cobre a classe (conteúdo que encolhe e
  volta).
- **Onde:** `apps/web/src/routes/project-tabs.ts:383` (`abaDaRota`),
  `apps/web/src/routes/Shell.tsx:509` (`abaDaRota`),
  `estaPertoDoFim` (removido na RN-951, `apps/web/src/lib/session-rolagem.ts`),
  `estavaNoFimRef`, `aoRolarOFio` (removidos),
  `apps/web/src/components/ModelCatalogSection.module.css` (`.barraDeLote`),
  `apps/web/src/routes/SessionPage.module.css` (`.composer`)
- **Teste:** `apps/web/src/lib/session-rolagem-fim.test.ts` (`estaPertoDoFim`
  e `abaDaRota`: caminho feliz e falha), `apps/web/src/routes/Shell.test.tsx`
  (`sem a moldura montada (ex.: tela de Sessão)`: Chat marcado),
  `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx` (`não arrasta
  quem rolou pra cima`)
- **Origem:** AT-442 (TP-01, levantamento visual)

<a id="rn-755"></a>

### RN-755 — Ligar o modo automático não aprova o cartão onde foi ligado {#rn-755}

- **Regra:** no `ApprovalCard` (o mesmo nas quatro superfícies), o botão
  "Modo automático" grava a curinga do agente (RN-153) e NÃO decide a ação
  do próprio cartão: ela segue pendente, com "Aprovar" como ação principal.
  Onde o botão sai, sai junto uma nota dizendo isso antes do clique ("Ligar o
  modo automático não aprova esta ação: ela continua esperando o seu
  Aprovar."). Aprovar o cartão junto com a ligação do modo seria decisão do
  dono e NÃO foi feito.
  **Exceção (AT-753, decisão P3 do dono de 06/11):** o cartão de
  `propose_execution_plan` não tem mais a oferta separada, o botão nem esta nota. O
  piloto automático é um checkbox já marcado dentro do próprio cartão, e aprovar com
  ele marcado é o que o liga ([RN-804](#rn-804)). Todo outro tipo de ação
  mantém a regra acima.
- **Onde:** `apps/web/src/components/ApprovalCard.tsx:219` (`ApprovalCard`)
- **Teste:** `apps/web/src/components/ApprovalCard.test.tsx` (`ligar o
  "Modo automático" não aprova o card, e o card diz isso`; sem o botão, a nota
  não sai)
- **Origem:** AT-443 (TP-01: o modo ligado num cartão pendente não o
  aprovava, e nada na tela dizia por quê)

<a id="rn-766"></a>

### RN-766 — O gate parado esperando clique é dito, e a oferta em lote cobre os subagentes de QA {#rn-766}

- **Regra:** no painel "precisa de você" ([RN-467](parte-03.md#rn-467)), a ação pendente
  proposta por agente de GATE (área de QA — `qa`, `qa-*` — ou SecOps) ganha,
  acima do MESMO `ApprovalCard`, a frase de que aquele gate está PARADO até a
  decisão; é uma frase por card, nunca uma soma de filas. E a oferta em lote
  do modo automático na aba Executores ([RN-661](parte-05.md#rn-661)) lista os agentes da
  área de QA (`AREAS.qa`) desde a ativação, sem esperar que eles apareçam no
  roster — antes o `qa-automacao` só entrava na oferta depois do primeiro
  evento dele, quando a primeira ação já esperava clique. O `allow` padrão do
  `permissions.json` NÃO muda (decisão do dono).
- **Onde:** `apps/web/src/lib/precisa-de-voce.ts:256` (`gateEsperandoClique`)
  e `apps/web/src/components/ModoAutomaticoDoTime.helpers.ts:24`
  (`agentesDaOfertaEmLote`)
- **Teste:** `apps/web/src/lib/precisa-de-voce.test.ts` (gate de QA e SecOps
  nomeados; dev agent e humano não) e
  `apps/web/src/components/ModoAutomaticoDoTime.test.tsx` (a oferta cobre os
  subagentes de QA antes do roster, sem repetir)
- **Origem:** AT-449 (TP-01 de 09/10: o `qa-automacao` propôs
  `ls; cat; for f in test/*.js…`, um segmento fora do `allow`, sem modo
  automático, e ficou 25 min pendente com só o contador de Aprovações como
  sinal)

<a id="rn-768"></a>

### RN-768 — Na aba PRs, o texto ao lado do Merge diz a verdade do botão {#rn-768}

- **Regra:** gate pendente continua AVISO e não trava o merge
  ([RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)). Tarefa BLOQUEADA (`task.blocked`) é outra coisa e
  desabilita o botão; nesse caso a linha da PR NÃO mostra "o merge segue
  disponível": diz, em texto, que o merge está indisponível porque a tarefa
  está bloqueada (nomeando o gate pendente, se houver, ou o motivo do
  bloqueio). Sem sessão no projeto, o mesmo: o motivo vai em texto, nunca só
  no `title` do botão `disabled`, que não abre no Chromium. Se tarefa
  bloqueada deve ou não travar o merge é pergunta do dono, não decidida aqui.
- **Onde:** `apps/web/src/routes/ProjectPrsTab.tsx:293` (`avisoDaLinha`)
- **Teste:** `apps/web/src/routes/ProjectPrsTab.test.tsx` ("AT-451: tarefa
  bloqueada com gate pendente NÃO diz que o merge segue disponível")
- **Origem:** AT-451 (TP-01 de 09/10: "O merge segue disponível — a decisão é
  sua" ao lado de um "Merge" desabilitado)

<a id="rn-769"></a>

### RN-769 — Encerrar sessão com execução ativa pergunta antes, e o estado aparece traduzido {#rn-769}

- **Regra:** "Encerrar" numa sessão com execução ativa (evento
  `execution.activated` na janela, ou um `dev-<modulo>` entre os ativados da
  sessão inteira — o Dev Lead não conta, ele planeja antes da execução) abre
  uma confirmação que diz o que para: os agentes da sessão param na hora, o
  comando em andamento é cortado, o turno em curso não é gravado, e sessão com
  execução não reabre ([RN-650](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-650)). Sem execução, o clique encerra
  direto, como antes. A frase de sessão encerrada no composer interpola o
  estado TRADUZIDO (`pontoDaSessao(...).rotuloKey`), nunca o enum cru
  (`closed`). E isso é guardado no CÓDIGO, não só no locale: a régua de
  vocabulário lê os JSON, e o enum entrava pela interpolação em runtime;
  `i18n-enum-cru.test.ts` reprova `t(…, { status: x.status })`.
- **Onde:** `apps/web/src/routes/ConfirmarEncerramento.tsx:13`
  (`useEncerrarComConfirmacao`) e `apps/web/src/routes/SessionComposer.tsx:602`
  (`statusGenerico`)
- **Teste:** `apps/web/src/routes/ConfirmarEncerramento.test.tsx` (sem
  execução encerra direto; com execução só encerra ao confirmar; cancelar não
  encerra) e `apps/web/src/lib/i18n-enum-cru.test.ts` (reprovava o
  `SessionComposer.tsx` antes da correção)
- **Origem:** AT-452 (TP-01 de 09/10: "Encerrar" fechou a sessão de execução
  em 3 s com o dev agent no meio de um `npm install`, e a barra disse "Sessão
  closed")

<a id="rn-788"></a>

### RN-788 — Decisões e linha do tempo do time não afirmam sobre o que não leram {#rn-788}

- **Regra:** no painel "Contexto da sessão", "Decisões registradas" segue o
  mesmo recorte declarado das regras ([RN-701](parte-05.md#rn-701)): com eventos antes da
  janela, o contador diz "N na janela · há mais antes" e o vazio diz que pode
  haver decisões nos anteriores, nunca "Nenhuma decisão registrada nesta
  sessão". Na Visão geral, a "Linha do tempo do time" lê a sessão de EXECUÇÃO
  quando ela existe (a mesma da sidebar) e diz isso no subtítulo quando ela
  não é a mais recente. Nenhuma requisição a mais: as chaves são as que a
  sidebar já assina, e `useActiveExecutionSession` ganha `staleTime` igual ao
  intervalo, para o segundo assinante não refazer a busca ([RN-632](parte-05.md#rn-632)).
- **Onde:** `apps/web/src/routes/ContextAside.tsx:402` (`trailing`),
  `apps/web/src/routes/ProjectOverviewTab.tsx:101` (`linhaDoTempoNaExecucao`)
- **Teste:** `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  (decisão fora da janela não vira 0; sessão inteira na janela diz vazio),
  `apps/web/src/routes/ProjectOverviewTab.test.tsx` (lê a sessão de execução e
  diz; sem execução, lê a mais recente), `apps/web/src/routes/duas-abas.orcamento.test.tsx`
  (a carga da Visão geral segue no teto)
- **Origem:** AT-463 (TP-01 de 09/10)

<a id="rn-789"></a>

### RN-789 — Na tela de Sessão, a sidebar marca a aba onde a sessão está listada {#rn-789}

- **Regra:** a tela de Sessão publica a aba que o TIPO da sessão implica —
  criativa em "Criativo" (a lista de ideações), consultiva em "Chat" —, e a
  sidebar a marca em vez de sempre "Chat" ([RN-751](#rn-751)); o clique leva à
  lista onde a sessão aparece, que é o caminho de volta a ela. Sessão ainda
  carregando, ou aba publicada de outro projeto, cai em "Chat". Sem leitura
  nova: o tipo já veio com a sessão.
- **Onde:** `apps/web/src/routes/project-tabs.ts:383` (`abaDaRota`),
  `apps/web/src/lib/session-kind.ts:94` (`usePublicarAbaDaSessao`)
- **Teste:** `apps/web/src/lib/session-rolagem-fim.test.ts` (criativa marca
  "Criativo"; aba de outro projeto ou inválida não vale)
- **Origem:** AT-463 (TP-01 de 09/10)

<a id="rn-794"></a>

### RN-794 — Sem execução vigente, a tela diz o que ficou pendente e religa pelo mesmo caminho {#rn-794}

- **Regra:** quando a leitura da sessão de execução vigente ([RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139))
  CONFIRMA que não há nenhuma e o backlog tem tarefa que não está `done`
  (`todo` — inclusive a devolvida pelo gate —, `in_progress`, `in_review`,
  bloqueada), a aba Executores e a seção Execução da Visão geral dizem
  quantas são e oferecem "Religar execução", que chama o MESMO
  `POST .../execution/activate` (`ActivateExecutionUseCase`) do botão
  "Ativar execução", sem `originSessionId` (como a Visão geral sempre
  chamou: não há sessão de chat para a api fechar, [RN-135](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-135)). A
  recusa (409 sem repositório, sessão consultiva, papel) aparece com a frase
  da api. "Desbloquear" sem execução vigente avisa que a tarefa só roda
  quando a execução for religada — o botão está na mesma seção. Na aba
  Executores o backlog só é lido com a ausência confirmada (query desligada
  com execução de pé, ritmo de projeto quando ligada, [RN-632](parte-05.md#rn-632)).
- **Onde:** `apps/web/src/components/ReligarExecucao.tsx:23` (`ReligarExecucao`),
  `apps/web/src/lib/execution.ts:21` (`contarTarefasPendentes`),
  `apps/web/src/routes/ProjectExecutorsTab.tsx:103` (`semExecucaoVigente`),
  `apps/web/src/routes/ProjectOverviewTab.tsx:518` (`semExecucaoVigente`)
- **Teste:** `apps/web/src/routes/ProjectExecutorsTab.test.tsx` (religar a
  execução), `apps/web/src/routes/ProjectOverviewTab.test.tsx` (religar a
  execução encerrada)
- **Origem:** AT-469

<a id="rn-800"></a>

### RN-800 — A linha do tempo do time filtra por família, não pela roster da sessão mais recente {#rn-800}

- **Regra:** a árvore "Linha do tempo do time" da Visão geral lê a sessão de
  EXECUÇÃO quando há uma vigente (AT-463), e tira dela os eventos de dev agent
  e de QA pela FAMÍLIA do ator (`isExecutorAgentId`, a mesma régua da aba
  Executores, RN-121) — nunca pela roster, que é derivada da sessão mais
  recente. Filtrar pela roster apagava todo agente que só agiu na execução (o
  Infra Lead cujo handoff foi aceito lá), e com uma ideação aberta depois a
  árvore dizia "Nenhum agente entrou em ação nesta sessão ainda" sobre um time
  trabalhando. Sem leitura nova.
- **Onde:** `apps/web/src/routes/ProjectOverviewTab.tsx:279` (`overviewEvents`)
- **Teste:** `apps/web/src/routes/ProjectOverviewTab.test.tsx` ("AT-471: agente
  que só agiu na execução aparece na árvore…"; o caso sem execução segue lendo
  a mais recente)
- **Origem:** AT-471 (TP-01 de 10/10)

<a id="rn-801"></a>

### RN-801 — O nome da nova sessão não convida o gerenciador de senhas {#rn-801}

- **Regra:** o campo "Nome (opcional)" do formulário de nova sessão (aba
  Criativo e aba Chat) recebe o MESMO `SEM_AUTOFILL` do composer e do
  assistente ([RN-736](#rn-736)/[RN-740](#rn-740)): `autocomplete="off"`,
  `aria-autocomplete="none"` e os ignores de 1Password, LastPass, Bitwarden e
  Proton Pass. O composer da Sessão já o tinha. A constante NÃO tem atributo de
  ignore do NordPass, e nenhum foi inventado: se o NordPass segue se anexando,
  o resto da lacuna é da extensão, como na RN-740.
- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx:325` (`SEM_AUTOFILL`),
  `apps/web/src/lib/conversa-comecou.ts:29` (`SEM_AUTOFILL`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` ("AT-472: o nome
  da nova ideação não convida o gerenciador de senhas")
- **Origem:** AT-472 (TP-01 de 10/10)

<a id="rn-803"></a>

### RN-803 — A oferta em lote do modo automático fica inerte até saber quem já está ligado {#rn-803}

- **Regra:** enquanto a leitura de `agent_autonomy` do projeto não chegou, o
  "Ligar para N agentes" da aba Executores ([RN-661](parte-05.md#rn-661)) e as caixas dos
  agentes ficam `disabled`, com o motivo em texto ("Lendo quais agentes já
  estão em modo automático…"); o clique nesse intervalo não grava nada. Antes,
  a lista nascia com TODOS os agentes como palpite e encolhia quando a leitura
  chegava, e o primeiro clique depois de navegar caía em outro elemento sem
  gravar nem dizer nada. O desfecho do lote (todos, nenhum com a frase da api,
  alguns) é dito mesmo que a releitura depois das gravações falhe. Declarado:
  o mesmo sintoma no "Merge" da aba PRs, em "Nova ideação" e no "Aplicar a
  todos os agentes" NÃO foi reproduzido nem corrigido aqui.
- **Onde:** `apps/web/src/components/ModoAutomaticoDoTime.tsx:98` (`carregando`)
- **Teste:** `apps/web/src/components/ModoAutomaticoDoTime.test.tsx` ("AT-477
  (RN-803): antes de a leitura de agent_autonomy chegar, o botão fica inerte e
  diz por quê")
- **Origem:** AT-477 (TP-01 de 10/10)

<a id="rn-804"></a>

### RN-804 — O cartão do plano do Dev Lead oferece o modo automático em lote antes de aprovar {#rn-804}

- **Regra:** o `ApprovalCard` de `propose_execution_plan` mostra só o que
  importa (AT-753, UX-4): uma frase curta (dev agents, um por módulo, e a
  contagem de tarefas), a linha de custo previsto (`tetoDoPlano`: a soma dos
  tetos por tarefa do payload, RN-802), "Aprovar plano" e "Negar". O jargão
  (payload cru, a nota do `permissions.json`, "Sempre permitir", o motivo da
  política e a lista do que o piloto automático libera) fica dentro de "Detalhes",
  fechado. A oferta do piloto automático ([RN-661](parte-05.md#rn-661)) é um checkbox JÁ MARCADO no
  cartão ("Ligar o piloto automático para o time"): aprovar com ele marcado
  primeiro grava a curinga `*` de cada agente (os `dev-<modulo>` que o plano
  sobe mais os subagentes de gate) pelo mesmo endpoint da aba Executores
  (`PUT .../agent-autonomy`, um PUT por agente), depois aprova. Um PUT recusado
  não impede a aprovação; desmarcado, nada é gravado. Aprovar ativa a
  execução ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)); o merge segue com o usuário. Só aparece
  onde quem chama passou o callback do modo automático (papel `maintainer`). O cartão
  segue único (AT-322). Isto substitui a oferta separada da AT-476, o que
  revoga a separação da AT-443 ([RN-755](#rn-755)) para este cartão.
- **Onde:** `apps/web/src/components/ApprovalCard.tsx` (`ofereceOPiloto`,
  `ligarOPilotoDoTime`), `apps/web/src/lib/aprovacoes.ts` (`tetoDoPlano`),
  `apps/web/src/components/ModoAutomaticoDoPlano.tsx` (`agentesDoPlano`)
- **Teste:** `apps/web/src/components/ApprovalCard.modo-automatico-do-plano.test.tsx`
- **Origem:** AT-476 (TP-01 de 10/10); AT-753 (checkbox no lugar da oferta separada)

<a id="rn-815"></a>

### RN-815 — O "Parar execução" conta as tarefas em curso E em revisão, lidas do backlog {#rn-815}

- **Regra:** a confirmação de "Parar execução" ([RN-763](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-763)) conta as
  tarefas pelo BACKLOG, lido só com a confirmação aberta, e não pela janela de
  eventos: `in_progress` e `in_review` (gate de QA rodando) em frases
  separadas, cada uma dizendo o que acontece com ela ao parar — a em curso é
  bloqueada com o trabalho preservado; a em revisão tem o gate parado e é
  bloqueada com a PR aberta; as duas voltam à fila quando liberadas. Antes a
  contagem saía dos dev agents com task na janela, e a tarefa em revisão (sem
  dev trabalhando nela) fazia a tela afirmar "Nenhuma tarefa está em curso".
  Backlog carregando ou com erro é dito em texto próprio, nunca como "nenhuma".
  Junto, o cartão do plano do Dev Lead ([RN-804](#rn-804)) abre a oferta em
  lote com texto próprio ("Ao aprovar o plano, a execução começa"), porque ali
  a execução ainda não começou ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)).
- **Onde:** `apps/web/src/lib/execution.ts:37` (`contarTarefasAfetadasAoParar`),
  `apps/web/src/components/PararExecucao.tsx:26` (`PararExecucao`),
  `apps/web/src/components/ModoAutomaticoDoTime.tsx:60` (`ModoAutomaticoDoTime`)
- **Teste:** `apps/web/src/components/PararExecucao.test.tsx` ("RN-815 (AT-488):
  a tarefa em revisão de QA conta…"; "RN-815: sem backlog lido não afirma…"),
  `apps/web/src/components/ModoAutomaticoDoTime.test.tsx` ("RN-816 (AT-488): no
  cartão do plano não afirma que a execução começou")
- **Origem:** AT-488 (TP-01 de 10/10)

<a id="rn-816"></a>

### RN-816 — O botão não muda de lugar quando um bloco tardio chega {#rn-816}

- **Regra:** bloco que chega DEPOIS do primeiro paint não fica acima do botão
  que a pessoa vai clicar, e o que precisa ficar acima tem o espaço reservado
  enquanto carrega. Na Sessão as pendências de outras sessões
  ([RN-626](parte-05.md#rn-626)) moram ACIMA do fio — entre o fio e o composer elas o
  encolhiam por baixo e, com o "acompanha o fim" ([RN-751](#rn-751)), o card
  final ("Aceitar handoff e iniciar…") subia sob o cursor. Na aba Executores
  elas vêm DEPOIS de "Parar execução" e da oferta em lote. Na aba PRs o Merge
  vem primeiro na coluna da linha, e a esteira do gate, que depende do backlog,
  tem altura reservada (esqueleto) enquanto ele carrega. Declarado: a reserva
  da esteira é a altura de uma esteira de uma linha de etapas, não medida no
  navegador, e jsdom não faz layout — o teste prova a ORDEM e a reserva, não o
  deslocamento em pixels.
- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`PendenciasDeOutrasSessoes`
  antes de `styles.messages`), `apps/web/src/routes/ProjectExecutorsTab.tsx`,
  `apps/web/src/routes/ProjectPrsTab.tsx:83` (`ProjectPrsTab`),
  `apps/web/src/routes/ProjectPrsTab.module.css` (`.reservaDaEsteira`)
- **Teste:** `apps/web/src/routes/salto-de-layout.test.ts`,
  `apps/web/src/routes/ProjectPrsTab.test.tsx` ("RN-816 (AT-480): o Merge não
  muda de lugar quando o backlog chega")
- **Origem:** AT-480 (TP-01 de 10/10)

<a id="rn-821"></a>

### RN-821 — Registrado rodando e observado parado oferece "Subir de novo" {#rn-821}

- **Regra:** na `/containers`, a linha com registro `running` e estado
  OBSERVADO `exited` deixa de ser "já está de pé" e oferece a ação de subida do
  modo (`acaoDeSubidaDoModo`), sem exigir Parar antes, com a ressalva
  `registrado_rodando_observado_parado` em texto. Só o observado destrava: sem
  observação, ou observado `running`, o registro continua valendo. A api já
  aceitava: `ExecuteContainerStartUseCase` com linha `running` não transiciona
  nada (a máquina de estados do ADR 0081 não muda) e o broker faz `docker
  start` no container parado.
- **Onde:** `apps/web/src/routes/containers-subida.ts:125` (`caiuPorFora`)
- **Teste:** `apps/web/src/routes/containers-subida.test.ts` ("AT-494:
  registrado running e observado exited oferece subir de novo, com a ressalva"
  e "AT-494: registrado running e observado running (ou não observado) continua
  já de pé")
- **Origem:** AT-494

<a id="rn-822"></a>

### RN-822 — O primeiro clique em Merge abre o cartão sem esperar a fila {#rn-822}

- **Regra:** extensão da [RN-816](#rn-816). Na aba PRs, o clique em "Merge"
  que cria a `proposed_action` de `git_merge` mostra o cartão de decisão com a
  ação que a api DEVOLVEU, na hora, em vez de esperar a fila do projeto
  (`useProjectPendingActions`) voltar. Antes, entre a resposta da proposta e o
  refetch da fila, o botão voltava sem cartão nenhum e a pessoa lia "o clique
  não pegou". A ação local vale por id da PR só enquanto a fila não tiver
  leitura MAIS NOVA que a proposta (`dataUpdatedAt`); com leitura mais nova,
  quem diz se ela segue pendente é a fila. Decidir (aprovar, negar, sempre
  permitir) a esquece. Declarado: a causa foi medida no CÓDIGO (o cartão
  dependia do refetch), não no navegador; que o refetch demore o bastante para
  o clique parecer perdido é inferência do TP-01.
- **Onde:** `apps/web/src/routes/ProjectPrsTab.tsx:105` (`acaoDaPr`)
- **Teste:** `apps/web/src/routes/ProjectPrsTab.test.tsx` ("RN-822 (AT-493):
  o 1º clique em Merge abre o cartão sem esperar a fila do projeto voltar" e
  "RN-822: a fila lida DEPOIS da proposta, sem ela, vence o cartão local")
- **Origem:** AT-493 (TP-01 de 10/10)

<a id="rn-824"></a>

### RN-824 — Depois do mapa de módulos, o composer diz que o próximo passo é confirmar a arquitetura {#rn-824}

- **Regra:** a oferta da Infra continua sendo um clique HUMANO ("Confirmar
  arquitetura pronta"); o que muda é que a tela AVISA. Com o Arquiteto ativo,
  sem turno em curso, sem o handoff dele já oferecido e com um
  `artifact.module_map` gravado na sessão, o composer mostra em texto visível
  que a arquitetura pode ser confirmada para o sistema oferecer a Infra. Sem
  história promovida, o mesmo lugar diz o motivo de o botão estar inerte, uma
  vez, em texto (o `title` de botão desabilitado não abre no Chromium,
  [RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)); o botão habilitado ganha a explicação no `title`. A
  derivação lê os `events` que a tela já tem — nenhuma query nova
  ([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579)).
- **Onde:** `apps/web/src/lib/session-readiness.ts:144` (`temMapaDeModulos`),
  `apps/web/src/routes/SessionComposer.tsx:136` (`hasModuleMap`)
- **Teste:** `apps/web/src/routes/SessionPage.proximo-passo-arquitetura.test.tsx`
  ("mapa gravado + história promovida + Arquiteto parado: o texto aparece";
  falhas: "com o handoff do Arquiteto já oferecido, o texto some", "com turno
  em curso (streaming), o texto não aparece", "sem história promovida, o
  motivo vem em texto visível")
- **Origem:** AT-491 (opção a: o gesto humano é desenho, o defeito era a tela
  não avisar)

<a id="rn-825"></a>

### RN-825 — O chat mostra as PRs prontas para merge e propõe o merge ali {#rn-825}

- **Regra:** acima do fio da sessão, ao lado das pendências de outras sessões
  ([RN-626](parte-05.md#rn-626)), a fila "PRs prontas para merge" lista as PRs ABERTAS do
  projeto cuja tarefa teve os gates aprovados (`gateStatus: awaiting_user`) ou
  que não têm tarefa (ADR, infra), e que não têm `git_merge` pendente de OUTRA
  sessão (essa já está em "Merges de PR"). "Mergear" PROPÕE o merge nesta
  sessão, pelo mesmo endpoint da aba PRs, e o cartão de aprovação aparece na
  linha da PR com a ação devolvida pela api ([RN-822](#rn-822)); o merge segue
  manual ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418)). Cada fila tem título e contagem próprios, nunca
  somados ([RN-467](parte-03.md#rn-467)), e a lista de PRs abertas vem de
  `GET /projects/:projectId/git/open-pull-requests`, que não passa pelo portão
  da imagem ([RN-105](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-105), AT-843), com a `queryKey`
  `['code-pull-requests', projectId, 'open', 'chat']` (sob o prefixo da aba PRs,
  para as mesmas releituras da [RN-841](#rn-841)) e o backlog a 15 s, sem poll
  novo apertado ([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579)).
- **Onde:** `apps/web/src/lib/prontas-e-bloqueadas.ts:30` (`prsProntasParaMerge`),
  `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:87` (`prontas`)
- **Teste:** `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`
  ("a PR com os gates aprovados aparece, a com gate pendente não, e Mergear
  mostra o cartão ali")
- **Origem:** AT-497 (TP-01 conduzido pelo chat do Criativo)

<a id="rn-826"></a>

### RN-826 — O chat lista as tarefas bloqueadas e desbloqueia ali {#rn-826}

- **Regra:** na mesma área, a fila "Tarefas bloqueadas" lista as tarefas
  `blocked` do backlog com título e motivo (`blockedReason`, ou "sem motivo
  registrado"), e "Desbloquear" chama o mesmo `unblock` da Visão geral
  ([RN-794](#rn-794)) com a sessão aberta. O retorno é dito na linha da
  tarefa: sucesso em texto, e a recusa com a frase da api. Papel abaixo de
  `developer` vê a fila com o botão inerte e o motivo em texto.
  AT-799: ao lado dela mora a fila "Agentes travados" (disjuntor aberto, RN-047):
  cada dev agent com `dev.idle_tripped`/`dev.credit_exhausted` sem `dev.rearmed`
  (nem `dev.working`/`dev.started`) depois, lido dos eventos da execução ativa
  (`agentesTravados`), com o motivo e o botão "Rearmar" (`rearmDevAgent`). O
  `backlog.task_blocked` que o engine emite logo após o disparo NÃO tira o
  `travado` do card (`devStatus`). A tarefa bloqueada cujo `assignedTo` está
  travado diz "rearme antes de desbloquear".
- **Onde:** `apps/web/src/lib/prontas-e-bloqueadas.ts:53` (`tarefasBloqueadas`),
  `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:217` (`desbloquear`)
- **Teste:** `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`
  ("CASO DE FALHA: desbloquear com erro diz o erro da api na linha da tarefa")
- **Origem:** AT-497

<a id="rn-829"></a>

### RN-829 — O avatar de quem fala no fio é o do agente, no streaming e depois dele {#rn-829}

- **Regra:** a bolha do agente em streaming e a bolha persistida da resposta
  (`agent.response`) desenham o MESMO avatar, `AvatarDoAgente`, pelo id do
  agente. Antes a bolha em curso mostrava o ícone do agente e a persistida o
  ícone de modelo, e o avatar trocava na cara da pessoa quando o turno fechava.
  O modelo que gerou a resposta continua só no chip ao lado do nome.
  Agente fora do roster (ou sem id) degrada para o ícone
  genérico, nunca para caixa vazia.
- **Onde:** `apps/web/src/components/ui/AvatarDoAgente.tsx:22` (`AvatarDoAgente`),
  `apps/web/src/routes/SessionFio.tsx:264` (`BolhaDoStreaming`),
  `apps/web/src/routes/session-timeline-montagem.tsx:151` (`montarTimeline`)
- **Teste:** `apps/web/src/routes/SessionFio.at503.test.tsx` ("a bolha
  persistida usa o avatar do agente, não o do modelo; o modelo segue no chip",
  "a bolha em streaming usa o MESMO avatar"; degradação: "sem agente
  identificado, degrada para o avatar genérico")
- **Origem:** AT-503 (TP-01 11ª, nota de UX do chat §2.1)

<a id="rn-830"></a>

### RN-830 — O composer respeita a composição de acento, e o fio fala com o leitor de tela {#rn-830}

- **Regra:** Enter só envia quando não há composição em curso
  (`nativeEvent.isComposing`) — no meio de um acento por IME ou tecla morta,
  ele confirma o caractere. O contêiner do fio é `role="log"` (com nome), e a
  faixa de atividade do turno ([RN-460](parte-03.md#rn-460)) é `role="status"` com
  `aria-live="polite"`: o leitor de tela anuncia a resposta nova e o que o
  agente está fazendo sem interromper quem está lendo. A checagem mora no
  composer, não na página, que está no teto de linhas ([ADR 0176](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0176-sessionpage-abaixo-de-mil-linhas.md)).
- **Onde:** `apps/web/src/routes/SessionComposer.helpers.ts:9` (`ignorarComposicaoIme`),
  `apps/web/src/components/TurnActivityStrip.tsx:47` (`TurnActivityStrip`)
- **Teste:** `apps/web/src/routes/SessionFio.at503.test.tsx` ("Enter sem
  composição chega ao handler de envio", "a faixa do turno é uma região de
  status educada"; falha: "Enter no meio da composição de acento NÃO envia")
- **Origem:** AT-503 (nota de UX do chat §3)

<a id="rn-831"></a>

### RN-831 — A mensagem que não foi enviada fica no fio, com "tentar de novo" {#rn-831}

- **Regra:** quando o envio da mensagem ao agente falha (exceto a recusa por
  sessão encerrada, que devolve o texto ao campo — AT-154), a bolha otimista
  não some: o texto fica no fio com o selo "não enviada" e o botão "Tentar de
  novo", que reenvia o MESMO texto ao MESMO destinatário pelo caminho de
  sempre. Há uma só por vez; um envio novo (ou o próprio reenvio) a substitui.
  O toast com o motivo continua.
- **Onde:** `apps/web/src/lib/mensagem-nao-enviada.ts:29`
  (`marcarMensagemNaoEnviada`), `apps/web/src/routes/SessionFio.tsx:56`
  (`SessionFio`)
- **Teste:** `apps/web/src/routes/SessionFio.at503.test.tsx` ("mostra o texto
  com \"não enviada\" e reenvia ao clicar em tentar de novo", "um envio novo
  (otimista acesa) substitui a não enviada");
  `apps/web/src/routes/SessionPage.turno-preso.test.tsx` (falha: "CASO DE
  FALHA: erro no envio desarma o turno e a mensagem fica \"não enviada\"
  (RN-831)")
- **Origem:** AT-503 (nota de UX do chat §3)

<a id="rn-833"></a>

### RN-833 — Todo socket Phoenix do web se descarta, e o substituído não age {#rn-833}

- **Regra:** todo socket Phoenix do web nasce por `criarSocket` e morre por
  `descartar()`, que faz `disconnect()` e remove os três ouvintes que o
  construtor do `phoenix@1.8.9` registra em `window` (`pagehide`, `pageshow`,
  `visibilitychange`) — `disconnect()` sozinho os deixava, e o
  `visibilitychange` reabria o socket velho. No canal da sessão cada
  `conectar()` é uma GERAÇÃO: a anterior é descartada (leave, `descartar()` e
  o ping DELA) antes de a nova nascer, e todo callback de geração antiga é
  no-op — o `onClose` de um socket substituído não agenda reconexão, não
  limpa o ping do atual e não marca morto o canal vivo. O canal vivo
  ([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579)) é CONTAGEM de conexões por sessão, não booleano. A
  neutralização do auto-reconnect ([RN-108](parte-01.md#rn-108))
  continua obrigatória no tipo de `criarSocket`.
- **Onde:** `apps/web/src/lib/socket-phoenix.ts:31` (`criarSocket`),
  `apps/web/src/lib/session-channel.ts:92` (`descartarGeracao`),
  `apps/web/src/lib/session-channel.ts:136` (`ehAtual`),
  `apps/web/src/lib/canal-vivo.ts:70` (`marcarCanalDaSessao`)
- **Teste:** `apps/web/src/lib/socket-phoenix.test.ts` (Phoenix real: "50×
  criar + descartar deixa saldo líquido 0 nos três ouvintes de window";
  falha: "socket só desconectado (sem descartar) deixa os três ouvintes"),
  `apps/web/src/lib/session-channel.test.ts` ("gerações (AT-500, RN-833)"),
  `apps/web/src/lib/canal-vivo.test.ts`
- **Origem:** AT-500

<a id="rn-834"></a>

### RN-834 — O nome do projeto no assistente não se chama "title" {#rn-834}

- **Regra:** o campo "Nome do projeto" do assistente de criação usa `id`/`name`
  `projeto-slug`, que não casam com nenhum token de dado de contato (`name`,
  `nome`, `title`, `first`, `last`, `company`, `contact`). O `project-title` da
  [RN-736](#rn-736) tirou o "name", mas "title" é pronome de tratamento
  (Sr./Sra.) no preenchimento de contato, e o NordPass seguiu abrindo a lista
  de contatos sobre o campo. O rótulo visível "Nome do projeto" (ligado por
  `htmlFor`) e o `SEM_AUTOFILL` da [RN-740](#rn-740) ficam. É HEURÍSTICA, não
  medida: o NordPass não documenta atributo de ignore, e nenhum foi
  acrescentado ao `SEM_AUTOFILL`; a prova é o TP-01.
- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx:746` (`projeto-slug`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx` ("RN-834: id e
  name do nome do projeto não parecem dado de contato…")
- **Origem:** AT-501 (TP-01 de 10/10)

<a id="rn-835"></a>

### RN-835 — O "Desbloquear" da Visão geral não se move e diz o que aconteceu {#rn-835}

- **Regra:** extensão da [RN-816](#rn-816) e da [RN-794](#rn-794). Na seção de
  execução da Visão geral, a lista de tarefas bloqueadas vem PRIMEIRO, antes do
  "Religar execução" (que depende da leitura da execução vigente) e do grid dos
  dev agents (que depende dos eventos) — blocos que chegavam depois do primeiro
  paint e empurravam o botão sob o cursor. O desbloqueio tem retorno POR
  TAREFA: em voo o botão fica inerte e diz "Desbloqueando…" (um clique, uma
  chamada), o sucesso diz "Tarefa desbloqueada" até o backlog relido tirar a
  linha, e a recusa mostra a frase da api na própria linha. Sem sessão lida, o
  botão fica inerte com o motivo em texto — antes o clique retornava calado.
  Declarado: o que fica ACIMA da seção (o time e a árvore de atividade) não tem
  altura reservada, e jsdom não faz layout — o teste prova a ORDEM, não o
  deslocamento em pixels; qual das duas causas (salto ou sessão não lida) fez o
  1º clique do TP-01 se perder não foi medido no navegador.
- **Onde:** `apps/web/src/routes/ProjectOverviewTab.tsx:498` (`desbloqueio`),
  `apps/web/src/routes/ProjectOverviewTab.tsx:634` (`blockedTasks`)
- **Teste:** `apps/web/src/routes/ProjectOverviewTab.test.tsx` ("RN-835
  (AT-502): o desbloqueio chama uma vez, fica em voo e diz quando terminou";
  falha: "RN-835: a recusa do desbloqueio mostra a frase da api na linha"),
  `apps/web/src/routes/salto-de-layout.test.ts` ("RN-835 (AT-502): Visão
  geral — as tarefas bloqueadas vêm antes…")
- **Origem:** AT-502 (TP-01 de 10/10)

<a id="rn-836"></a>

### RN-836 — O fio oferece "ir ao fim" quando chega conteúdo para quem subiu {#rn-836}

- **Regra:** com a pessoa longe do fim do fio (a guarda dos 120px da
  [RN-173](parte-02.md#rn-173)) e o fio tendo ganho mensagem ou cartão de aprovação PENDENTE
  desde que ela saiu do fim, um botão flutuante no rodapé da área que rola
  oferece o salto ao fim, contando as mensagens novas ("3 mensagens novas",
  plural do i18next com `_zero`/`_one`/`_other`). Cartão de aprovação PENDENTE novo
  não soma ao número: REALÇA o botão e troca o rótulo por "Há uma aprovação
  esperando" (só o fio marca ação `pending`, comparada por CONJUNTO de ids ao sair do fim; ação já decidida não realça e a pendente decidida apaga o realce). O botão tem rótulo acessível próprio, some ao chegar ao fim e
  nunca aparece para quem está no fim — ali a rolagem automática da RN-173
  continua mandando, e o botão só observa.
- **Onde:** `estadoDoIrAoFim` (removido na RN-951, `apps/web/src/lib/session-rolagem.ts`),
  `useIrAoFimDoFio` (removido),
  `IrAoFimDoFio` (componente removido)
- **Teste:** `apps/web/src/routes/IrAoFimDoFio.test.tsx` ("caminho feliz: fora
  do fim e com mensagens novas, mostra o contador…", "aprovação nova realça o
  botão", "pendente decidida apaga o realce", "troca de uma pendente por outra realça"; falha: "no fim, conteúdo novo não mostra botão")
- **Origem:** AT-506 (Melhorias de UX do Chat, item 1.3)

<a id="rn-837"></a>

### RN-837 — Markdown do fio: blocos novos e prefixo de stream sem marcador cru {#rn-837}

- **Regra:** o Markdown leve do chat (parser próprio, sem dependência) também
  reconhece régua (`---`, `***`, `___`; logo depois de texto de parágrafo
  continua texto), citação (linhas `>` seguidas, miolo reprocessado pelo
  mesmo parser), cabeçalho `####`, lista aninhada de UM nível (item recuado em
  2+ espaços vai para o item anterior; mais fundo achata) e checklist
  (`- [ ]`/`- [x]`, caixa só visual, desabilitada). No modo stream
  (`MarkdownMessage` com `emCurso`), o texto passa antes por
  `fecharMarcadoresAbertos`, que fecha fence, crase e `**` pendentes e tira um
  marcador solto na ponta — nenhum prefixo lança nem mostra marcador cru. O
  texto final nunca passa por ele. Continua sem `dangerouslySetInnerHTML`.
- **Onde:** `apps/web/src/lib/markdown.ts:122` (`HR_RE`),
  `apps/web/src/lib/markdown.ts:123` (`CITACAO_RE`),
  `apps/web/src/lib/markdown.ts:124` (`TAREFA_RE`),
  `apps/web/src/lib/markdown.ts:374` (`fecharMarcadoresAbertos`),
  `apps/web/src/components/ui/MarkdownMessage.tsx:336` (`MarkdownMessage`)
- **Teste:** `apps/web/src/lib/markdown.blocos-e-stream.test.ts` ("checklist
  marca cada item…"; falha: "`---` logo depois de texto continua texto"),
  `apps/web/src/components/ui/MarkdownMessage.stream.test.tsx` ("nenhum
  prefixo lança nem mostra marcador cru"; falha: "o texto final (sem
  emCurso) não é alterado")
- **Origem:** AT-507 (Melhorias de UX do Chat, 10/10, item 1.2-a)

<a id="rn-841"></a>

### RN-841 — A fila "PRs prontas" se relê sem recarregar a página {#rn-841}

- **Regra:** extensão da [RN-825](#rn-825). A lista de PRs abertas continua
  sem poll próprio, e é relida em dois momentos: (1) quando a leitura do
  backlog que o chat já faz a 15 s traz alguma tarefa com `status` ou
  `gateStatus` diferente da leitura anterior (a PR do dev nasce na sessão de
  EXECUÇÃO, cujo canal o chat não ouve, e os gates aprovando aparecem ali); e
  (2) quando o canal desta sessão avisa `adr.pr_opened`, `infra.pr_opened`,
  `action.pr_open`, `action.git_merge` ou `action.failed`, pelo
  invalidador com janela de 2 s ([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579), [RN-632](parte-05.md#rn-632)). A
  primeira leitura e a leitura igual não releem nada: o custo é zero de poll
  novo. Fica de fora, declarado: PR de infra aberta noutra sessão sem mudar
  tarefa nem passar por este canal só aparece na próxima leitura disparada por
  outro motivo.
- **Onde:** `apps/web/src/lib/prontas-e-bloqueadas.ts:66` (`assinaturaDoBacklog`),
  `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:102` (`assinaturaAnterior`),
  `apps/web/src/lib/canal-vivo.ts:134` (`alvosDoEvento`)
- **Teste:** `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`
  ("RN-841: a tarefa que entra em awaiting_user relê as PRs…" e "CASO DE FALHA
  RN-841…"), `apps/web/src/lib/acoes-da-sessao.test.ts`
- **Origem:** AT-510

<a id="rn-842"></a>

### RN-842 — O rótulo do nome do projeto não diz "Nome" {#rn-842}

- **Regra:** o rótulo visível do campo de nome do assistente de criação é
  "Projeto" (en: "Project"), não "Nome do projeto"/"Project name": com o
  `id`/`name` `projeto-slug` da [RN-834](#rn-834) o NordPass seguiu abrindo
  "Contact info" sobre o campo (TP-01, 12ª), e o texto do `<label>` é o sinal
  que sobrava. O rótulo segue visível e ligado por `htmlFor`, o campo segue
  fora de `<form>` e com o `SEM_AUTOFILL` da [RN-740](#rn-740). É HEURÍSTICA:
  a busca (central de ajuda do NordPass, loja da extensão, fóruns) não achou
  atributo de ignore documentado pelo NordPass (nada como `data-np-ignore`),
  então nenhum foi acrescentado ao `SEM_AUTOFILL`. Já tentados antes: tirar
  `autoFocus` (RN-736), `aria-autocomplete`/`data-protonpass-ignore` (RN-740),
  `id`/`name` sem token de contato (RN-834). A prova é o TP-01.
- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx:749` (`projeto-slug`),
  `apps/web/src/locales/pt-BR/newProject.json` (`nameLabel`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx` ("RN-842: o
  rótulo visível do campo não traz \"nome\"…")
- **Origem:** AT-511 (TP-01 de 11/10)

<a id="rn-843"></a>

### RN-843 — Um cartão de decisão por ação no chat {#rn-843}

- **Regra:** extensão da [RN-822](#rn-822). O `git_merge` PENDENTE que o bloco
  de pendências desenha na linha da PR ("PRs prontas para merge") é o ÚNICO
  `ApprovalCard` dele na tela: o bloco registra os ids que desenha num registro
  leve do cliente, e o fio da sessão, enquanto a ação estiver pendente e
  registrada, mostra só uma linha apontando para a fila. Decidida, o fio volta
  ao cartão (histórico); sem o bloco montado (outra tela, PR fora da fila), o
  fio mostra o cartão completo. O registro vale só enquanto o cartão está
  MONTADO: com o bloco recolhido (o `Disclosure` desmonta o conteúdo), o fio
  mostra o cartão. Nenhum endpoint nem teto muda. AT-753: a linha de referência leva um
  botão "Ver o cartão" que abre a aba "PRs prontas" (`brabo:abrir-fila`, que
  generaliza o evento das perguntas), porque a aba nasce fechada (AT-680).
- **Onde:** `apps/web/src/lib/acoes-no-bloco.ts:48` (`useAcaoEstaNoBloco`),
  `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:604` (`useRegistrarAcoesNoBloco`),
  `apps/web/src/components/CartaoOuReferenciaNoFio.tsx:11` (`CartaoOuReferenciaNoFio`),
  `apps/web/src/routes/session-timeline-montagem.tsx:1325` (`CartaoOuReferenciaNoFio`)
- **Teste:** `apps/web/src/components/CartaoOuReferenciaNoFio.test.tsx`,
  `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx` ("a PR com os
  gates aprovados aparece…")
- **Origem:** AT-512

<a id="rn-855"></a>

### RN-855 — A Visão geral mostra como rodar o entregável, declarado e não verificado {#rn-855}

- **Regra:** a Visão geral ganha o cartão "Rodar na sua máquina", logo abaixo
  do de primeiros passos, com o que a Infra declarou na PR dela
  (`artifact.run_instructions`, RN-852): o comando num bloco de código com
  botão "Copiar", as URLs como links que abrem em aba nova
  (`target="_blank"`, `rel="noopener noreferrer"`) — só `http://localhost:<porta>`
  e `http://127.0.0.1:<porta>`; outra URL não vira link, mesmo a api já a
  recusando —, a lembrança de `cp .env.example .env` quando `envExample` e a
  nota "Declarado pela Infra na PR, não verificado na sua máquina" (RN-468:
  nunca verde, nunca "rodando"). Sem declaração (`null`) o cartão não
  aparece, como o de primeiros passos some quando não há o que dizer. A
  leitura é de configuração (`FRESCOR_DA_CONFIGURACAO_MS`, sem poll) e o
  aviso `infra.pr_opened` do canal da sessão a relê.
- **Onde:** `apps/web/src/components/RodarNaSuaMaquina.tsx:19` (`RodarNaSuaMaquina`),
  `apps/web/src/components/RodarNaSuaMaquina.helpers.ts:15` (`urlLocalSegura`), `:8` (`releSeInfraAbriuPr`),
  `apps/web/src/routes/ProjectOverviewTab.tsx:214` (`releSeInfraAbriuPr`),
  `apps/web/src/lib/api-client.ts:882` (`getRunInstructions`)
- **Teste:** `apps/web/src/components/RodarNaSuaMaquina.test.tsx` ("mostra
  comando, copiar, link local e a nota de não verificado"; "sem declaração
  (null) o cartão não aparece"; "só localhost/127.0.0.1 com porta vira link";
  "infra.pr_opened relê o cartão; outro evento não")
- **Origem:** AT-517 (ADR 0213)

<a id="rn-861"></a>

### RN-861 — As perguntas em aberto são fila própria no chat, e o aviso de prontidão não bloqueia {#rn-861}

- **Regra:** o bloco de pendências do chat ganha a fila "Perguntas em
  aberto", com título e contagem PRÓPRIOS (o `total` da api, nunca somado às
  outras filas — RN-467) e recorte declarado quando a lista vem com teto
  (RN-180). Cada cartão diz a pergunta, o agente que perguntou, o que ela
  afeta, a sugestão com "Aceitar sugestão" e um campo curto com "Responder";
  a tarefa que o gate de QA estacionou pela pergunta (RN-860) aparece no
  próprio cartão como "esperando sua resposta". Só o autor da sessão de
  origem (`autorDaSessao`) tem os controles; os outros veem o cartão com o
  controle inerte e o motivo em texto (ADR 0064). A recusa mostra a frase da
  api; o sucesso relê a fila e a pergunta sai. A leitura NÃO polla: o canal
  relê a fila em `artifact.open_question`, `open_question.answered` e
  `pr.gate_changed` (alvo `perguntas`, janela de 2 s). Junto de "Estou pronto"
  e de "Confirmar arquitetura pronta", o composer avisa "N perguntas em
  aberto" com atalho até a fila, lendo a MESMA query — só avisa, os botões
  seguem habilitados (ADR 0214).
- **Onde:** `apps/web/src/components/PerguntasEmAberto.tsx:47`
  (`PerguntasEmAberto`), `:127` (`eAutor`), `:297`
  (`AvisoDePerguntasEmAberto`), `apps/web/src/lib/canal-vivo.ts:135`
  (`alvosDoEvento`)
- **Teste:** `apps/web/src/components/PerguntasEmAberto.test.tsx` ("fila
  própria com contagem própria; o autor responde e aceita a sugestão", "o
  aviso do composer diz N e não bloqueia nada; some sem perguntas"; falha: "a
  recusa 409 mostra a frase da api", "quem não é o autor da sessão vê o
  cartão com o controle inerte e o motivo em texto")
- **Origem:** AT-521

<a id="rn-867"></a>

### RN-867 — O aviso do gate estacionado diz o motivo gravado, e a pergunta em aberto aponta o cartão dela {#rn-867}

- **Regra:** o `gate.rescue_parked` tem dois emissores: o resgate por tempo
  (`GateRescuer`, RN-722), que grava `idadeSegundos`, e o QA estacionado
  esperando a resposta a uma pergunta em aberto, que não o grava. O fio
  distingue os dois pela PRESENÇA de `idadeSegundos` (o `motivo` é texto
  pt-BR fixo e não é lido como chave): "parado mais de 2 h" só no resgate por
  tempo; no outro, o aviso diz que o gate espera a resposta e aponta o cartão
  "Perguntas em aberto" (RN-861). O botão "Retomar gate" (RN-724) segue nos
  dois.
- **Onde:** `apps/web/src/routes/RetomarGateEstacionado.helpers.ts:6`
  (`cicloEstacionado`), `apps/web/src/routes/session-timeline-montagem.tsx`
  (`gateEstacionado.avisoPergunta`)
- **Teste:** `apps/web/src/routes/RetomarGateEstacionado.test.tsx` ("o
  resgate por tempo grava idadeSegundos e lê como tempo"; falha: "a pergunta
  em aberto não tem idadeSegundos e não fala em 2 h")
- **Origem:** AT-528

<a id="rn-882"></a>

### RN-882 — O composer da Sessão não perde tecla na digitação rápida {#rn-882}

- **Regra:** o campo do composer é NÃO controlado (AT-539, revisão): `defaultValue`
  + `ref`, e o `onChange` só emite o valor ao `draft` da página (envio, fila e
  botões seguem lendo dele). Re-render da página nunca reescreve o DOM do campo;
  a prop só vira atribuição imperativa no nó (esvaziar depois do envio, o texto
  devolvido na falha, o exemplo do convite) quando difere do DOM E não é eco de
  um valor que o campo emitiu. Antes o `<textarea>` era controlado (primeiro pelo
  `draft`, depois por um estado local) e um commit com valor mais velho que o do
  DOM o reescrevia: 991 de 1 010 caracteres no TP-01 (AT-533) e 1 tecla a cada
  53 numa rajada de CDP (AT-539, causa não isolada; aceite no Chrome real).
  Enter, Shift+Enter e a composição de acento (RN-830) não mudam.
- **Onde:** `apps/web/src/components/CampoDoComposer.tsx:22` (`CampoDoComposer`);
  `apps/web/src/routes/SessionComposer.tsx`
- **Teste:** `apps/web/src/components/CampoDoComposer.test.tsx` ("digitação
  rápida com a página atrasada não perde tecla nenhuma"; falha/borda: "a
  escrita de fora (esvaziar depois do envio) é adotada pelo campo"; "um re-render
  da página nunca reescreve o que já está no DOM do campo"; "rajada de 300
  teclas com a página atrasada chega inteira")
- **Origem:** AT-533, AT-539

<a id="rn-883"></a>

### RN-883 — A oferta em lote do modo automático também no chat da Sessão {#rn-883}

- **Regra:** com a sessão ativa e com execução (`sessaoTemExecucao`), o chat
  mostra a MESMA oferta em lote da aba Executores (RN-661) — o mesmo
  componente, o mesmo endpoint (um PUT por agente), o mesmo texto do que o
  modo automático não libera, e nada é gravado sem o clique. Os agentes são os
  `dev-<modulo>` que entraram na sessão inteira mais os subagentes de gate
  (`agentesDaOfertaEmLote`); papel `maintainer` (o do endpoint). Sem execução,
  nada aparece e `agent_autonomy` nem é lido. Some quando todos já estão em
  automático.
- **Onde:** `apps/web/src/components/ModoAutomaticoNoChat.tsx:7`
  (`ModoAutomaticoNoChat`), `:6` (`agentesDoChat`)
- **Teste:** `apps/web/src/components/ModoAutomaticoNoChat.test.tsx` ("caminho
  feliz: com execução, a oferta aparece e só o clique grava"; falha: "sem
  execução, nada aparece e nem a leitura acontece")
- **Origem:** AT-537

<a id="rn-884"></a>

### RN-884 — A pergunta respondida oferece "Corrigir a história" {#rn-884}

- **Regra:** a pergunta respondida pelo painel "Perguntas em aberto" do chat
  (RN-861) fica como cartão respondido até ser dispensada, e cada história de
  `afeta.historias` que o backlog traz ganha "Corrigir a história" quando ainda
  é corrigível pela régua da RN-727 (`draft`, sem tarefa
  `in_progress`/`in_review`, papel `developer`) — o link leva à aba Histórias
  com ela aberta (`?historia=`). Não aciona o PO (decisão do dono, 14/10). Não
  corrigível: o link não existe e o motivo é dito em texto (RN-102). A régua é
  a MESMA função da aba Histórias, movida para `lib/`.
- **Onde:** `apps/web/src/components/PerguntasEmAberto.tsx:232`
  (`CartaoRespondido`); `apps/web/src/lib/correcao-de-historia.ts`
  (`motivoDeCorrecaoInerte`); `apps/web/src/routes/ProjectBacklogTab.tsx:391`
  (`useHistoriaInicial`)
- **Teste:** `apps/web/src/components/PerguntasRespondidas.test.tsx` ("caminho
  feliz: história draft sem tarefa em execução ganha o link para a aba
  Histórias"; falha: "com tarefa em execução o botão não existe e o motivo é
  dito em texto")
- **Origem:** AT-538

<a id="rn-887"></a>

### RN-887 — O bloqueio da tarefa é ortogonal ao status, e quem mostra lê os dois {#rn-887}

- **Regra:** tarefa bloqueada continua `todo`/`in_progress` com
  `tasks.blocked = true` (e `blocked_reason`/`blocked_origin`) — não há status
  `blocked` no enum, por decisão do dono (14/10). Quem CONTA ou MOSTRA tarefa
  lê os dois campos, e `blocked` vence `status`: a aba Histórias mostra o selo
  "Bloqueada" (tom de perigo) com o motivo em texto, e os demais pelo status
  (a fazer, em curso, em revisão, concluída); a lista de tarefas do backlog que
  o Dev Lead lê marca a linha com `| BLOQUEADA: <motivo, até 120 caracteres>`,
  e a tarefa segue na lista. Claim, desbloqueio e retomada não mudam.
- **Onde:** `apps/web/src/lib/execution.ts:10` (`estadoDaTarefa`);
  `apps/web/src/routes/ProjectBacklogTab.tsx` (o selo da lista de tarefas);
  `apps/engine/lib/engine/agents/dev_lead_tools.ex:471` (`bloqueio`)
- **Teste:** `apps/web/src/lib/execution.test.ts` ("blocked vence o status";
  falha: "sem bloqueio, o status"); `apps/web/src/routes/ProjectBacklogTab.test.tsx`
  ("a bloqueada mostra \"Bloqueada\" e o motivo, sem o selo \"a fazer\"");
  `apps/engine/test/engine/agents/dev_lead_tools_test.exs` ("a tarefa
  bloqueada diz BLOQUEADA e o motivo; a todo normal não")
- **Origem:** AT-536

<a id="rn-889"></a>

### RN-889 — A oferta em lote do modo automático aparece no chat de qualquer sessão ativa do projeto em execução {#rn-889}

- **Regra:** estende a RN-883. Aprovar o plano do Dev Lead cria a sessão de
  EXECUÇÃO, separada da do Criativo, e é no chat do Criativo que o usuário
  conduz. A oferta em lote (RN-661) aparece no chat de toda sessão ATIVA
  quando o PROJETO tem execução — `roster.executionActivated` do resumo de
  projetos (a sessão mais recente, a de execução), a MESMA leitura e `queryKey`
  que o chat já fazia (`useAtivosNoProjeto`, RN-633), sem query nova nem poll
  novo. Os dev agents de lá (`roster.activatedAgents`) somam aos desta sessão.
  Mesmo componente, mesmo endpoint, mesmo texto, nada gravado sem o clique,
  espera saber quem já está ligado (RN-803) e some com o time todo em
  automático. Sem execução no projeto, nada aparece e `agent_autonomy` nem é
  lido. Lacuna declarada: o sinal é `roster.executionActivated` da sessão mais
  recente, que diz que ela TEVE `execution.activated`, não que segue aberta;
  com a sessão de execução já encerrada, a oferta ainda aparece no chat do
  Criativo — declarado, não corrigido, porque distinguir exigiria uma leitura
  nova (o orçamento de requisições).
- **Onde:** `apps/web/src/components/ModoAutomaticoNoChat.tsx:29`
  (`ofertaDoChat`); `apps/web/src/lib/session-destinatario.ts:174`
  (`useExecucaoNoProjeto`)
- **Teste:** `apps/web/src/components/ModoAutomaticoNoChat.test.tsx` ("caminho
  feliz: execução ativa noutra sessão do projeto, time em manual — a oferta
  aparece no chat do Criativo"; falhas: "time todo já em automático: nada
  aparece", "sem execução no projeto: nada aparece e nem a leitura acontece")
- **Origem:** AT-540

<a id="rn-901"></a>

### RN-901 — A oferta de modo automático do chat inclui os dev agents do plano aprovado {#rn-901}

- **Regra:** estende a RN-889. `roster.activatedAgents` do resumo de projetos
  NUNCA traz dev agent: o dev não grava `agent.activated`, só `dev.started`. A
  oferta em lote do chat (RN-883/889) lia só essa lista e não listava o
  `dev-<modulo>` da execução ativa, que o usuário precisava ligar pela aba
  Executores. A execução do projeto (`execucaoDoRoster`) passa a somar, só com
  `roster.executionActivated`, os `dev-<modulo>` dos `roster.moduleNames` (o
  `module_map` vigente), pela MESMA `devAgentId` que a aba Executores usa
  (RN-661, `rosterFromFacts`), sem derivação nova. Sem execução ativa, nenhum
  dev entra. Lacuna declarada: a lista sai do `module_map` VIGENTE; se o plano
  aprovado usou um subconjunto dos módulos, a oferta herda essa divergência.
  Nenhum teto se move e nada é gravado sem o clique.
- **Onde:** `apps/web/src/lib/session-destinatario.ts:194` (`execucaoDoRoster`),
  chamado por `useExecucaoNoProjeto` (`apps/web/src/lib/session-destinatario.ts:175`)
- **Teste:** `apps/web/src/lib/session-destinatario.test.ts` ("CAMINHO FELIZ:
  execução ativa soma o dev-<modulo> do module_map aos ativados"; falha: "sem
  execução ativa, o módulo do plano NÃO vira dev agent"), e
  `apps/web/src/components/ModoAutomaticoNoChat.test.tsx` (fixture derivada do
  roster real, "caminho feliz")
- **Origem:** AT-573 (TP-01 18ª, 19/10: a 1ª tarefa parou em `dev.awaiting_approval`
  porque o dev não estava no modo automático)

<a id="rn-911"></a>

### RN-911 — Provider é global; Configurações do projeto só escolhem modelo; a matriz mora na Conta {#rn-911}

- **Regra:** credencial de LLM, catálogo de modelos (curadoria, preços, sync e o navegador do Hugging Face) e o relatório de gasto por chave saíram das Configurações do projeto. Moram em `/providers` (as três peças) e o gasto por chave também na aba Gastos, só para `owner` (RN-060). O projeto guarda só a ESCOLHA: modelo por agente e por área, o "aplicar a todos" (RN-476), o critério de roteamento e "melhores modelos". A matriz "Quem pode aprovar o quê" saiu das Configurações e é uma seção da Conta (`/account`), para qualquer pessoa logada. O atalho "Ativar e aplicar aos N agentes" (RN-694 item 3) deixou de existir. Link antigo `?section=credentials`, `model-catalog`, `key-spend` ou `approval-matrix` abre a aba no topo, sem erro. O vazio de "Modelos por agente", o subtítulo de "melhores modelos" e os Primeiros passos (RN-708) apontam para `/providers`. Revisa a RN-694 (item 3) e a RN-708 (destinos). Sem ADR: é fronteira de tela.
- **Onde:** `apps/web/src/routes/settings/sumario.ts:48` (`SECOES_DE_CONFIGURACOES`), `apps/web/src/routes/ProjectSettingsTab.tsx:62` (`ProjectSettingsTab`), `apps/web/src/routes/AccountPage.tsx:36` (`AccountPage`)
- **Teste:** `apps/web/src/routes/settings/sumario.test.ts` (as quatro chaves não existem); `apps/web/src/routes/settings/SumarioDeConfiguracoes.test.tsx` (a aba não monta as quatro seções, nem para `owner`); `apps/web/src/routes/AccountPage.test.tsx` (a matriz, e o caso de falha no idioma); `apps/web/src/routes/configuracoes.orcamento.test.tsx` (a volta à aba não busca credencial); `apps/web/src/components/catalogo-com-busca.test.tsx` (sem atalho)
- **Origem:** AT-597 e AT-598 (EP-031), pedidos do dono de 22/10.

<a id="rn-912"></a>

### RN-912 — O modelo da área é uma caixa na linha do lead, em "Modelos por agente" {#rn-912}

- **Regra:** a seção "Modelo por área" deixou de existir. O padrão da área (RN-102, escopo `area` da RN-470) liga-se por uma caixa **só na linha do lead** de cada área (`dev-lead`, `qa`, `infra`): "Valer para a área X inteira (lead + subagentes)". O binding de área é um valor por área e não guarda o agente de origem, então a caixa em toda linha deixaria duas disputarem o valor. Marcada ⇔ o vigente do lead vem da área (`origin: 'area'`), lido do lote da RN-654, sem consulta nova. **Marcar** grava a área com o vigente do lead e o critério de roteamento dele (`PUT .../area-bindings/:area`) e DEPOIS apaga o binding próprio do lead (`DELETE .../agent-bindings/:lead`; copiar o deixaria para trás, RN-102). São duas chamadas e o desfecho é por passo (RN-469): se a área recusa (inclusive o 422 da RN-040) nada mudou e o toast traz a frase da api; se a área gravou e o DELETE falha, a tela diz que o padrão da área foi gravado e o modelo próprio do lead não foi removido (404 do DELETE conta como já removido). **Desmarcar** apaga a área (`DELETE .../area-bindings/:area`) e não grava nada no lead; 404 vira "já herdava". Com a caixa marcada, o seletor e o critério de roteamento do lead gravam a ÁREA. O agente com binding próprio vence a área (RN-470) e NÃO segue: a tela lista, com plural, os subagentes conhecidos nessa situação (recorte declarado, RN-180; os `dev-<modulo>` dinâmicos não entram e a tela diz isso) e não apaga a decisão deles. O "aplicar a todos" (RN-476) grava binding próprio nos 17 e, por isso, tira os subagentes do padrão da área; o aviso dele diz isso. **Papel:** a caixa e, enquanto marcada, o seletor do lead pedem `maintainer` (o mínimo do endpoint de área, RN-102), comparado por `roleAtLeast`; abaixo disso ficam inertes e o motivo é dito UMA vez em texto na legenda da seção (ADR 0064). As demais linhas seguem em `developer`. A caixa nasce desabilitada se o lead não tem vigente para copiar, e diz o motivo em texto na própria caixa (AT-601, chave `modelsSection.areaBox.needsModel`). Revisa a UI das RN-040, RN-102 e RN-470; a cascata, o escopo e os endpoints não mudam (sem ADR).
- **Onde:** `apps/web/src/routes/settings/ModelsSection.tsx:94` (`podeEditarArea`), `:432` (`areaDoLead`), `:446` (`handleMarcarArea`), `:486` (`handleDesmarcarArea`)
- **Teste:** `apps/web/src/routes/settings/ModelsSection.caixa-da-area.test.tsx` (AT-601: motivo sem vigente no lead); `apps/web/src/routes/ProjectSettingsTab.test.tsx` (marcar, a área recusando, FALHA PARCIAL, desmarcar com e sem 404, seletor do lead na área, não-seguidores, `developer` inerte); `apps/web/src/routes/settings/papel-na-tabela-de-agentes.test.tsx` (os dois mínimos); `bindings-em-lote.test.tsx` (lote único); `cascata.test.tsx`; `heranca.test.tsx`; `filtro-de-aptos.test.tsx` (RN-040); `preferencia-de-roteamento.test.tsx` (ADR 0166)
- **Origem:** AT-600 (EP-031), pedido do dono de 22/10.

<a id="rn-925"></a>

### RN-925 — Cada container tem página de detalhe com o estado registrado e o observado separados e as URLs declaradas {#rn-925}

- **Regra:** `/containers/$projectId` (carregada sob demanda) abre a partir de cada linha de `/containers`. Só lê o que já existe: a linha da visão geral (a [RN-486](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-486): registrado e observado nunca se fundem; projeto "nunca provisionado" tem texto próprio, a imagem/versão, os recursos, a postura de rede da decisão vigente e o modo de execução) e as URLs de `GET projects/:projectId/run-instructions`, que a tela diz serem declaradas pela Infra e não verificadas, nunca verdes ([RN-855](#rn-855)); sem declaração, texto próprio. A leitura da página polla no ritmo de projeto (15 s, [RN-632](parte-05.md#rn-632)), nunca nos 5 s da lista. Subir, parar e remover são o MESMO componente da lista (`AcoesDoContainer`), com as mesmas recusas locais em texto ([RN-521](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-521), [RN-574](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-574), [RN-610](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-610)) e o papel do endpoint por `roleAtLeast`.
- **Onde:** `apps/web/src/routes/ContainerDetalhePage.tsx:24` (`ContainerDetalhePage`), `apps/web/src/components/AcoesDoContainer.tsx:34` (`AcoesDoContainer`)
- **Teste:** `apps/web/src/routes/ContainerDetalhePage.test.tsx:92` (caminho feliz com ritmo de 15 s, nunca provisionado com URLs vazias, projeto fora da lista); `apps/web/src/routes/ContainersPage.test.tsx` cobre as ações extraídas
- **Origem:** AT-609 (EP-030), fatia da AT-608.

<a id="rn-931"></a>

### RN-931 — As telas de providers e do catálogo mostram só o que tem chave do TITULAR, com a cor do provider {#rn-931}

- **Regra:** "ativo" é o provider LOCAL ou o que tem chave do titular do workspace (RN-058), lida da rota da [RN-926](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-926). A tabela "O que cada provider sabe fazer" lista só os ativos, com o nome humano e a mesma cor do card de credencial (`COR_DO_PROVIDER`, fonte única) e uma linha dizendo quantos ficaram de fora e quais. O catálogo de modelos vira um painel com UMA ABA por provider ativo (o hub continua repartido por fabricante); busca, facetas e a barra de lote são globais e a seleção sobrevive à troca de aba. Provider SEM chave que ainda tem modelo ATIVO aparece como aba marcada "sem chave do titular", para dar para desativar o modelo (RN-043); os demais sem chave entram na linha "de fora" (RN-180). Carregando ou falhando a rota, mostra TODOS: "não sei" não é "não tem". Revisa o item 1 da [RN-694](parte-05.md#rn-694): o catálogo não tem mais os grupos Local, APIs diretas e Hubs, e a busca que não casa na aba nomeia as abas que casam. O relatório do sync segue com todos os providers.
- **Onde:** `apps/web/src/lib/models.ts:363` (`providerAtivo`), `apps/web/src/lib/models.ts:371` (`catalogoDoProvider`), `apps/web/src/components/ModelCatalogSection.tsx:132` (`useMemo`), `apps/web/src/routes/ProvidersPage.tsx:33` (`deFora`)
- **Teste:** `apps/web/src/routes/ProvidersPage.test.tsx:102` (só os com chave do titular, e a falha que mostra todos), `apps/web/src/components/ModelCatalogSection.test.tsx:399` (aba "sem chave" com modelo ativo; seleção entre abas; busca nomeia a aba que casa), `apps/web/src/lib/models.test.ts:126` (`providerAtivo`)
- **Origem:** AT-607 (EP-026), tela; a rota é a RN-926.

<a id="rn-939"></a>

### RN-939 — A página do container edita a rede só para `maintainer`, valida antes e recria por `container_recreate` {#rn-939}

- **Regra:** a seção "Rede" da página de detalhe lê `GET projects/:projectId/container/network` (sem poll, `staleTime` de configuração; `null` tem texto próprio) e salva num PUT só, por botão. O controle fica inerte abaixo de `maintainer` (papel efetivo, `roleAtLeast`) com o motivo dito uma vez em texto. O cliente espelha a régua da api (RN-932) só para poupar a ida e volta; a recusa `400 rede_invalida` aparece com o campo e a mensagem da api e `409 sem_sessao` tem texto próprio. A tela diz que a porta é publicada só em `127.0.0.1` e que a configuração só vale com o container recriado. "Aplicar e subir de novo" PROPÕE `container_recreate` (RN-934: teto absoluto, sempre pede aprovação humana) e fica inerte em `runner` ("runner depois"), sem container registrado, sem sessão e com rede editada e não salva. As portas publicadas que o daemon observa (`portasPublicadas`) saem como `http://127.0.0.1:<porta>` com a ressalva de que nada garante que algo escute (RN-468): sem sonda e nunca verde.
- **Onde:** `apps/web/src/components/RedeDoContainer.tsx:25` (`RedeDoContainer`), `apps/web/src/lib/rede-do-container.ts:30` (`validarRedeEmTexto`).
- **Teste:** `apps/web/src/components/RedeDoContainer.test.tsx` (rede nula, salvar, recusa no cliente, 400 com campo, 409, papel, `container_recreate`, `runner`, portas observadas).
- **Origem:** AT-608 (EP-030), ADR 0228.

<a id="rn-943"></a>

### RN-943 — O bloco de pendências do chat se chama "Pendências deste projeto"; só a aba Executores diz "de outras sessões" {#rn-943}

- **Regra:** refina a RN-626, a RN-825, a RN-826 e a RN-861. Dentro do bloco do chat moram cinco filas, e só aprovações e merges são filtradas por "outra sessão"; perguntas em aberto, PRs prontas e tarefas bloqueadas são do projeto inteiro (a pergunta da PRÓPRIA sessão aparece ali de propósito, porque o aviso do composer lê a mesma query). Por isso, com `filasDoChat` (o chat) o título é "Pendências deste projeto" (`pendencias.tituloDoProjeto`, nos quatro locales); com `filasDoChat={false}` (aba Executores, só aprovações e merges) o título segue "Pendências de outras sessões deste projeto". Nenhuma fila é filtrada, nenhum teto muda e o `data-testid` não muda.
- **Onde:** `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:370` (`tituloDoProjeto`).
- **Teste:** `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx` (pergunta da própria sessão: cabeçalho "Pendências deste projeto", sem "outras sessões"; `filasDoChat={false}` mantém o título antigo).
- **Origem:** AT-619 (EP-031).

<a id="rn-951"></a>

### RN-951 — O fio da Sessão acompanha SEMPRE a última mensagem {#rn-951}

- **Regra:** revê a [RN-173](parte-02.md#rn-173), o item 4 da [RN-751](#rn-751) e a [RN-836](#rn-836) (decisão do dono de 31/10). Cada evento ou ação nova no fio o leva à última mensagem, mesmo que a pessoa tenha rolado para cima: a guarda dos 120 px e a "intenção de estar no fim" saíram, e o botão "↓ N novas" (com o realce de aprovação) foi aposentado. O acompanhamento dispara por IDENTIDADE (`seq` do último evento e ids das ações, não pelo tamanho das listas, que não muda no teto de 200), pelo texto do streaming e por `ResizeObserver` no CONTEÚDO e no CONTAINER (faixa de atividade, composer e pendências mudam a altura). `?highlightEvent` segue levando ao evento citado na abertura, mas não desliga o acompanhamento: a primeira mudança depois o devolve ao fim. A rolagem é instantânea (`block: 'end'`) e o foco não se move. Entre duas mensagens a pessoa pode rolar e ler; a próxima a traz de volta.
- **Onde:** `apps/web/src/lib/session-rolagem.ts:20` (`identidadeDoFio`), `apps/web/src/lib/session-rolagem.ts:36` (`useRolagemDoFio`).
- **Teste:** `apps/web/src/lib/session-rolagem.test.tsx` (mensagem nova com a pessoa acima, `length` igual com `seq` novo, ação nova, container que encolhe, `highlightEvent`, rajada, streaming, sem conteúdo).
- **Origem:** AT-635 (EP-031).

<a id="rn-963"></a>

### RN-963 — O gasto tem página GLOBAL e aba do PROJETO, e o orçamento tem editor {#rn-963}

Revisa a [RN-212](parte-02.md#rn-212) no destino do botão "Definir orçamento" e convive com a [RN-060](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-060), a [RN-952](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-952), a [RN-953](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-953) e a [RN-954](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-954).

1. **Página global.** `/spend`, no menu global ao lado de Containers e Providers, serve todo papel: o `owner` vê o workspace inteiro (janela 30/90/180, por modelo, provider, projeto e ator), os orçamentos de todos os projetos e a fatura por chave (`CredentialSpendSection`, que saiu de Providers); quem não é `owner` vê só o PRÓPRIO consumo por projeto (`spend/me` do workspace) e nunca provider nem credencial.
2. **Aba do projeto.** A aba Gastos é SÓ do projeto: o `owner` lê `spend-report?projectId=` (com a quebra por sessão), o membro lê o total e o custo por agente e por área (`spend/team`) e, abaixo, o próprio consumo. O consumo do Criativo (`CriativoKpis`) passou a mostrar o total do projeto.
3. **Orçamento.** A aba traz o editor do teto (`PUT projects/:projectId/budget`, `maintainer` pela `roleAtLeast`); abaixo do papel o controle fica inerte e o motivo é dito em texto. O botão "Definir orçamento" do card do projeto abre `?tab=spend` (antes `?tab=settings`, onde nenhuma tela gravava o orçamento).
4. **Assinatura.** `assinaturaMicros` aparece num destaque separado; linha de modelo marcado `subscription` com custo zero mostra "assinatura — sem preço registrado", nunca "US$ 0".

- **Código:** `apps/web/src/components/SpendPaineis.tsx:153` (`GastoDoWorkspace`); `apps/web/src/components/SpendPaineis.tsx:354` (`GastoDoTimeNoProjeto`); `apps/web/src/routes/ProjectSpendTab.tsx:172` (`EditorDoOrcamento`); `apps/web/src/routes/Dashboard.tsx:98` (`onDefineBudget`)
- **Teste:** `apps/web/src/routes/SpendPage.test.tsx` (owner × não-owner, sem provider para quem não é owner); `apps/web/src/routes/ProjectSpendTab.test.tsx` (owner só do projeto, membro por agente e área, editor grava, teto inválido e papel baixo recusados)
- **Origem:** AT-632

<a id="rn-967"></a>

### RN-967 — A faixa do turno mostra o plano que o agente registrou no turno em curso {#rn-967}

- **Regra:** a faixa de atividade do turno (RN-460) mostra, acima dos passos, o último `agent.plan` do agente do turno com `seq` posterior à abertura dele (o último `agent.status: working`), derivado dos eventos JÁ carregados: nenhuma requisição nova (RN-632) e nenhum estado por token (RN-639). Ferramentas e plano seguem os padrões Tool e Plan; a fila de uma mensagem segue o Queue, com o cancelar inerte enquanto cancela (RN-673, não otimista).
- **Onde:** `apps/web/src/lib/plano-do-turno.ts:9` (`planoDoTurno`), `apps/web/src/components/TurnActivityStrip.tsx:47` (`TurnActivityStrip`).
- **Teste:** `apps/web/src/lib/plano-do-turno.test.ts`, `apps/web/src/components/ai-elements/passos.test.tsx`.
- **Origem:** AT-652 (EP-031).

<a id="rn-968"></a>

### RN-968 — O formulário de perguntas estruturadas é um questionário passo a passo {#rn-968}

- **Regra:** o formulário aberto de `chat.structured_question` (RN-162) é o Questionnaire do shadcn: uma pergunta por vez, com "Pergunta N de T", Anterior/Próxima e "Enviar respostas" no último passo (desabilitado até TODAS estarem respondidas, a régua da api). A lista (`select`) vira escolhas (radio) e a saída por texto livre (RN-171) é um campo AO LADO delas, sem sentinela: escrever no campo é a resposta e escolher uma opção descarta o texto; `allowOther: false` não tem o campo. `textarea` usa o `QuestionnaireInput` com `render` de textarea. O estado segue controlado pelo card, então o que viaja para a api é o mesmo `Record<id, texto>` (RN-712), a ordem do envio é a de sempre (RN-174, RN-578) e as respostas ficam na tela no 409 `sessao_encerrada` (RN-581). Enter que confirma o IME não avança nem envia (RN-830). O cartão `respondida` e o painel de pendências (`artifact.open_question`) não mudam. Revisa a apresentação da RN-162/RN-171, não a regra.
- **Onde:** `apps/web/src/routes/StructuredQuestionCard.tsx:73` (`StructuredQuestionCard`), `apps/web/src/components/shadcn/questionnaire.tsx:8` (`Questionnaire`).
- **Teste:** `apps/web/src/routes/SessionPage.perguntas-estruturadas.test.tsx`, `apps/web/src/components/shadcn/registro.test.tsx`.
- **Origem:** AT-653 (EP-031).

<a id="rn-970"></a>

### RN-970 — Na árvore do time, cada delegação de um lead aparece como subagente {#rn-970}

- **Regra:** na árvore do time (Visão geral/Executores), cada delegação gravada por um lead (`delegation.*`) aparece no ramo dele como subagente — nome, desfecho (efetivada/falhou/dispensada, falha com a origem) e se o subagente está trabalhando agora —, derivada dos eventos já carregados, sem requisição nova; delegação fora da janela não aparece. O ramo próprio do subagente continua.
- **Onde:** `apps/web/src/lib/timeline-tree.ts:293` (`subagenteDoMarco`), `apps/web/src/components/AgentTimelineTree.tsx:51` (`AgentTimelineTree`).
- **Teste:** `apps/web/src/lib/timeline-tree.test.ts`, `apps/web/src/components/ai-elements/passos.test.tsx`.
- **Origem:** AT-655 (EP-031).

<a id="rn-971"></a>

### RN-971 — A paleta de comandos Ctrl+K/⌘K busca projetos, sessões e ações só do que já está em memória {#rn-971}

- **Regra:** Ctrl+K (⌘K no macOS) abre a paleta de qualquer tela autenticada, menos com o foco no terminal xterm, durante composição de IME (RN-830) ou com o evento já tratado. Ela lista projetos, abas do projeto aberto, a sessão mais recente de cada projeto, as sessões do projeto aberto que já estão no cache e as ações da sidebar (novo projeto, tema, gastos, containers, providers, conta, sair), lendo SÓ o que o Shell já tem e o cache do TanStack Query: abrir, filtrar e fechar a paleta não faz requisição (RN-632). O grupo de sessões diz que é recorte (RN-180). Sem dependência nova: `Autocomplete` do Base UI dentro do `Dialog`, carregada por `React.lazy`.
- **Onde:** `apps/web/src/lib/paleta-de-comandos.ts:33` (`itensDaPaleta`), `apps/web/src/lib/paleta-de-comandos.ts:70` (`deveAbrirPaleta`), `apps/web/src/components/PaletaDeComandos.tsx:38` (`PaletaDeComandos`).
- **Teste:** `apps/web/src/lib/paleta-de-comandos.test.ts`, `apps/web/src/components/PaletaDeComandos.test.tsx` (zero `fetch`).
- **Origem:** AT-656 (EP-031).

<a id="rn-972"></a>

### RN-972 — O código no chat e na aba Código é realçado pelo shiki {#rn-972}

- **Regra:** o bloco de código do chat (`CodeFence`, agora o Code Block do shadcn com botão Copiar) e o arquivo da aba Código são realçados pelo shiki com o tema próprio dos `--syntax-*` (sem hex; os dois temas saem do `data-theme` e o contraste dos oito papéis segue medido, RN-185). O shiki é carregado sob demanda (`import()` dinâmico, motor de regex em JS, gramática por linguagem) e fica fora do JS inicial; enquanto carrega, e para linguagem sem gramática, vale o realce por regex da RN-158. Só o tokenizador troca: o recolher de 20/8 linhas (RN-712), a virtualização e o minimapa da aba Código (RN-239..242) não mudam. Copiar diz "Copiado" por 2 s e a falha da área de transferência vira texto, nunca silêncio.
- **Onde:** `apps/web/src/lib/realce-shiki.ts:61` (`carregarRealce`), `apps/web/src/lib/tema-shiki-brabo.ts:19` (`temaShikiBrabo`).
- **Teste:** `apps/web/src/lib/realce-shiki.test.ts`.
- **Origem:** AT-657 (EP-031).

<a id="rn-973"></a>

### RN-973 — A série diária do gasto é desenhada pelo Chart, carregado sob demanda, e também existe como tabela {#rn-973}

Por decisão do dono (31/10, AT-636 decisão 4), a página de Gastos ganha o Chart do shadcn (`recharts@3.8.0`, ADR 0234), sem mexer em quem vê o quê ([RN-952](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-952), [RN-953](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-953), [RN-963](#rn-963)).

1. **Só as três séries diárias** (owner, não-owner e membro) viram gráfico: barras (soma por dia), eixo em US$, tooltip com dia, US$ e chamadas, cor `var(--accent)` pelo `ChartConfig` (nenhuma variável nova). Os rankings seguem barras com o número ao lado, e o empilhado por provider segue fora ([RN-211](parte-02.md#rn-211)).
2. **Carga sob demanda.** O gráfico mora em `GraficoDeGastoPorDia.tsx`, carregado por `React.lazy` em `GastoPorDia.tsx`, com o SVG de `BarrasPorDia` como fallback. `SpendCharts.tsx` não importa o recharts, porque a aba Sessões importa o `Destaque` dali.
3. **Recorte dito e alternativa em texto** ([RN-180](parte-02.md#rn-180)): o título diz a janela, a figura tem `aria-label` igual a ele, e `<details>` "Ver como tabela" traz dia, gasto e chamadas. Zero requisição nova ([RN-632](parte-05.md#rn-632)).

- **Código:** `apps/web/src/components/GraficoDeGastoPorDia.tsx:13` (`GraficoDeGastoPorDia`); `apps/web/src/components/GastoPorDia.tsx:16` (`GastoPorDia`)
- **Teste:** `apps/web/src/components/GraficoDeGastoPorDia.test.tsx` (figura com janela, tabela com os dias, série vazia)
- **Origem:** AT-658

<a id="rn-974"></a>

### RN-974 — O fio mostra os passos do turno encerrado, recolhidos, sem os args {#rn-974}

- **Regra:** antes de cada `agent.response` o fio mostra um `ChainOfThought` recolhido, "Passos do turno · N passos", com um `Tool` por `tool.result` do MESMO ator desde a resposta anterior: nome, estado (ok ou falha) e o `resultado` (RN-589), com aviso quando há `resultadoTotal` (corte de 2.000 caracteres). Quando o `tool.result` não traz `resultado` mas traz `result` (formato do `ToolLoop` dos dev agents e dos gates, AT-718), a saída é esse `result` (objeto vira JSON), com o MESMO teto de 2.000 caracteres e o MESMO aviso de corte; o evento gravado não muda. Nunca os `args` (RN-096). Turno sem ferramenta não ganha bloco. O bloco é só do turno ENCERRADO (a faixa narra o turno em curso, RN-460), vai junto da resposta e não conta como mensagem no corte do histórico recolhido (RN-644); lê só a janela de eventos já carregada (RN-180). AT-803: um evento gera várias entradas do fio (passos, raciocínio, consultado, bolhas), todas com o MESMO `seq`; por isso cada entrada tem a chave própria `TimelineEntry.chave` (`<id do evento>:<n>`, `acao-<id>`, `leva-promocoes`), e é ela, nunca o `seq`, a `key` React do fio e dos grupos. O `seq` segue sendo só o eixo de ORDEM (RN-155), do corte e do colapso (RN-138); com chave repetida o React deixava nós órfãos a cada poll e a aba travava.
- **Onde:** `apps/web/src/routes/session-fio.tsx:143` (`entradaSimples`), `apps/web/src/lib/passos-do-turno.ts:16` (`passosDoTurno`), `apps/web/src/routes/session-timeline-montagem.tsx:973` (`passosDoTurno`), `apps/web/src/components/ai-elements/passos-encerrados.tsx:8` (`PassosEncerrados`).
- **Teste:** `apps/web/src/components/ai-elements/passos-encerrados.test.tsx`, `apps/web/src/routes/SessionFio.chaves.test.tsx` (chave única; o turno não se repete depois de vários polls).
- **Origem:** AT-675 (EP-031); AT-803 (EP-031).

<a id="rn-975"></a>

### RN-975 — O painel de pendências do chat é uma faixa de abas, e cada fila pagina de 3 em 3 {#rn-975}

- **Regra:** o painel "Pendências deste projeto" tem uma faixa de abas, uma por fila (perguntas em aberto, aprovações, merges de PR, PRs prontas, tarefas bloqueadas), que SÓ aparece com contagem maior que zero e traz o total da PRÓPRIA fila, nunca somado (RN-467). Nenhuma aba nasce aberta; clicar abre a fila, clicar de novo fecha (`aria-pressed`). Exceção (AT-810, [RN-1063](parte-07.md#rn-1063)): PR que entra na fila `prontas` abre essa aba sozinha quando nenhuma está aberta. O conteúdo das abas fechadas continua montado, só escondido (`hidden`): o "Responder perguntas" do composer abre a aba Perguntas e rola até ela (`rolarAteAsPerguntas`), e o cartão de merge segue registrado no fio (RN-843). Dentro da aba, a fila desenha no máximo 3 itens (`ITENS_POR_PAGINA_DA_FILA`), com "anterior / x–y de N / próxima" no fim, só com mais de uma página (RN-178), a faixa em `role="status"` (RN-180) e o `aria-label` nomeando a fila. A página é ajustada em render: decidir o último item da última página a faz voltar. O teto antigo de 20 cards compartilhado e a frase "as demais estão na aba Aprovações" saem (revisam a RN-626/AT-318); a paginação é sobre a lista já lida, sem query nova (RN-579/632). As perguntas respondidas (RN-884) ficam fora da paginação.
- **Onde:** `apps/web/src/lib/paginacao-de-fila.ts:16` (`paginar`), `apps/web/src/components/PaginadorDaFila.tsx:11` (`PaginadorDaFila`), `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:76` (`PendenciasDeOutrasSessoes`).
- **Teste:** `apps/web/src/lib/paginacao-de-fila.test.ts`, `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`, `apps/web/src/components/PerguntasEmAberto.test.tsx`.
- **Origem:** AT-680 (EP-031).

<a id="rn-976"></a>

### RN-976 — As ações de passo da conversa são sugestões acima do destinatário, com o mesmo predicado e o mesmo endpoint, e a inércia é dita em texto {#rn-976}

- **Regra:** "Estou pronto", "Confirmar arquitetura pronta", "Responder N perguntas em aberto" e "Endereçar handoff a outro agente…" saem de dentro e de cima do composer e viram uma fileira de sugestões fixa, ACIMA da linha "Para". O predicado de cada uma e o handler (e o endpoint) são os de antes (RN-142, RN-657, RN-672, RN-861, RN-712); a caixa de mensagem fica sozinha na linha e ocupa a largura do fio (780px, antes ~448px). O clique só chama o handler da página, nunca escreve no campo (RN-882), e nada é clicado sozinho; merge nunca vira sugestão. Ação inerte diz o motivo em TEXTO visível, nunca em `title` (RN-102, ADR 0064); as de prontidão e o handoff manual ficam inertes sem o papel `developer`, o mínimo do endpoint, com o motivo de papel dito uma vez. A ordem no DOM (a fileira antes do "Para", e o Enviar como primeiro botão do composer) é contrato do E2E `turno-pelo-canal`.
- **Onde:** `apps/web/src/routes/SessionComposer.tsx:150` (`acoes`), `apps/web/src/components/ai-elements/suggestion.tsx:50` (`SugestoesDeAcao`).
- **Teste:** `apps/web/src/routes/SessionPage.sugestoes-no-chat.test.tsx`, `apps/web/src/components/ai-elements/suggestion.test.tsx`.
- **Origem:** AT-681 (EP-031).

<a id="rn-977"></a>

### RN-977 — O fio da Sessão para de seguir quando a pessoa sobe e oferece "Ir ao fim" {#rn-977}

- **Regra:** revisa a [RN-951](#rn-951), que não é editada (decisão do dono de 02/11, AT-683). O fio acompanha a última mensagem — por identidade de evento/ação, texto do streaming e `ResizeObserver` — SÓ enquanto a pessoa está no fim. Rolou para mais de 80 px do fim: o acompanhamento PAUSA (nenhum gatilho rola) e aparece o botão "Ir ao fim" (`afastado`); o clique, ou voltar ao fim rolando à mão, retoma e rola ao fim. Rolagem instantânea (`block: 'end'`), foco intocado, `?highlightEvent` como na RN-951. O texto por token continua fora do estado da página (RN-639): `SessionPage.streaming-isolado.test.tsx` segue verde.
- **Onde:** `apps/web/src/lib/session-rolagem.ts:36` (`useRolagemDoFio`), `apps/web/src/components/ai-elements/conversation.tsx:10` (`ConversationScrollButton`).
- **Teste:** `apps/web/src/lib/session-rolagem.test.tsx` (para ao subir, mostra o botão, o clique retoma; perto do fim não pausa), `apps/web/src/routes/SessionPage.streaming-isolado.test.tsx`.
- **Origem:** AT-683 (EP-031).
