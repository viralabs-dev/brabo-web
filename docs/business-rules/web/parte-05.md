---
id: rn-web-parte-05
title: 'Regras de negócio — Web — parte 5 (desde RN-626)'
sidebar_label: 'Web — parte 5 (desde RN-626)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 5 (desde RN-626)

## Decidir no chat, onde o dono está (RN-626)

<a id="rn-626"></a>

### RN-626 — O chat da sessão decide o que os agentes propuseram noutra sessão, mostra o turno que estava em curso e propõe o merge — sem mudar teto nenhum {#rn-626}

O uso real de 2026-09-29 mediu o custo de o dono conversar numa sessão e os dev
agents proporem noutra: as aprovações deles nunca apareciam onde ele estava, 45
de 173 cliques em "Sempre permitir" voltaram 409 (o card continuava clicável
depois de a ação já ter saído de `pending`), e reabrir a sessão com um turno em
curso devolvia o composer livre e o 409. As quatro correções são de TELA — a
api, o engine e todo teto ficam como estão.

1. **O card fica inerte e diz a frase da api (AT-256).** `ApprovalCard` segura
   os botões enquanto a decisão está em voo (o duplo clique era um 409 certo) e,
   quando a chamada devolve promessa que rejeita, mostra a frase que a api
   mandou NO card — nunca um toast genérico. Um 409 (a ação já não está
   `pending`) deixa os botões inertes com o motivo em texto até a lista trocar o
   card pela linha de desfecho. Quem chama devolve a promessa e refaz a lista
   MESMO na recusa (`finally`): é UMA invalidação por clique, sem poll novo, e a
   invalidação usa o canal e o orçamento da [RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579).
2. **Reabrir a sessão retoma o turno do log (AT-268).** O estado do turno da tela
   é `useState` local e se perdia ao sair. Na primeira leitura dos eventos de
   uma sessão `active`, `turnoEmCursoNoLog` olha o `agent.status` persistido
   mais recente de cada agente (a mesma leitura de `turnoTerminouNoLog`, da
   [RN-578](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-578)); o que estiver `working` reabre a faixa e trava o composer
   pelas mesmas entradas de um turno aceito (`iniciarTurnoDoAgente` +
   `acompanharTurnoPeloLog`), e a leitura da cauda do log o fecha. Roda UMA vez
   por sessão montada (um efeito recorrente rearmaria a faixa com o `working`
   antigo ainda no cache). O `working` que o reinício do engine deixou é fechado
   por evento novo no boot ([RN-586](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-586)), então o que sobra é turno vivo.
   **Não enfileira mensagem:** mensagem com turno em curso segue recusada com
   409 nomeado — a fila é decisão pendente do dono (AT-267).
3. **As pendências de OUTRAS sessões do projeto aparecem no chat (AT-265).**
   `PendenciasDeOutrasSessoes` lê `GET /projects/:id/actions?status=pending`
   (o mesmo endpoint da aba PRs e do painel "precisa de você") e desenha as que
   NÃO nasceram nesta sessão — as desta o fio já decide. É ATALHO e nunca
   substituto ([RN-467](parte-03.md#rn-467)): o MESMO `ApprovalCard`, os mesmos endpoints,
   com o `sessionId` que a própria ação carrega; `onActivateAutoMode` fica de
   fora (é política, não decisão). As duas filas — aprovações e merges de PR —
   têm título e contagem PRÓPRIOS e nunca são somadas, e cada linha diz a sessão
   de origem. O desenho tem teto de 20 cards, e o excedente é dito ("Mostrando N
   de M"): recorte declarado, como na [RN-180](parte-02.md#rn-180). O poll é o da sessão
   (5 s com o canal caído, o fallback de 15 s com ele vivo — `intervaloDaSessao`),
   porque o canal da sessão não avisa escrita de outra.
4. **"Mergear" na linha da PR (AT-266, AT-753 UX-2).** Na linha de uma PR pronta e sob
   o card de um `pr_open` executado (só quando o evento `action.pr_open` traz o id da
   PR e não há `git_merge` vivo — pendente, aprovado ou auto-aprovado — para ela), o
   botão não age: abre a confirmação NA MESMA LINHA ("Mergear #6 em dev?
   Confirmar / Cancelar"). Confirmar PROPÕE o `git_merge` (ator `user`, nesta sessão)
   e o APROVA no mesmo gesto, pelos mesmos dois endpoints da aba PRs e do card, então
   a proposta e a aprovação ficam no log. **A confirmação é do humano** — o merge em
   branch protegida continua `require_approval` incondicional
   ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418)), sem auto-aprovar, sem "sempre permitir", sem o modo
   automático; o clique em Confirmar É a aprovação. O desfecho aparece na linha:
   "Mergeada", ou a causa da falha (a primeira frase de `error` mais os
   `conflictingFiles` de um `GitActionFailureResult`). As recusas da api (PR já
   mergeada, merge já proposto — [RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)) chegam ao dono como a frase
   da api; gate pendente não é recusa, é aviso em texto ao lado do botão. Merge
   proposto por agente mantém o `ApprovalCard`.
5. **O papel é o do ENDPOINT, e a lacuna é declarada.** Decidir ação e propor
   ação pedem `developer` (`actions.controller.ts`); a tela usa `roleAtLeast`
   sobre o papel de WORKSPACE, porque a Sessão não busca `project_members` — a
   mesma lacuna única da [RN-471](parte-03.md#rn-471), aqui declarada e não fechada. Quem não
   alcança VÊ a pendência e o botão, com os controles inertes e o motivo em
   texto (`bloqueio` do `ApprovalCard`): o que se tira é o controle, nunca a
   informação.

6. **O que sai de uma fila diz que saiu (AT-753 UX-7), e task bloqueada tem título
   curto (UX-9).** `saidasDaFila` (`apps/web/src/lib/saidas-da-fila.ts`) compara os ids
   da leitura anterior com os da atual, por fila, e o bloco mostra uma linha
   `role="status"` dispensável ("Saiu da fila: 1 PR pronta"); perguntas respondidas
   nesta tela ficam de fora porque têm retorno próprio. O título de uma task bloqueada
   é a parte do `blockedReason` antes do primeiro " — " (decisão P4, só no web); o resto
   é o diagnóstico, num `Disclosure` fechado.

**O que esta regra NÃO fecha, declarado:** (a) se a chamada de aprovação falha depois
de a proposta ter sido feita, a proposta fica pendente e a linha a mostra como o card de sempre;
(b) a retomada do turno lê a janela dos eventos já carregada, e um `agent.status`
fora dela não é visto (não saber não é "está trabalhando"); (c) a lista de
pendências de outras sessões tem o teto de 20 cards, e o resto continua na aba
Aprovações; (d) as pendências de arquitetura e as hipóteses do Psicólogo
continuam SEM decisão inline (não há `ApprovalCard` para elas).

- **Código:** `apps/web/src/components/ApprovalCard.tsx:248` (`decidir`, a
  decisão em voo e a recusa no card); `apps/web/src/lib/session-turno.ts:59`
  (`turnoEmCursoNoLog`), `:536` (`useRetomarTurnoDoLog`);
  `apps/web/src/lib/pendencias-do-projeto.ts:24` (`usePendenciasDoProjeto`),
  `:56` (`separarPendenciasDeOutrasSessoes`);
  `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:76`
  (`PendenciasDeOutrasSessoes`); `apps/web/src/routes/MergearNoChat.helpers.ts:14`
  (`prAbertaDaAcao`), `:42` (`jaHaMergeDaPr`), `apps/web/src/routes/MergearNoChat.tsx:55` (`MergearNoChat`);
  `apps/web/src/routes/SessionPage.tsx:144` (`podeDecidir`), `:266`
  (`useRetomarTurnoDoLog`), `:767` (`PendenciasDeOutrasSessoes`)
- **Teste:** `apps/web/src/components/ApprovalCard.decisao-em-voo.test.tsx:37`
  (duplo clique), `:52` (409 no card e botões inertes — caso de falha), `:67`
  (erro que não é 409 devolve os botões); `apps/web/src/lib/turno-em-curso-no-log.test.ts:18`
  (working), `:22` (idle e awaiting_approval fecham), `:38` (sem status na
  janela — caso de falha); `apps/web/src/routes/SessionPage.retomar-turno.test.tsx:159`
  (a tela retoma e o log destrava), `:182` (idle não inventa turno — caso de
  falha); `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx:71`
  (filas separadas, sessionId da ação), `:99` (papel abaixo de developer — caso
  de falha), `:109` (409 no card), `:126` (recorte);
  `apps/web/src/routes/MergearNoChat.test.tsx:62` (PR do evento), `:75`
  (dedupe), `:100` (propõe como usuário, sem aprovar), `:121` (recusa da api —
  caso de falha), `:134` (papel — caso de falha)
- **Origem:** AT-256, AT-268, AT-265, AT-266 e AT-753 (UX-2, UX-7, UX-9), da análise do uso real de
  2026-09-29 (itens 4, 5 e 10a), rodada 27, lane web-sessao

<a id="rn-631"></a>

### RN-631 — O destinatário do chat é escolhido e visível, e a oferta de handoff é casada pelo `handoffId` {#rn-631}

O destinatário da mensagem do composer era DERIVADO: "o `agent.activated` mais
recente dentro da janela de 200 eventos" (achado 9-fix). Era um destinatário
padrão do lado da TELA — a classe de defeito que a [RN-584](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-584) fechou no
engine — e era INVISÍVEL: o composer não dizia a quem a mensagem ia, e aceitar
um handoff nesta tela não mudava nada além do log. No uso real de 29/09 a
sessão teve `handoff.accepted` para a Infra e depois para o Arquiteto, e o "oi"
do usuário foi respondido pelo Arquiteto sem que a tela avisasse. E o card de
aceite casava a oferta com o evento pelo par ATOR/`toAgent` (`e.actor.id ===
offeredHandoff.fromAgent`), embora o `handoff.offered` carregue o `handoffId`
desde sempre (AT-251).

**A regra:**

1. **As OPÇÕES** são os agentes que conversam (`AGENTES_DE_CHAT`) e que já
   estão na sessão: `agent.activated` na janela, `roster.activatedAgents` do
   resumo do projeto ([RN-630](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-630), sessão INTEIRA, só com o resumo da
   MESMA sessão, no molde da [RN-568](parte-04.md#rn-568)) ou handoff ACEITO (a lista de
   handoffs não tem janela). Os dois últimos termos são a [RN-180](parte-02.md#rn-180): o
   agente não some do seletor porque a ativação saiu dos 200 eventos. Na sessão
   criativa o Criativo é opção antes de ativado, porque a primeira mensagem o
   ativa (achado 3).
2. **O destinatário é o que a pessoa ESCOLHEU** — no seletor "Para" do
   composer, ou aceitando um handoff NESTA tela (o gesto de chamar aquele
   agente; aceite que falha não troca nada). Nada do log escolhe por ela: um
   aceite feito em outra aba ou por outro caminho só acrescenta uma opção.
3. **Opção ÚNICA é o destinatário, e o composer a nomeia antes do envio.** Não
   é um padrão no sentido da [RN-584](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-584) — não há outro agente a quem a
   mensagem pudesse ir.
4. **Duas ou mais opções e nenhuma escolha válida: sem destinatário.** O
   "Enviar" (e o Enter) fica travado e a tela diz em TEXTO que é preciso
   escolher — nunca "a mais recente". Zero opções é o chat da sessão sem agente
   (SSE), e a tela também o diz. **Revisado pela [RN-682](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-682):** zero
   opções também trava o envio — a consultiva sem agente pede um agente, e o
   SSE ao modelo cru deixou de ser chamado pela tela.
5. **A escolha é lembrada por sessão no `localStorage`** — conforto de quem vê
   (sem armazenamento a tela só volta a pedir a escolha), nunca estado do
   produto.
6. **"Parar" para o agente DO TURNO** (`turnoAgentRef`, `streamingAgent`,
   `statusAgent`), e só na falta dele o destinatário: trocar o seletor no meio
   do turno de outro agente não pode parar o errado. O modelo exibido na topbar
   segue o destinatário.
7. **A oferta é casada pelo `handoffId` do payload**, nunca pelo ator: cada
   `handoff.offered` é o card da oferta dele, sem par para confundir nem "mais
   recente" para escolher. As ofertas a agente já ativado (janela OU
   `roster.activatedAgents`) não voltam a ser aceitáveis.

8. **Toda oferta pendente é acionável, e nenhuma esconde outra** (AT-253). O
   card elegia UMA oferta (`handoffs.find`, a pendente mais antiga), e o
   handoff MANUAL ([ADR 0109](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0109-handoff-manual-a-agente-a-escolha.md),
   [RN-441](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-441)) — gravado com a PESSOA como ator, e por isso nunca
   casado pelo ator — ficava sem "Aceitar" e escondia as ofertas seguintes.
   Agora cada oferta pendente a um agente que conversa (fora a da Infra, que
   tem card próprio, [RN-499](parte-04.md#rn-499)) tem o botão no evento dela; duas
   pendentes ao MESMO agente dão um botão só, o da mais recente, e aceitá-la
   tira a outra pelo `activeFor`. A pílula do handoff manual diz "Handoff
   manual" em vez do id da pessoa.
9. **"Já está na sessão" se lê de fontes SEM janela escopadas à sessão PEDIDA**
   (revisão do PR #759). O `roster.activatedAgents` do resumo é da sessão MAIS
   RECENTE do projeto, e ativar a execução CRIA uma sessão nova que passa a ser
   ela: a sessão do chat perdia a fonte inteira e voltava a depender da janela
   de 200. A soma agora tem TRÊS fontes — o resumo, só quando é desta sessão; os
   handoffs DESTA sessão (quem recebeu um aceito e quem OFERECEU um, que estava
   nela); e o gasto por agente DESTA sessão (`GET .../token-usage`, agregado sem
   janela: agente com linha ali rodou turno, e só roda turno quem foi ativado).
   Cada fonte só corrige falso negativo, e o gasto é prova de PRESENÇA, nunca de
   ausência. **Lacuna declarada:** agente ativado por `start` direto, sem
   handoff, que nunca rodou turno, numa sessão que já não é a mais recente,
   continua dependendo da janela — e quem tem papel abaixo de `developer` (o
   mínimo da rota de gasto) fica sem a terceira fonte. Fechar pede o agregado
   de ativação POR SESSÃO na api; não foi feito aqui.
10. **Oferta pendente cujo evento saiu da janela ganha botão na faixa fixa
    acima do composer** (revisão do PR #759). O card acionável pertence ao
    `handoff.offered`, e a lista de handoffs não tem janela: numa sessão longa a
    oferta seguia `offered` e sem botão em lugar nenhum. O critério é o CORTE,
    não a ausência — a oferta é mais antiga que o evento mais antigo da janela
    (uma oferta recém-criada cujo evento ainda não chegou não pisca na faixa), e
    janela vazia não afirma corte. A faixa tem só o aceite; o atalho "Ativar
    execução" do card do Dev Lead fica no fio.

A guarda da [RN-584](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-584) (`scripts/ci/destinos-do-composer.spec.ts`)
passa a ler `DESTINATARIO_DA_SESSAO_CRIATIVA` em vez do literal de
`SessionPage.tsx`: todo destino que o composer pode dar continua tendo
cláusula própria no engine. Nenhuma mudança de api nem de engine.

- **Onde:** `apps/web/src/lib/session-destinatario.ts:228` (`agentesEmConversa`),
  `:255` (`resolverDestinatario`), `:290` (`useDestinatarioDoChat`), `:116`
  (`useAtivadosNaSessaoInteira`), `:141` (`ativadosSemJanela`);
  `apps/web/src/routes/SessionComposer.tsx:368` (`destinatarioRow`), `:266`
  (`ofertasForaDaJanela`); `apps/web/src/routes/SessionPage.tsx:342`
  (`aceitarHandoff`); `apps/web/src/routes/session-timeline-montagem.tsx:584`
  (`handoffIdDoEvento`), `:592` (`origem`); `apps/web/src/lib/session-handoffs.ts:68`
  (`activeFor`), `:120` (`ofertasAcionaveis`), `:142` (`ofertasForaDaJanela`)
- **Teste:** `apps/web/src/routes/SessionPage.destinatario-do-chat.test.tsx`
  (escolha → envio ao escolhido; dois agentes sem escolha não enviam e dizem
  por quê; opção única; handoff aceito fora da janela; resumo da mesma sessão
  e de outra; aceite que troca e aceite que falha; escolha lembrada; sessão sem
  agente; sessão de execução mais recente com a ativação lida dos handoffs e
  do gasto desta sessão, e o gasto recusado; oferta fora da janela na faixa, e
  oferta na janela ou mais nova que ela fora dela),
  `apps/web/src/lib/session-destinatario.test.ts` (`ativadosSemJanela`),
  `apps/web/src/routes/SessionPage.handoff-inline-e-links.test.tsx` (oferta
  antiga de OUTRO `handoffId` fica muda),
  `apps/web/src/routes/SessionPage.handoff-manual.test.tsx` (o manual ganha
  "Aceitar"; o manual pendente não esconde a oferta seguinte; duas ao mesmo
  agente viram um botão)
- **Origem:** AT-251, AT-253

<a id="rn-632"></a>

### RN-632 — Leitura de PROJETO polla no ritmo de projeto, e toda tela que ouve o canal da sessão invalida pela MESMA janela {#rn-632}

O uso real de 29/09 bateu o teto de 300 req/min do usuário ([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579))
com duas abas abertas: 192 × 429 às 07:14, 106 deles em
`GET /projects/:id/sessions` e 20 em `GET /projects/:id`, e três cliques de
`approve_always` recusados no meio (AT-278). A RN-579 tinha posto sob o canal
as leituras da tela de SESSÃO; as de PROJETO e as outras telas que ouvem o
canal ficaram de fora. O teto NÃO muda: o que cai é o pedido.

**A regra:**

1. **Leitura de projeto que nenhum canal avisa polla a 15s**
   (`INTERVALO_DO_PROJETO_MS`), INCONDICIONAL. O canal `session:<id>` só avisa
   escritas da própria sessão; a lista de sessões do projeto e os contadores do
   trilho (aprovações da sessão mais recente, merges pendentes do projeto,
   histórias a promover, pendências de arquitetura, hipóteses) mudam por escrita
   de QUALQUER sessão — não há aviso para esperar, então o mecanismo é poll
   longo, no mesmo fallback que a RN-579 já aceita para a sessão. Vale para
   `useProjectSessions`/`useLatestSession` (eram 5s), para os cinco contadores
   da moldura `ProjectPage` e para a arquitetura da aba Executores. A aba que
   mostra o dado como ASSUNTO (Backlog, Arquitetura, PRs) mantém o poll dela, e
   o observador mais rápido dita o ritmo da chave. Quem escreve nesta aba
   continua invalidando a chave na hora.
2. **Quem só precisa do dado no clique não polla.** Cada linha de
   `/containers` lê a sessão mais recente do seu projeto para PROPOR
   parar/remover/subir; em poll de 5s eram 12 req/min POR PROJETO — nove
   projetos, 108/min só dessa página, o número que casa com os 106 do log.
   `useLatestSession(projectId, false)`: montagem e foco da janela bastam.
3. **Toda tela que ouve o canal passa por `criarInvalidadorDoCanal`.** As abas
   Executores e Visão geral invalidavam os eventos a CADA `event.appended`,
   sem janela: um dev agent em rajada (10 avisos/s) fazia 630 GET de eventos
   por minuto só na aba Executores. Agora as duas usam o MESMO invalidador da
   tela de Sessão (janela por alvo, o TIPO decide o alvo), e ganham de brinde o
   que faltava: a proposta de ação do dev agent invalida as ações na hora, em
   vez de esperar o fallback de 15s. A Visão geral pede o backlog a cada aviso
   (as tasks bloqueadas vêm dele) pelo parâmetro `extras`, com a mesma janela.
4. **A espera pelo runner para quando acaba.** `EsperaDoRunner` só parava a
   sonda de `GET /projects/:id` (3s) no TETO; confirmada a conexão, o efeito do
   teto saía cedo e a sonda seguia para sempre — 20 req/min enquanto o painel
   estivesse na tela, e, sendo o observador mais rápido de `['project', id]`,
   arrastando a chave inteira da página. Agora para no teto OU na confirmação.

**Números** (`duas-abas.orcamento.test.tsx`, as telas de verdade — `Shell`,
`SessionPage`, `ProjectPage` na aba Executores, `ContainersPage` — sobre um
`fetch` que conta por rota; cada aba medida sozinha, porque duas abas são dois
contextos JS, e somadas; req/min, `dev` → esta regra):

| Cenário | Antes | Depois |
|---|---|---|
| chat da sessão + Executores, canal vivo | 70 + 138 = 208 | 70 + 72 = 142 |
| idem, dev agent em rajada (10 avisos/s) | 70 + 764 = 834 | 70 + 97 = 167 |
| idem, canal que nunca conecta | 155 + 186 = 341 | 155 + 120 = 275 |
| `/containers` com 9 projetos | 132 (108 de `/sessions`) | 24 |

**O que esta regra NÃO fecha:** com o canal CAÍDO nas duas abas, 275/min ainda
é perto do teto — a tela de Sessão volta aos 3s de sempre (RN-579: nunca pior
que era), e 25 req/min de folga somem com uma rajada de cliques. O `Shell`
segue pollando `projects-summary` e `execution/session` a 5s e, na aba do chat,
os eventos da sessão de EXECUÇÃO a 3s (a aba não tem o canal dela) — 44 das 70
req/min da aba do chat. Uma lista de sessões criada noutra aba aparece aqui em
até 15s (eram 5s). O número do incidente foi CASADO, não reproduzido: o log
não dizia quais abas estavam abertas, e a leitura de que `/containers` estava
numa delas é inferência pelos 106 ≈ 9 × 12.

- **Código:** `apps/web/src/lib/canal-vivo.ts:54` (`INTERVALO_DO_PROJETO_MS`),
  `:255` (`aoEvento`, os `extras`); `apps/web/src/lib/hooks.ts:127`
  (`useProjectSessions`), `:158` (`useLatestSession`);
  `apps/web/src/routes/ProjectPage.tsx:77` (os contadores do trilho);
  `apps/web/src/components/AcoesDoContainer.tsx:46` (`useLatestSession`, sem poll);
  `apps/web/src/routes/ProjectExecutorsTab.tsx:207` (`invalidador`),
  `apps/web/src/routes/ProjectOverviewTab.tsx:206` (`invalidador`);
  `apps/web/src/components/EsperaDoRunner.tsx:73` (`confirmadoPor`)
- **Teste:** `apps/web/src/routes/duas-abas.orcamento.test.tsx` (as duas abas
  com canal vivo, com rajada, com o canal que nunca conecta, e `/containers`;
  os quatro reprovam na `dev`); `apps/web/src/components/EsperaDoRunner.test.tsx`
  ("confirmada a espera, a sonda PARA" e o caso de falha: sem confirmação ela
  segue); `apps/web/src/routes/ContainersPage.test.tsx` ("a linha lê a sessão
  mais recente SEM poll")
- **Origem:** AT-278 (extensão da [RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579); não muda a RN-108 — o
  ticket de uso único e a reconexão manual seguem como estão)

<a id="rn-633"></a>

### RN-633 — O handoff manual não declara prontidão, e "já ativo" para a oferta é do projeto {#rn-633}

Duas leituras da tela de Sessão deixavam o handoff obsoleto (AT-293, AT-294):

1. **O handoff MANUAL não esconde "Estou pronto para produzir" nem "Confirmar
   arquitetura pronta"** (AT-293). `prontidaoJaDeclarada` e
   `arquiteturaJaDeclarada` perguntavam só "existe handoff saindo do
   Criativo/Arquiteto?", e o handoff manual
   ([ADR 0109](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0109-handoff-manual-a-agente-a-escolha.md),
   [RN-441](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-441)) grava como `fromAgent` o ÚLTIMO agente ativado
   (`request-manual-handoff.use-case.ts`): pedir um handoff manual ao Staff com
   o Criativo ativo escondia o botão de prontidão sem prontidão nenhuma
   declarada. O manual se reconhece pelo ATOR humano do `handoff.offered`
   (casado pelo `handoffId`, [RN-631](#rn-631)) — o `Handoff` da api não
   carrega o ator. Fora da janela de 200 o ator é desconhecido, e aí: para o
   Criativo vale o `artifactId` (o handoff da prontidão leva o
   `product_brief`, `criativo_server.ex`; o manual nunca leva artefato); para o
   Arquiteto os dois automáticos não levam artefato, então o de origem
   desconhecida segue contando, como antes. **Lacuna declarada:** a marca
   durável seria o ator (ou uma marca de manual) no próprio `Handoff` da api;
   não foi feita aqui (a api é da lane do ciclo de vida, ADR 0182).
2. **Oferta a agente já ATIVO em outra sessão do projeto não é acionável**
   (AT-294). "Ativo" era da SESSÃO: depois de "Ativar execução", o Dev Lead
   roda na sessão de execução, e a oferta a ele na sessão do chat seguia com
   "Aceitar". Agora a oferta (o card do fio, a faixa fora da janela e o card da
   Infra) soma ao "já entrou nesta sessão" o `roster.activatedAgents` do
   resumo, que é a sessão MAIS RECENTE do projeto — a de execução, depois de
   ativada. `activeFor` continua sendo DESTA sessão, porque é ele que o
   seletor do handoff manual usa. **Lacuna declarada:** sessões que não são
   nem esta nem a mais recente não são vistas; fechar pede um agregado de
   ativação POR PROJETO na api, que não existe.

Nenhuma mudança de api nem de engine.

- **Onde:** `apps/web/src/lib/session-handoffs.ts:41` (`origemDoHandoff`),
  `:108` (`jaAtivo`), `:180` (`prontidaoJaDeclarada`), `:192`
  (`arquiteturaJaDeclarada`); `apps/web/src/lib/session-destinatario.ts:156`
  (`useAtivosNoProjeto`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-obsoleto.test.tsx`
  (manual com o Criativo ativo não esconde "Estou pronto"; manual com o
  Arquiteto ativo não esconde "Confirmar arquitetura pronta"; o handoff do
  agente continua escondendo — caso de falha; fora da janela o do Criativo
  com brief conta; Dev Lead ativo na sessão de execução deixa a oferta muda;
  sem ele, a oferta segue acionável — caso de falha)
- **Origem:** AT-293, AT-294

<a id="rn-634"></a>

### RN-634 — Depois de "Ativar execução", a tela vai à sessão de execução {#rn-634}

A execução roda numa sessão NOVA (RN-135, RN-139), e a de chat de onde o
clique partiu pode até fechar. O atalho "Ativar execução" do card do handoff
ao Dev Lead (RN-137) — e a fusão com o aceite (RN-161) — deixava a pessoa na
sessão de chat, olhando o lugar de onde o trabalho saiu (AT-295). Agora
`handleActivateExecution` lê o `sessionId` que `POST .../execution/activate`
devolve e leva a tela até ele, com o aviso "Levando você à sessão de
execução.". Sem `sessionId` na resposta, com o mesmo id da sessão atual, ou
sem quem navegue (a tela montada fora da rota), só o aviso de sempre, e a tela
fica. Ativação recusada não navega e mostra a frase da api. Quem navega é a
ROTA (`irParaSessao`, o `navigate` do router): a tela não depende do router.

- **Onde:** `apps/web/src/lib/session-acoes-de-handoff.ts:147`
  (`handleActivateExecution`); `apps/web/src/router.tsx:376` (`irParaSessao`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-obsoleto.test.tsx`
  (navega para o `sessionId` devolvido, com aviso; recusa não navega — caso de
  falha; sem quem navegue, só avisa)
- **Origem:** AT-295

<a id="rn-638"></a>

### RN-638 — Quem pergunta "o que espera decisão" lê a fila do PROJETO, nunca a sessão mais recente {#rn-638}

O contador de Aprovações do trilho, o painel "precisa de você" ([RN-467](parte-03.md#rn-467)),
a aba Aprovações, o roster da Visão geral e a aba Código liam as pendentes de
`useLatestSession` — a sessão CRIADA por último —, que só é a de execução por
coincidência. Uma ideação ou um chat aberto depois da execução zerava o
contador e escondia do roster os dev agents esperando decisão (AT-297). E o
bloco de pendências de outras sessões do chat ([RN-626](#rn-626)) só existia em
sessão ativa, enquanto o `container_start` que o Infra Lead propõe no CHAT
destrava o `dev.blocked_by_container` que aparece na EXECUÇÃO (AT-298).

**A regra:**

1. **A fila é a do projeto.** Essas telas leem `useProjectPendingActions`
   (`GET /projects/:projectId/actions?status=pending`, em qualquer sessão),
   todas pela MESMA chave `['project-pending-actions', projectId, undefined]`
   — no ritmo de projeto da [RN-632](#rn-632), e a 3s só na aba Aprovações, que
   a tem como assunto. A moldura `ProjectPage` tira o contador de PRs
   (`git_merge`) da MESMA leitura, em vez de uma segunda consulta. As filas
   continuam separadas, com o selo próprio — nada se soma (RN-467).
2. **Cada card decide pela sessão que a PRÓPRIA ação carrega.** Na aba
   Aprovações, aprovar, negar, "sempre permitir" e o lote chamam o endpoint com
   `action.sessionId`, e invalidam a fila do projeto por prefixo e as ações da
   sessão da ação. Os blocos de PR e gate da aba leem eventos e ações da sessão
   de EXECUÇÃO vigente (RN-139), e só sem ela da mais recente.
3. **As pendências de outras sessões aparecem em qualquer estado.** O bloco do
   chat sai também em sessão encerrada e técnica — decidir é sobre a ação da
   OUTRA sessão, não conversa nesta (a RN-581 segue recusando conversa) —, e a
   aba Executores ganha o MESMO bloco para a sessão de execução: o
   `container_start` do chat fica visível onde o bloqueio aparece.
4. **A proposta chega pelo canal, sem esperar o poll.** Todo aviso
   `proposed_action.*`/`action.*` de qualquer canal de sessão que uma tela ouve
   invalida também a fila do projeto (`pendenciasDoProjeto` em
   `criarInvalidadorDoCanal`, janela de 2s), e o `dev.blocked_by_container`
   também — a proposta que o destrava nasce noutra sessão, cujo canal ninguém
   ali ouve (AT-299). Nenhum poll subiu.
5. **O bloco cabe na coluna e mostra todos (AT-318).** Na medida do fio e do
   composer (780px), recolhível, com a PRESENÇA de cada fila no cabeçalho —
   "Aprovações 3 · Merges de PR 1", cada uma com o próprio número, nunca a
   soma (RN-467) — visível mesmo recolhido. Os cards nascem com o detalhe
   FECHADO (`detalheRecolhido` no `ApprovalCard`): abertos, cobriam ~60% do fio
   e deixavam um card à vista de três. O rótulo de origem sai UMA vez por
   sessão, com o tempo da mais antiga — por card, ele se repetia entre um card
   e o seguinte. O teto de 20 cards e o recorte declarado (RN-180) seguem.

**O que esta regra NÃO fecha:** o aviso só chega onde há uma tela ouvindo um
canal de sessão (Sessão; Visão geral, a sessão mais recente; Executores, a de
execução). Numa aba sem canal (Aprovações, PRs, Backlog…) ou para uma proposta
feita numa sessão cujo canal nenhuma tela aberta ouve, o contador chega pelo
poll de projeto, em até 15s; abrir um canal de sessão na moldura mudaria o
ciclo de vida da sessão (o canal é o heartbeat da RN-064) e ficou de fora. O
contador de Aprovações continua contando o `git_merge` pendente, como antes —
o painel o deduplica para a fila de PRs. A lacuna do papel de WORKSPACE no
lugar do efetivo (RN-471) vale para o bloco novo dos Executores como vale para
o do chat.

- **Código:** `apps/web/src/routes/ProjectPage.tsx:82` (o contador),
  `:121` (os merges da mesma leitura);
  `apps/web/src/routes/ProjectApprovalsTab.tsx:115` (`pendentesQuery`), `:119`
  (`sessaoDeTrabalho`), `:326` (`handleApprove`);
  `apps/web/src/routes/ProjectOverviewTab.tsx:129` (`pendentesDoProjeto`);
  `apps/web/src/routes/ProjectExecutorsTab.tsx:111` (`pendentesQuery`), `:290`
  (o bloco); `apps/web/src/routes/code/CodeShell.tsx:101` (`pendentesQuery`);
  `apps/web/src/routes/SessionPage.tsx:782` (o bloco sem `isActive`);
  `apps/web/src/lib/canal-vivo.ts:134` (`alvosDoEvento`), `:180`
  (a chave por prefixo); `apps/web/src/components/PendenciasDeOutrasSessoes.tsx`
  (`porSessao`, `presenca`); `apps/web/src/components/ApprovalCard.tsx`
  (`detalheRecolhido`); `apps/web/src/lib/hooks.ts:455`
  (`useProjectPendingActions`); `apps/web/src/lib/precisa-de-voce.ts`
  (`acoesPendentes`)
- **Teste:** `apps/web/src/routes/ProjectApprovalsTab.test.tsx` (a pendente da
  execução com uma ideação mais nova, decidida pela sessão dela; decidida não
  entra — contraste); `apps/web/src/routes/project-tabs.test.tsx` (os selos
  pela fila do projeto); `apps/web/src/routes/ProjectExecutorsTab.test.tsx`
  (o `container_start` do chat na aba da execução; a pendente da própria
  execução não vira bloco — contraste);
  `apps/web/src/routes/SessionPage.sessao-encerrada.test.tsx` (o bloco em
  `closed` e `closed_abnormally`; a da própria sessão não entra);
  `apps/web/src/lib/acoes-da-sessao.test.ts` (o canal invalida a fila do
  projeto por prefixo e com janela; `tool.call` não);
  `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx` (três cards à
  vista com o detalhe fechado e a presença por fila sem soma; recolhido, a
  presença fica no cabeçalho; um rótulo de origem por sessão);
  `apps/web/src/routes/duas-abas.orcamento.test.tsx` (a rajada invalida a fila
  do projeto na aba Executores, dentro do orçamento da RN-632)
- **Origem:** AT-297, AT-298, AT-299 (HS-076), AT-318 (auditoria visual de 30/09)

## Acompanhar ao vivo sem martelar (RN-639)

<a id="rn-639"></a>

### RN-639 — O que muda por token não re-renderiza a tela, e o que acompanha o bootstrap polla a 3 s e para no fim {#rn-639}

Três telas faziam trabalho que ninguém via (AT-301/AT-302). A tela de Sessão
re-renderizava INTEIRA a cada token de um turno — o texto em curso morava em
estado do hook chamado por ela. As telas de provisionamento e de adoção pollavam
o status do bootstrap e os eventos da sessão técnica a 1 s, e os eventos nunca
paravam, mesmo com o repositório pronto. E o `/status` batia para sempre num
serviço que não respondia.

1. **O texto em curso mora num store externo.** O texto do chat consultivo e a
   faixa de atividade do turno ficam num store por sessão
   (`criarStoreDoStreaming`), assinado por `useSyncExternalStore` só pelos dois
   componentes que os desenham — a bolha do fio e a faixa. A página assina UMA
   pergunta booleana (o turno já mostrou conteúdo?), que é o que o timer de
   "pensando" ([RN-131](parte-02.md#rn-131)) precisa e que muda uma vez por turno. O
   reducer da faixa é o mesmo; mudou quem guarda o estado.
2. **O bootstrap é acompanhado a 3 s.** Status e eventos, nas duas telas.
3. **E para no fim.** Status e eventos param quando o bootstrap converge
   (`provisioned`) e quando a query erra (`pollQueParaNoErro`). A FALHA
   (`provision_failed`) é terminal na adoção e NÃO no provisionamento: ali o
   "Tentar novamente" dispara um bootstrap novo e a tela precisa ver o
   progresso dele ([RN-477](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-477)).
4. **O `/status` para no erro.** Serviço que responde — inclusive com 5xx, que
   vira `status: 'error'` num corpo resolvido — segue a cada 5 s. Serviço que
   não responde deixa de ser perguntado por timer; o foco da janela e a
   remontagem perguntam de novo, e o primeiro sucesso retoma o ritmo.

- **Onde:** `apps/web/src/lib/streaming-do-turno.ts:48` (`criarStoreDoStreaming`),
  `apps/web/src/lib/streaming-do-turno.ts:98` (`useSemConteudoNoTurno`),
  `apps/web/src/lib/poll-do-bootstrap.ts:33` (`pollDoBootstrap`),
  `apps/web/src/lib/poll-do-bootstrap.ts:47` (`bootstrapTerminou`),
  `apps/web/src/routes/ProvisioningPage.tsx:41` (`acompanharBootstrap`),
  `apps/web/src/routes/StatusPage.tsx:62` (`pollQueParaNoErro`)
- **Teste:** `apps/web/src/routes/SessionPage.streaming-isolado.test.tsx` (vinte
  tokens depois do primeiro não re-renderizam a página; o fim do turno
  re-renderiza), `apps/web/src/lib/streaming-do-turno.test.ts`,
  `apps/web/src/lib/poll-do-bootstrap.test.ts`,
  `apps/web/src/routes/StatusPage.test.tsx`
- **Origem:** AT-301, AT-302

## Decidir no chat, onde o dono está (RN-626)

<a id="rn-640"></a>

### RN-640 — A paleta neutra fecha a dívida de contraste, e cor da UI só vem de token {#rn-640}

O tema escuro deixa de ser azul-petróleo e vira preto neutro com o acento
terracota suave; o claro vira o neutro da mesma família (ADR 0181). O mecanismo
da [RN-184](parte-02.md#rn-184) não muda — os pares são
medidos nos dois temas, com o mesmo piso —; o que muda é o que se cobra:

1. **A dívida do escuro virou piso.** Os cinco pares que a RN-184 deixava
   travados por número (3,89 / 3,10 / 3,88 / 3,88 / 4,41) passam 4,5:1 nos dois
   temas, e o teste reprova quem os devolver para baixo — não "registra" mais.
   O valor final saiu da MEDIÇÃO: o `--text-muted` do rascunho (`#71717a`)
   repetia a dívida e foi recusado (`#86868f` no escuro, `#696972` no claro), e
   o muted continua ABAIXO do `--text-secondary` nas três superfícies, o que o
   teste também cobra.
2. **O texto sobre fundo sólido de marca/estado passa AA.** `--on-accent` do
   escuro é o preto neutro (5,61:1 sobre o acento, 7,25:1 no hover, 7,65:1
   sobre `--success`, 5,24:1 sobre `--danger`); a "exceção conhecida" do botão
   primário deixa de existir, e o matiz do acento continua terracota (10°–30°)
   nos dois temas.
3. **Cor da UI só vem de token.** Quem pinta por biblioteca de runtime (Mermaid,
   xterm, minimapa) lê o token do tema ativo e, sem ele, cai no padrão de
   `TOKENS_PADRAO` — uma cópia do `:root` que o teste confere contra
   `design/tokens.css`. Cor de agente é sempre `var(--token)`; os três agentes
   sem semântico têm `--agent-*` por tema, medidos a 3:1. E nenhum módulo CSS
   usa `var(--x)` que ninguém declara.

- **Onde:** `design/tokens.css:118`, `design/tokens.css:126`,
  `apps/web/src/lib/tokens-padrao.ts:50` (`lerTokenDoTema`),
  `apps/web/src/lib/agents.ts:90`
- **Teste:** `apps/web/src/lib/contraste.test.ts` ("a antiga dívida de
  contraste agora é piso"), `apps/web/src/design-contraste.test.ts`,
  `apps/web/test/design-contraste.test.ts` ("o botão primário — a exceção que
  deixou de existir"), `apps/web/src/lib/tokens-padrao.test.ts`,
  `apps/web/src/lib/agents.test.ts` ("cor de agente vem do design system"),
  `apps/web/src/design-tokens-existentes.test.ts`
- **ADR:** [0181](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0181-tema-preto-neutro.md)
- **Origem:** AT-283, AT-284

## Acompanhar ao vivo sem martelar (RN-639)

<a id="rn-643"></a>

### RN-643 — Abaixo de 768px a sidebar vira gaveta e o trilho do projeto vira barra horizontal; a página nunca rola de lado {#rn-643}

A auditoria visual da Rodada 29 (AT-290, achado S1) mediu que o produto não
tinha layout móvel depois do login: a 390px a sidebar (264px) e o trilho do
projeto (180px) continuavam FIXOS, somando 444px de moldura, e o conteúdo ficava
com 0 a 126px ou estourava para a direita. Configurações chegou a 114 textos
cortados (`validacao-visual.js`).

**A regra:**

1. **Um corte, uma fonte.** O breakpoint é `CONSULTA_MOVEL`
   (`(max-width: 767px)`), lido por `useLayoutMovel`. Quem troca de layout lê
   esse hook e aplica o desenho móvel por uma CLASSE; os módulos CSS não têm
   `@media` próprio para isso. Assim o que o JS decide e o que o CSS desenha
   não divergem num pixel de fronteira, e o teste de componente (jsdom, sem
   CSS) prova o mesmo corte que o navegador aplica. Sem `matchMedia` o
   layout é o de DESKTOP: o móvel só vale quando a consulta o afirma.
2. **A sidebar vira gaveta.** Uma barra no topo traz o botão de menu
   (`aria-expanded`, `aria-controls`) e a marca. A gaveta é um diálogo modal
   (`role="dialog"`, `aria-modal`): ao abrir, o foco entra nela; o Tab não
   sai; o Esc, o X e o fundo a fecham e devolvem o foco ao botão de menu.
   Ela também fecha ao seguir qualquer link de dentro dela (as abas do projeto
   mudam só o `?tab=`) e quando a rota muda por fora. Na gaveta a sidebar
   aparece sempre EXPANDIDA, e o botão "Recolher menu" some: o colapso manual
   ([RN-195](parte-02.md#rn-195)) é preferência do desktop, fica gravado e volta a valer
   quando a janela cruza o corte de novo.
3. **O trilho do projeto vira barra horizontal.** São as mesmas 12 folhas, na
   mesma ordem, com os cabeçalhos de grupo inline e
   `aria-orientation="horizontal"`. As setas que andam são esquerda e
   direita, e a aba ativa é rolada para dentro da faixa visível. A barra rola
   por DENTRO; a página não rola de lado. O corpo do projeto vira coluna (a
   barra acima do painel), e a Visão geral empilha o time e a atividade em
   vez de manter o trilho de 360px ao lado.

**Medido** (390×844, tema escuro, seed da api, `validacao-visual.js` injetado):
`scrollWidth` do documento = 390 em todas as telas autenticadas (dashboard, as
12 abas, `/containers`, `/account`), e `<main>` com os 390px inteiros. Nas
Configurações, `texto-cortado` caiu de 114 para 33. O resto é texto de
componente (tabelas e rótulos das seções), assunto de tipografia e espaço, não
de moldura. O `fora-da-viewport` que sobra na Visão geral e em Aprovações são
abas da barra horizontal além da borda, onde a rolagem interna as alcança.

**Revisto pelo [ADR 0211](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0211-uma-navegacao-so-a-sidebar-absorve-o-trilho.md)
(AT-404):** o item 3 deixou de valer — o trilho do projeto saiu, e com ele a
barra horizontal. No telefone as abas do projeto moram na GAVETA (item 2), com
os grupos, a ativa e os contadores; escolher uma fecha a gaveta. O corpo do
projeto não vira mais coluna: só os respiros encolhem.

**O que esta regra NÃO fecha:** a aba Código mantém o trilho de 48px do
`CodeShell` e o editor em colunas; ela não foi desenhada para telefone. A
tela de Sessão herda a moldura nova, mas a barra superior e o fio seguem com
os achados X1–X3 da auditoria. A duplicação de navegação por abas (gaveta e
barra) fechou no ADR 0211.

- **Código:** `apps/web/src/lib/layout-movel.ts:18` (`CONSULTA_MOVEL`),
  `:39` (`useLayoutMovel`); `apps/web/src/routes/Shell.tsx:444`
  (`movel`), `:463` (`fecharAoSeguirLink`);
  `apps/web/src/routes/ProjectPage.tsx:70` (`movel`);
  `apps/web/src/routes/ProjectOverviewTab.tsx:80` (`movel`)
- **Teste:** `apps/web/src/routes/Shell.test.tsx` ("Shell — layout móvel
  (RN-643)": a gaveta abre com o foco dentro e o Esc a fecha devolvendo o foco;
  fecha pelo link, pelo X, pelo fundo e pela troca de rota; ignora o colapso
  gravado; cruzar o corte volta à sidebar fixa; e o caso de falha, sem
  `matchMedia` não há menu nem diálogo);
  `apps/web/src/routes/Shell.test.tsx` ("no telefone as abas estão na gaveta,
  e escolher uma fecha a gaveta (RN-643)") e
  `apps/web/src/routes/AbasDoProjeto.test.tsx` ("no telefone continua
  VERTICAL"), desde o ADR 0211, sobre o mock
  `apps/web/src/test/match-media.ts`
- **Origem:** AT-316 (achado S1 da AT-290); não muda o ADR 0126, só dá ao
  trilho uma forma para telas estreitas

## Decidir no chat, onde o dono está (RN-626)

<a id="rn-644"></a>

### RN-644 — O fio corta por MENSAGEM, nunca parte uma troca e recolhe o histórico na ordem em que aconteceu {#rn-644}

O levantamento visual da Rodada 29 (achado X3, AT-319) mediu três defeitos no
corte do fio da [RN-177](parte-02.md#rn-177), todos na mesma
função: (1) as "últimas 5" contavam **entradas**, e os cards de handoff, de
aprovação e de história contavam como uma mensagem cada — numa conversa curta,
a primeira pergunta e a primeira resposta iam para o histórico recolhido; (2) o
corte caía onde a contagem mandava, podendo deixar a pergunta recolhida e a
resposta aberta; (3) o histórico era agrupado **por origem**, na ordem das
origens, e o grupo "LLM" vinha antes de "Usuário" — expandido, a resposta do
Criativo aparecia ACIMA da pergunta que a gerou.

**A regra, no fio (o painel de log NÃO muda — lá o eixo é a camada):**

1. **O corte conta MENSAGENS**: `chat.message`, `agent.response` e
   `chat.structured_question` (`TimelineEntry.mensagem`). Card e divisor não
   contam; os que vêm depois do corte ficam abertos com as mensagens em volta.
   Um colapso por agente ([RN-138](parte-02.md#rn-138)) e um "Passos do turno" continuam
   sendo UMA entrada, e contam como uma mensagem.
2. **O corte nunca parte um turno** ([RN-172](parte-02.md#rn-172)): ele recua até a
   abertura do turno da mensagem que o marcou, então a pergunta fica sempre
   junto da resposta. Por isso as abertas podem passar de cinco — nunca uma
   troca pela metade. O prólogo (turno `0`) não tem abertura e não recua; se
   recuar chegar ao início, não há histórico.
3. **O histórico é UM bloco, em ordem cronológica**, e DECLARA o recorte
   ([RN-180](parte-02.md#rn-180)): o título diz o que o corte conta ("Antes das últimas 5
   mensagens") e o `trailing` separa o que ficou dentro ("2 mensagens · 2
   outras entradas"). O rótulo "LLM" sai do fio junto com os grupos por origem.

**O que se perdeu, declarado:** reabrir só o que o usuário disse, sem reabrir o
resto, era a razão dos grupos por origem no fio. Ela não sobrevive à ordem
cronológica — o painel de log segue oferecendo esse recorte.

- **Código:** `apps/web/src/routes/session-fio.tsx:119` (`FIO_RECENTES_ABERTAS`),
  `:291` (`dividirFio`), `:141` (`entradaSimples`);
  `apps/web/src/lib/session-timeline.ts:67` (`mensagem`);
  `apps/web/src/routes/session-timeline-montagem.tsx:389`, `:426`, `:673` (as
  três mensagens); `apps/web/src/routes/SessionFio.tsx:139` (o bloco único)
- **Teste:** `apps/web/src/routes/session-fio.test.ts` (cards não contam, o
  corte recua até a abertura, ordem do fio, e o caso de falha do turno maior
  que o corte); `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  (describe "RN-177/RN-644": o caso medido com cards intercalados, e o
  histórico expandido na ordem)
- **Origem:** AT-319, achado X3 do levantamento visual "antes" da Rodada 29

## Acompanhar ao vivo sem martelar (RN-639)

<a id="rn-645"></a>

### RN-645 — Configuração não se busca de novo a cada montagem, não polla, e a aba Configurações tem três faixas de moldura, não quatro {#rn-645}

O levantamento visual da Rodada 29 (achado G1, AT-321) percorreu as seções de
Configurações em ~40s e a página inteira do projeto virou "Limite de
requisições excedido" — o teto de 300 req/min é do USUÁRIO
([RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579)). O roteiro RECARREGAVA a página por seção, e uma carga da
aba custava 55 requisições. Medido com as telas de verdade, o defeito tinha
três partes, e nenhuma delas pede subir o teto:

**A regra:**

1. **Dado de CONFIGURAÇÃO vale um minuto** (`FRESCOR_DA_CONFIGURACAO_MS`). Com o
   `staleTime: 0` do TanStack, toda observadora que MONTA depois da primeira
   refaz a busca. As seções só montam depois que o projeto chega, então
   `GET /projects/:id`, `GET /projects/:id/git/repository` e `GET /workspaces`
   saíam DUAS vezes em toda carga; e trocar de aba e voltar remontava as 19
   seções e refazia 31 buscas. Configuração só muda por MUTAÇÃO, e toda
   mutação da aba invalida a própria chave — invalidar ignora `staleTime`,
   então quem salva vê o valor novo na hora. O que o minuto atrasa é a mudança
   feita por OUTRA pessoa, que segue chegando no foco da janela e na próxima
   montagem depois do minuto. **Estado operacional fica fora** (ciclo de vida
   do container, gasto por agente e por chave, chaves de dispositivo com
   `lastUsedAt`, plano de bootstrap): ali a pergunta é "o que está de pé
   agora".
2. **Configuração não polla.** O perfil de proficiência e o histórico de
   versões de instrução pollavam a 15s — 8 req/min contra o teto para duas
   listas que só mudam pela própria seção (que invalida) ou por patch
   aprovado.
3. **O sumário DEITA acima das seções, em qualquer largura.** Como coluna
   `sticky` ao lado delas ele era a quarta faixa vertical (sidebar 264 +
   trilho 180 + sumário 208): a 1440px sobravam ~740px de conteúdo e a tabela
   de modelos cortava o nome do agente em 79px e o do modelo em 91px (achado
   G2). A coluna não tinha como pagar o próprio preço nem num monitor largo,
   porque `.body` tem teto de 1040px (ADR 0078). Deitado, ele devolve os 208px
   às seções; o preço é o que a janela estreita já pagava — perde-se o "onde
   estou" GRUDADO na tela, não a navegação. Nenhum token mudou.

**Números** (`configuracoes.orcamento.test.tsx`, `Shell` + `ProjectPage` na
aba Configurações sobre um `fetch` que conta por rota; `dev` → esta regra):

| Cenário | Antes | Depois |
|---|---|---|
| carga da aba (2,5s) | 53 | 50 |
| um minuto parado na aba | 76 | 68 |
| Configurações → Visão geral → volta (buscas de configuração) | 31 | 0 |
| carga da aba, com os bindings resolvidos em LOTE ([RN-654](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-654), AT-334) | 49 | 30 |

Os "Depois" das três primeiras linhas foram medidos sobre a mesma base do
"Antes"; integrada a `dev` com a [RN-638](#rn-638) (a moldura lê a fila do
projeto uma vez só), a carga ficou em 49 e o minuto em 64. A quarta linha é a
[RN-654](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-654), medida sobre a `dev` em 94e5dc721d: os 20 bindings
resolvidos por chave viraram UMA leitura, e o teste guarda a carga em 30 e o
minuto em 64.

**O que esta regra NÃO fecha:** até a [RN-654](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-654), 20 das requisições da
carga eram o binding RESOLVIDO de cada agente (17) e de cada área (3), uma rota
por chave (`GET projects/:projectId/agent-bindings/:agentSlug`) — essa parte
fechou com a rota de LOTE. RECARREGAR a página por seção, como o roteiro do
levantamento fazia, ainda custa 30 por carga (~10 cargas por minuto antes do
teto); navegar pelo sumário DENTRO da aba não remonta nada e custa zero. Os 68 do
minuto são todos da MOLDURA (o `Shell` polla `projects-summary` e
`execution/session` a 5s e os eventos da sessão de execução a 3s), comuns a
toda aba — a mesma lacuna que a [RN-632](#rn-632) declara.

- **Código:** `apps/web/src/lib/query-policy.ts:111`
  (`FRESCOR_DA_CONFIGURACAO_MS`); `apps/web/src/lib/hooks.ts:29`
  (`useCurrentWorkspaceWithRole`), `:535` (`useProficiency`);
  `apps/web/src/routes/settings/InstructionVersionsSection.tsx:31`
  (`instruction-versions`, sem poll); as seções de `apps/web/src/routes/settings/`
  e `apps/web/src/components/ModelCatalogSection.tsx`;
  `apps/web/src/routes/settings/sumario.module.css:36` (`.layout`, a faixa)
- **Teste:** `apps/web/src/routes/configuracoes.orcamento.test.tsx` (a carga
  busca cada recurso uma vez; um minuto sem poll de configuração; trocar de
  aba e voltar sem buscas de configuração — os três reprovam na `dev` — e o
  caso de falha: invalidar busca na hora, e passado o minuto a volta busca de
  novo)
- **Origem:** AT-321 (achados G1 e G2 do levantamento visual da Rodada 29;
  extensão da [RN-579](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-579) e da [RN-632](#rn-632))

## Decidir no chat, onde o dono está (RN-626)

<a id="rn-646"></a>

### RN-646 — Bloqueio e controle inerte dizem o motivo de QUEM está na tela: a aba PRs fala da lista de PRs, e Parar/Remover sem container dizem que não há container {#rn-646}

Duas telas mostravam um estado certo com o texto de outro lugar (AT-323,
AT-324 — achados P1 e K1/K2 do levantamento visual da Rodada 29).

**A aba PRs e o portão da imagem.** O bloqueio é REAL e fica: a lista de PRs e
o diff passam pelo MESMO funil da aba Código (`ReadProjectCodeUseCase.alvo` →
`portaoDoContainer`), então sem imagem decidida (RN-105, nos três modos pela
[RN-494](https://github.com/viralabs-dev/brabo-broker/blob/dev/docs/business-rules/broker.md#rn-494)) a api responde 409 também ali — medido, não suposto. O que
estava errado era o texto: a aba PRs mostrava "A aba Code ainda não está
liberada", falando de OUTRA aba e com um nome ("Code") que não é o do trilho
("Código"). Agora `ContainerImageGateNotice` recebe a SUPERFÍCIE bloqueada
(`'code' | 'prs'`), a aba PRs diz "A lista de PRs ainda não está liberada" e
explica que lê o repositório pelo mesmo caminho da aba Código; e o nome das
abas no texto vem de `nav:tabs.*.label`, a MESMA fonte do trilho — nunca um
literal, que é como "Code" e "Código" divergiram. A nota da aba PRs NÃO
promete liberar sozinha: a aba Código pergunta o estado e revalida, a lista de
PRs só descobre o 409 quando a query falha.

**`/containers` sem container.** Parar e Remover já eram `disabled` com
`registrado: null` ([RN-521](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-521), "nunca provisionado") e com `removed`,
mas nada dizia por quê, e a variante `danger` do `Button` não tinha estado
desabilitado — "Remover" saía em vermelho cheio, igual ao ativo. Agora a linha
diz o motivo UMA vez em texto (`Nunca provisionado: não há container para
parar nem remover.` / `Container removido: …`), e `.danger:disabled` ganha a
mesma opacidade das outras variantes. Linha com container de pé não ganha
texto nenhum.

**O motivo longo da falta de broker.** O texto que nomeia `BROKER_URL` tinha
nove linhas e triplicava a altura da linha da tabela. A célula mostra agora UMA
frase curta num `<summary>`, e o texto longo (que continua nomeando a variável,
para o operador) abre sob demanda no `<details>` — nativo e acessível por
teclado, nunca `title` num botão desabilitado (ADR 0064). Quando a MESMA falta
de broker trava subir E parar/remover, é UMA linha só ("subir, parar e remover
só terminariam em falha"), com os dois detalhes atrás do mesmo `<details>`.

- **Código:** `apps/web/src/components/ContainerImageGate.tsx:33`
  (`ContainerImageGateNotice`), `:42` (`bloco`);
  `apps/web/src/routes/ProjectPrsTab.tsx:157` (`superficie="prs"`);
  `apps/web/src/components/AcoesDoContainer.tsx:244` (`semContainer`), `:270`
  (`semBrokerNaSubida`; o helper da chave curta `chaveCurtaDoBroker` saiu: desde a AT-712 a falta de broker é dita UMA vez na ajuda "?", ADR 0240, e não num `<summary>` na célula); `apps/web/src/components/ui/Button.module.css:101`
  (`.danger:disabled`)
- **Teste:** `apps/web/src/routes/ProjectPrsTab.test.tsx` ("409 do portão vira
  o estado dedicado, com o texto da aba PRs e não o da aba Código", "409 no
  diff aberto por id também usa o texto da aba PRs", e o caso de falha: 500
  continua banner com "Tentar de novo"); `apps/web/src/routes/ProjectCodeTab.test.tsx`
  e `apps/web/src/routes/code/CodeDiffPanel.test.tsx` (a aba Código diz
  "Código"); `apps/web/src/routes/ContainersPage.test.tsx`, bloco "Parar/Remover
  sem container e o motivo curto (AT-324)" (nunca provisionado, removido, o
  caso de falha "container de pé: nenhum motivo", o `<details>` fechado com
  `BROKER_URL` só dentro dele, e a linha única quando o broker trava as três)
- **Origem:** AT-323, AT-324. Não muda o portão da RN-105/RN-494 (a lista da aba
  PRs segue bloqueada sem imagem decidida; só a fila do chat e o aviso de PR
  pronta escapam do portão, AT-843, decisão do dono de 08/11/2026), nem a régua de subida da RN-521/RN-574.

<a id="rn-648"></a>

### RN-648 — A sidebar, o card do Dashboard e o painel de artefatos não se contradizem: cada estado vazio diz QUAL sessão leu, e contador e lista contam na mesma unidade {#rn-648}

Três telas afirmavam "nada" ao lado de uma tela que mostrava algo (AT-325 —
achados S2/D2/X6 do levantamento visual da AT-290). A reprodução com o engine
real não foi possível neste ambiente (o egress bloqueia `repo.hex.pm` e o
Alpine, e nenhuma imagem compila); as três contradições foram MEDIDAS no
código e provadas por testes que falham antes da correção. A do Dashboard
nasceu, no levantamento, de um 500 do stub do engine no resumo do workspace —
mas o texto que a transformou em "sem atividade" é do web, e com o engine real
qualquer falha do resumo produziria o mesmo.

**A sidebar lia a sessão de EXECUÇÃO, e só ela.** O bloco Atividades
(RN-198) pedia os eventos da sessão de execução vigente
(`useActiveExecutionSession`). Num projeto só com sessões de conversa ela é
`null`, a lista vinha vazia, e a sidebar dizia "Nenhum agente entrou em ação
ainda" ao lado de uma Visão geral com o Criativo aguardando. Agora: com
execução vigente, a sidebar continua lendo ELA (os dev agents e as instâncias
`-2` são o que o agrupamento da RN-198 existe para mostrar, e a `queryKey` é a
da aba Executores); SEM execução, lê a MESMA sessão da Visão geral e do card do
Dashboard — a mais recente de trabalho (`useLatestSession`, a regra de
`sessaoMaisRecente`). Os estados que colapsavam no mesmo texto se separam
([RN-470](parte-03.md#rn-470)): carregando (nada é afirmado), erro (texto próprio),
projeto sem sessão ("Este projeto ainda não tem sessão."), e a sessão lida sem
agente, com o texto NOMEANDO qual ("…na sessão de execução…" /
"…na sessão mais recente…"). A lista de sessões só é pedida sem execução, e com
o frescor de um ciclo de projeto (`frescorMs` em `useProjectSessions`): quando
a sidebar a habilita a moldura do projeto já a trouxe, e o orçamento de
requisições da [RN-632](#rn-632)/[RN-645](#rn-645) não cresce.

**O card do Dashboard tinha um texto para quatro estados.** "Sem atividade
ainda" saía com o resumo do workspace CARREGANDO, com ele FALHADO (o caso do
levantamento: o resumo respondia 500 e o card de um projeto com dezesseis
eventos dizia que não havia nenhum), com o projeto SEM sessão e com a sessão
mais recente vazia. Agora são quatro textos: "carregando atividade…",
"atividade indisponível", "Nenhuma sessão ainda" e "Sem atividade na sessão
mais recente ainda". A linha continua lendo a sessão mais recente de trabalho
(`latestSessionId`), a mesma da Visão geral e da sidebar sem execução — a api
não mudou.

**"Artefatos gerados 3" sobre um único grupo "PO 1".** O cabeçalho da seção
contava a ÁRVORE do backlog (épico, história e tarefa: 3) e o grupo por agente
contava só as RAÍZES (1). Os dois contam agora na mesma unidade — cada item
carrega `quantos` (1, mais os descendentes quando é raiz do backlog), o
cabeçalho é a soma dos itens e cada grupo é a soma dos seus, então a soma dos
grupos É o cabeçalho, por construção. E o vazio da seção diz o que ela conta
("Nenhuma PR nem item de backlog nesta sessão ainda.") em vez do "Nada ainda."
genérico, que ao lado de um brief ou de uma regra da mesma sessão parecia negar
que eles existissem — o escopo da seção (PR e backlog, [RN-159](parte-02.md#rn-159)) não
muda.

- **Código:** `apps/web/src/routes/Shell.tsx:604` (`execucao`), `:594`
  (`origemDaAtividade`), `:601` (`estadoDaAtividade`);
  `apps/web/src/lib/hooks.ts:127` (`useProjectSessions`, `frescorMs`);
  `apps/web/src/routes/Dashboard.tsx:75` (`lastActivityText`);
  `apps/web/src/routes/ContextAside.tsx:47` (`quantos`), `:340`
  (`totalDeArtefatos`)
- **Teste:** `apps/web/src/routes/Shell.test.tsx` ("Shell — Atividades": sem
  execução lê a sessão da Visão geral e o Criativo aparece; com execução lê a
  de execução e o vazio diz qual; projeto sem sessão; e o caso de falha, a
  lista de sessões que falha vira erro nomeado e nunca "nenhum agente");
  `apps/web/src/routes/Dashboard.test.tsx` ("Dashboard — linha de atividade do
  card (RN-648)": o resumo que falhou diz "indisponível", carregando não afirma,
  sem sessão × sessão vazia têm textos diferentes, e com evento nenhum vazio
  aparece); `apps/web/src/routes/SessionPage.artefatos-gerados.test.tsx` (a
  soma dos grupos é o cabeçalho; o vazio diz o que conta);
  `apps/web/src/routes/configuracoes.orcamento.test.tsx` e
  `apps/web/src/routes/duas-abas.orcamento.test.tsx` seguem nos tetos
- **Origem:** AT-325 (achados S2/D2/X6 da AT-290). Não muda o escopo da
  [RN-159](parte-02.md#rn-159) nem o resumo do workspace ([RN-090](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-090)); estende a
  [RN-198](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-198) (qual sessão a sidebar lê) e aplica a [RN-470](parte-03.md#rn-470)

## Acompanhar ao vivo sem martelar (RN-639)

<a id="rn-651"></a>

### RN-651 — No telefone, o painel da Sessão é gaveta, a barra quebra linha, e a tabela vira cartões {#rn-651}

A auditoria visual "depois" da Rodada 29
(`docs/explanation/auditoria-visual-rodada-29.md`, achados N1 e N3 a N8) mediu,
a 390px, o que a [RN-643](#rn-643) não tinha alcançado: na Sessão o painel
"Contexto da sessão" mantinha ~320px e deixava ~70px ao fio (uma palavra por
linha), e a barra jogava "Iniciar ideação" e "Encerrar" para fora da borda; em
`/containers` sete colunas em fração sobrepunham os cabeçalhos e cortavam as
ações; em "Modelos por agente" o nome do agente tinha 6px e o seletor 0px; o
`/status` rolava de lado (413px); a busca do Dashboard virava "Bus"; o nome da
sessão na lista do Criativo tinha 0px; e o trilho móvel deixava a aba ativa
cortada, sem sinal de que rolava.

**A regra** (o corte é o mesmo `useLayoutMovel` da [RN-643](#rn-643), e o
desenho vem por CLASSE ou atributo que o componente põe, nunca por `@media`):

1. **O painel de contexto da Sessão nasce FECHADO no telefone** e abre como
   GAVETA sobre o fio, pela direita: diálogo modal com o nome do painel, foco
   no X ao abrir, Esc, X e fundo fecham e devolvem o foco a quem abriu. No
   desktop ele nasce aberto ao lado do fio, como sempre. Cruzar o corte volta
   ao padrão do lado novo — um painel aberto no desktop não reaparece
   espremendo o fio no telefone. A exceção é a navegação que VEM ao painel
   (`highlightEvent`, o chip de evidência do Psicólogo): aí ele nasce aberto
   também no telefone.
2. **A barra da Sessão quebra linha, nunca corta.** Saída, estado, título e o
   alternador do painel ficam na primeira linha; tipo, ajustes, "Iniciar
   ideação" e "Encerrar" descem, e descem de novo se precisar. O que a barra
   mostra continua decidido pela largura dela ([RN-620](parte-04.md#rn-620) item 6).
3. **Toda `Table` vira pilha de cartões no telefone.** Cada linha é um cartão
   e cada célula leva o rótulo da coluna ao lado do valor; o cabeçalho some.
   Coluna sem rótulo, ou marcada `largaNoMovel` (um seletor, um bloco de
   ações), ocupa a largura do cartão com o rótulo em cima.
4. **A página não rola de lado, e o que identifica a linha não some.** O
   `/status` rola a tabela por dentro de um invólucro próprio; a busca do
   Dashboard ganha linha inteira; a linha da lista de sessões quebra com o nome
   em cima, inteiro.
5. **O trilho móvel acompanha a aba ativa e diz que rola.** A ativa é trazida
   para a faixa ao montar, ao trocar, quando o CONTEÚDO do trilho muda (os
   contadores chegam depois e alargam as abas anteriores) e quando as fontes
   terminam de carregar — nunca a cada render, senão quem rolou a faixa à mão
   seria puxado de volta. A borda que esconde abas esmaece
   (`data-rola-inicio`/`data-rola-fim`).

**Medido** (390×844, os dois temas, api nativa com o seed, `validacao-visual.js`
injetado): `scrollWidth` 390 em todas as sete telas; zero `texto-cortado` no
Dashboard, na lista do Criativo, na Sessão (com e sem a gaveta), em
`/containers` e no `/status`; nas Configurações os 33 caíram para zero, e a aba
ativa do trilho ficou inteira dentro da faixa nas três abas medidas.

**O que esta regra NÃO fecha:** na barra mínima "Encerrar" continua só com o
ícone e o nome acessível (a [RN-620](parte-04.md#rn-620) decide isso pela largura da
barra). O alternador do painel sobe para a linha do título só na PINTURA
(`order`): a ordem do Tab segue a do DOM. O `fora-da-viewport` que o
verificador ainda relata nas Configurações e em Aprovações são ícones decorativos com
`position: absolute` dentro de controles abaixo da dobra, não algo cortado.

- **Código:** `apps/web/src/lib/painel-de-contexto.ts:16`
  (`usePainelDeContexto`); `apps/web/src/routes/GavetaDoContexto.tsx:14`
  (`GavetaDoContexto`); `apps/web/src/routes/SessionTopbar.tsx:134`
  (`movel`); `apps/web/src/components/ui/Table.tsx:24` (`largaNoMovel`),
  `:43` (`movel`); `apps/web/src/routes/Dashboard.tsx:165` (`movel`);
  `apps/web/src/routes/ProjectSessionsTab.tsx:153` (`movel`)
- **Teste:** `apps/web/src/routes/SessionPage.layout-movel.test.tsx` (a gaveta
  nasce fechada, abre com o foco no X e o Esc fecha devolvendo o foco; X e
  fundo fecham; a barra quebra antes das ações; e o caso de falha, no desktop o
  painel fica ao lado do fio sem gaveta nem quebra; cruzar o corte fecha o
  painel); `apps/web/src/components/ui/Table.test.tsx` ("layout estreito");
  `apps/web/src/routes/ContainersPage.test.tsx`,
  `apps/web/src/routes/settings/modelos-por-agente-no-movel.test.tsx`,
  `apps/web/src/routes/StatusPage.test.tsx`,
  `apps/web/src/routes/Dashboard.test.tsx`,
  `apps/web/src/routes/ProjectSessionsTab.test.tsx` (cada um com o móvel e o
  caso de falha do desktop ou da faixa que cabe). A faixa de abas do projeto
  (`ProjectRail`, achado N8) saiu no
  [ADR 0211](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0211-uma-navegacao-so-a-sidebar-absorve-o-trilho.md): as abas
  moram na gaveta
- **Origem:** AT-328 (achado N1) e AT-330 (achados N3 a N8) da auditoria
  visual da Rodada 29; completa a [RN-643](#rn-643)

## O autor de cada fala do fio é o ator do evento (RN-652)

<a id="rn-652"></a>

### RN-652 — `chat.message` é desenhado sob o ATOR do evento — pessoa, agente ou desconhecido —, nunca sob quem vê a tela {#rn-652}

Até aqui todo `chat.message` saía com o nome e o avatar de quem estava logado:
numa sessão compartilhada, a fala de outra pessoa aparecia com o SEU nome, e a
de um agente com o seu e-mail (achado N2 da auditoria visual da Rodada 29,
escondido enquanto o fio agrupava o histórico por origem). O autor sai agora do
`actor` do evento, que a api grava com o id de quem mandou
(`SendAgentMessageUseCase`, `SendChatMessageUseCase`) e que a rota genérica de
anexar evento aceita de qualquer espécie. Os desfechos não se colapsam:

1. **Quem vê** (`actor.id` igual ao `sub` do token; sem ele, pelo e-mail da
   linha de membro) — o nome ou e-mail da linha de membro, senão o e-mail da
   sessão, e só na falta dos dois "Você".
2. **Outra pessoa que a tela sabe nomear** — o nome dela, senão o e-mail, de
   DUAS leituras compostas numa lista só (`comporMembros`), a de PROJETO antes
   da de WORKSPACE: `GET projects/:id/members` (mínimo `viewer`), sob a MESMA
   `queryKey` da aba de Configurações, e desde a AT-335
   `GET workspaces/:id/members` ([RN-655](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-655)), do workspace DO PROJETO.
   Quem tem as duas linhas aparece uma vez, pela de projeto — a mesma ordem da
   sobreposição de papel ([RN-471](parte-03.md#rn-471)).
3. **Outra pessoa que a tela NÃO sabe nomear** — "Outro membro": sem linha de
   projeto nem de workspace (quem saiu do workspace e ainda tem fala no log),
   ou as duas leituras falharam ou ainda não chegaram. A leitura que falha não
   apaga a outra, e nenhuma delas quebra o fio. Até a AT-335 esta era a LACUNA
   declarada de quem entra só pelo papel de workspace, que não tinha rota de
   leitura; a rota nasceu por decisão do dono.
4. **Agente** — `nomeDoAgente` e o avatar/cor do agente, como `agent.response`.
5. **Ator desconhecido** (ausente, sem id, `system` ou espécie fora de
   pessoa/agente) — "Autor desconhecido", nunca "Você".

A narração `backlog.story_promotion_returned`, que tinha o mesmo defeito
(o nome de quem vê sobre quem devolveu a história), passa pela mesma função.
A mensagem OTIMISTA do composer continua com o e-mail de quem vê — ela é
sempre dele.

- **Código:** `apps/web/src/lib/autor-da-mensagem.ts:52` (`autorDaMensagem`);
  `apps/web/src/lib/autoria-da-sessao.ts:45` (`useAutoriaDaSessao`), `:18`
  (`comporMembros`);
  `apps/web/src/routes/session-timeline-montagem.tsx:186` (`rotuloDoAutor`),
  `:405` (o `chat.message`), `:687` (a devolução de história);
  `apps/web/src/routes/SessionPage.tsx:133` (`autoria`)
- **Teste:** `apps/web/src/routes/SessionPage.autor-da-mensagem.test.tsx:147`
  (duas pessoas e um agente, cada mensagem sob o próprio autor — caminho
  feliz), `:168` (ator desconhecido e pessoa fora dos membros com texto
  próprio — caso de falha), `:186` (quem entra só pelo papel de workspace é
  nomeado — AT-335), `:205` (a leitura do workspace recusada não apaga a do
  projeto), `:219` (leitura de membros recusada);
  `apps/web/src/lib/autoria-da-sessao.test.ts:15` (a linha de projeto antes da
  de workspace), `:22` (falha de uma leitura não apaga a outra);
  `apps/web/src/lib/autor-da-mensagem.test.ts:58` (ator ausente, sem id ou de
  espécie desconhecida nunca vira "você")
- **Origem:** AT-329 (achado N2 de `docs/explanation/auditoria-visual-rodada-29.md`);
  a lista do workspace, AT-335

## O motivo da política em cada cartão de Aprovações (RN-656)

<a id="rn-661"></a>

### RN-661 — O modo automático é OFERECIDO em lote para o time no início da execução, e a oferta diz o que ele não libera {#rn-661}

Na aba Executores, com a execução ativa e o time de execução na tela, um cartão
oferece ligar o modo automático (RN-153) para os agentes do time de uma vez
(AT-315). É UM controle, e é oferta: os agentes que ainda não estão em
automático vêm marcados, a pessoa desmarca quem não quer, e nada é gravado sem
o clique em "Ligar". O clique grava a MESMA curinga (`agent_autonomy`,
`actionType: "*"`, `auto_approve`) pelo MESMO endpoint do toggle por agente
(`PUT .../agent-autonomy`, `maintainer`) — um PUT por agente, em série, sem
abortar na primeira recusa, com desfecho POR agente nos três casos da RN-469
(todos, nenhum com a frase da api, alguns com quem ficou em manual). Desligar
continua no toggle manual/auto do card de cada agente; não há "desligar em
lote". Quando todos já estão em automático, o cartão some.

O cartão DIZ, antes do clique, o que o modo automático NÃO libera — os tetos
absolutos seguem pedindo aprovação (RN-154, RN-418): merge em branch protegida;
`git push`, abertura de PR e deploy; `sudo`/`doas`; `container_remove`;
`instruction_patch`; paralelizar ou subir o teto de paralelismo. Sem
`maintainer` o controle fica inerte e o motivo é dito em texto; o papel lido é
o de WORKSPACE, com a mesma lacuna declarada das outras telas de modo
automático (RN-471).

- **Código:** `apps/web/src/components/ModoAutomaticoDoTime.tsx:60`
  (`ModoAutomaticoDoTime`), `:97` (`ligar`), `:70`
  (`agentesEmModoAutomatico`); `apps/web/src/routes/ProjectExecutorsTab.tsx:93`
  (`podeLigarModoAutomatico`), `:308` (onde a oferta monta)
- **Teste:** `apps/web/src/components/ModoAutomaticoDoTime.test.tsx:54` (nada
  gravado ao montar; o clique grava a curinga para cada escolhido — caminho
  feliz), `:85` (a api recusa um agente e o desfecho nomeia quem ficou em
  manual — caso de falha), `:74` (o que não libera), `:102` (sem
  `maintainer`), `:108` (todos em automático, nada a oferecer)
- **Origem:** AT-315 (levantamento da AT-309, linha "Modo automático")

## O fluxo do runner pelo navegador é aposentado (RN-687, ADR 0203)

<a id="rn-687"></a>

### RN-687 — O painel do runner manda para o instalador; o navegador não gera chave, não baixa binário e não grava pasta {#rn-687}

O fluxo do [ADR 0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)
([RN-464](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-464)..[466](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-466)) foi APOSENTADO por decisão do dono
(01/10, `BRB-031`): era o único caminho de instalação que terminava em
`chmod +x` manual, e o `install.sh` já faz as três coisas dele do lado certo —
baixa o binário conferido contra o `checksums.txt` assinado e o instala com
`install -m 0755` ([RN-531](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-531)), e cria a chave NA MÁQUINA e a registra
([RN-547](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-547), [RN-551](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-551), [RN-552](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-552)).

**A regra:**

1. **O `RunnerOnboardingPanel` mostra o comando do instalador**
   (`curl -fsSLO …/install.sh && bash install.sh`, a MESMA frase do runbook e
   do `install.sh`, [RN-526](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-526)), copiável, com o que ele faz dito em
   texto, a ressalva de que ele serve a máquina da instalação, e a
   `EsperaDoRunner` ([RN-474](parte-03.md#rn-474)) embaixo. O comando no web é uma CÓPIA,
   e a cópia é conferida contra a constante do instalador.
2. **Reconhecida uma chave ativa que serve o projeto** — de máquina
   ([RN-548](parte-04.md#rn-548)) ou de projeto (AT-107) —, o bloco do instalador SAI e o
   gesto é conferir o serviço. O comando manual com PAT (`--token`) fica sempre
   no `<details>`, nomeado como o caminho de OUTRA máquina.
3. **Não há botão de configurar pasta, de baixar arquivos, nem seletor de
   plataforma**, e o web não chama mais Web Crypto, File System Access nem o
   proxy do binário. `runner-bootstrap.ts` saiu inteiro.
4. **A api não tem mais `POST /projects/:projectId/runner-device-keys`.** Ele
   ficou sem chamador. `GET` e `DELETE` ficam (listar e revogar); a rota
   interna de máquina (`POST /internal/machine-device-keys`) fica.
5. **Chave de projeto JÁ registrada continua valendo e revogável**: nada no
   banco muda, o `PatAuthGuard` segue aceitando-a ([RN-465](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-465)) e o CLI
   segue lendo a pasta configurada ([RN-466](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-466)). O runner configurado
   pelo navegador antes do ADR 0203 não quebra.

Fica de fora, declarado: instalação com TIME perde o caminho sem PAT para
parear uma segunda máquina (a rota de chave de máquina é 409 com duas ou mais
pessoas), e passa a usar o comando manual; `GET /runner-releases/binary` fica
sem consumidor de produção e NÃO foi removido — é decisão à parte.

- **Onde:** `apps/web/src/components/RunnerOnboardingPanel.tsx:68`
  (`COMANDO_DO_INSTALADOR`), `:124` (`RunnerOnboardingPanel`);
  `apps/api/src/interfaces/http/runner/runner-device-keys.controller.ts:75`
  (`RunnerDeviceKeysController`), `:96` (`listDeviceKeys`), `:119`
  (`revokeDeviceKey`); `apps/api/src/interfaces/http/auth/pat-auth.guard.ts:152`
  (`autenticarChaveDeDispositivo`)
- **Teste:** `apps/web/src/components/RunnerOnboardingPanel.test.tsx:91`
  (caminho feliz: o comando do instalador, copiado, e a espera), `:119` (o
  fluxo do navegador saiu: nenhum botão dele, nenhum `chmod`), `:134` (caso de
  falha: clipboard recusado não quebra a tela), `:211` (chave de máquina ativa:
  o instalador sai); `apps/api/test/interfaces/http/runner/runner-device-keys.controller.spec.ts:43`
  (não há handler de `POST`); `apps/api/test/interfaces/pat-auth.guard.spec.ts:345`
  (chave de projeto segue aceita); `scripts/dev/install-invocacao.spec.ts:162`
  (o comando do painel é a frase do instalador);
  `scripts/ci/alvos-do-runner.spec.ts:70` (a lista de alvos do navegador não
  volta)
- **Decisão arquitetural:** [ADR 0203](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0203-aposenta-o-fluxo-do-runner-pelo-navegador.md)
- **Origem:** AT-014 (`BRB-031`), decisão do dono em 01/10

## O teto da RN-418 vale também pela porta tipada (RN-689)

<a id="rn-693"></a>

### RN-693 — Ativar o agente não é conversa: a dica de abertura fica no fio até a primeira mensagem, e os campos de texto da sessão não convidam o autofill {#rn-693}

Medido no uso real da v7.0.0: "Iniciar ideação" grava `agent.activated` (e
`agent.status`), o Criativo só fala depois da primeira mensagem, e o convite
— com a dica "Comece contando o que você quer construir…" — sumia no clique,
porque a pergunta "a conversa começou?" era `events.length > 0`. O fio ficava
vazio por ~25 s.

**A regra:** eventos de CICLO DE VIDA do agente (`agent.activated`,
`agent.status`) não contam como conversa. Qualquer outro evento continua
contando, para o convite não cobrir a sessão do git-bootstrap nem a de
execução ([RN-131](parte-02.md#rn-131)). Com o Criativo ativo e sem mensagem, o convite
fica sem o botão "Iniciar ideação" e com a dica; a primeira mensagem o tira.

E o composer e os campos de texto das perguntas estruturadas levam
`autocomplete="off"` e os atributos que os gerenciadores de senha respeitam
(`data-1p-ignore`, `data-lpignore="true"`, `data-bwignore`,
`data-form-type="other"`): cada foco abria o popup de autofill do navegador.

- **Onde:** `apps/web/src/lib/conversa-comecou.ts:15` (`conversaComecou`),
  `:29` (`SEM_AUTOFILL`); `apps/web/src/routes/SessionPage.tsx:428`
  (`conversaComecou`); `apps/web/src/routes/SessionComposer.tsx:512`
  (`SEM_AUTOFILL`); `apps/web/src/routes/StructuredQuestionCard.tsx:242`
  (`SEM_AUTOFILL`)
- **Teste:** `apps/web/src/routes/SessionPage.sessao.test.tsx:316` (Criativo
  ativado sem mensagem mantém a dica; com mensagem ela some — caso de falha;
  atributos do composer); `apps/web/src/routes/SessionPage.perguntas-estruturadas.test.tsx:201`
  (atributos dos campos das perguntas)
- **Origem:** AT-353

<a id="rn-694"></a>

### RN-694 — O catálogo de modelos tem busca, a credencial oferece o sync, e o primeiro modelo vai ao time num clique {#rn-694}

Três atalhos sobre ações que já existiam, nenhum endpoint novo (AT-357):

1. **Busca.** O catálogo tem um campo de busca que casa o nome de exibição, o
   `name` ou o `id` do modelo, sem diferenciar maiúsculas. Com termo, todo
   grupo e subgrupo de hub com resultado abre sozinho; busca sem resultado DIZ
   que nada casou, com o termo — nunca uma lista vazia muda.
2. **Sync ao lado da credencial.** O card de credencial cujo provider tem chave
   e NENHUM modelo no catálogo diz isso e oferece "Atualizar catálogo" — a
   MESMA ação do catálogo (`POST .../models/sync`). O botão só aparece para
   `owner` (o mínimo do endpoint, RN-102); ler o catálogo pede `maintainer`.
   O predicado é UM só, `providersSemCatalogo`, também usado pelo aviso do
   catálogo.
3. ~~Ativar e aplicar ao time.~~ **Retirado pela RN-911** (AT-597): o catálogo
   saiu das Configurações do projeto e mora em `/providers`, onde não há projeto
   para receber o binding. Ativar é curadoria de provider; a escolha por
   projeto segue pelo "aplicar a todos" da RN-476.

- **Onde:** `apps/web/src/lib/models.ts:244` (`casaComBusca`),
  `apps/web/src/lib/models.ts:491` (`providersSemCatalogo`),
  `apps/web/src/lib/models.ts:507` (`algumModeloAtivo`),
  `apps/web/src/routes/settings/CredentialsSection.tsx:123` (`handleSync`)
- **Teste:** `apps/web/src/components/catalogo-com-busca.test.tsx`
  (busca por id e sem resultado; sem atalho "ativar e aplicar"; sync no card,
  com e sem catálogo, e a falha)
- **Origem:** AT-357

## O instalador oferece os modelos locais, e não confunde o dev com uma instalação (RN-691, RN-692)

<a id="rn-701"></a>

### RN-701 — O painel de contexto não afirma "0" sobre regras que saíram da janela {#rn-701}

O painel "Contexto da sessão" lê os eventos já baixados (RN-180). Numa sessão
com mais eventos do que a janela, as regras de negócio emitidas no começo ficam
ANTES dela, e o contador dizia **0** com "Nada ainda." — afirmando sobre o que
não leu (medido na sessão de 268 eventos de 02/10: 5 regras viraram 0). Com
eventos anteriores à janela, o contador passa a dizer "N na janela · há mais
antes" e a seção vazia diz que não há nenhuma NOS EVENTOS CARREGADOS. Sem
leitura nova: o número de anteriores continua saindo da subtração sobre o
`seq`.

A outra metade do AT-365 — o cartão de aprovação já executado voltando a pedir
decisão — NÃO foi corrigida aqui: o card do fio já decide pelo `status` da
AÇÃO (`ApprovalCard`, `isPending`), e a leitura de ações é a cauda mais as
pendentes (RN-637); o defeito não reproduz pelo código do web.

Medição (02/10, no ambiente da AT-015): `GET .../actions?latest=true` da
sessão 17d41c20 devolve as duas `open_adr_pr` como `executed`, e recarregar a
sessão (com os blocos recolhidos abertos) não mostra nenhum "Aprovar". O
cartão pendente apareceu só DURANTE a sessão ao vivo — estado transitório da
tela, não da api nem da janela. A próxima rodada da AT-015 captura a rede no
momento em que ele aparecer, antes de qualquer correção.

- **Onde:** `apps/web/src/routes/ContextAside.tsx:402` (`trailing`), `:415`
  (`nadaNaJanela`)
- **Teste:** `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  ("RN-701 (AT-365): com as regras fora da janela, o contador não afirma 0";
  o caso de falha evitado é o "alcançando o começo da sessão" ao lado)
- **Origem:** AT-365

<a id="rn-708"></a>

### RN-708 — O projeto novo diz o próximo passo, derivado do que já se lê {#rn-708}

A Visão geral de um projeto recém-criado não dizia o que fazer: sem chave de
provedor, sem modelo e sem sessão, nada na tela apontava o caminho, e a
credencial e o catálogo moravam no fim de Configurações (medido no teste real
de 02/10, instalação nova). Desde a AT-372 a Visão geral abre com o cartão
"Primeiros passos", com TRÊS passos, cada um com o link para o lugar exato:

- **credencial** — a conta tem ao menos uma credencial de LLM (a mesma
  leitura `['credentials']` da seção de Credenciais, com o frescor de
  configuração e sem poll, RN-645). A Visão geral não fazia essa leitura, e a
  carga dela tem orçamento: ela só roda quando o time ainda não tem modelo;
  com modelo resolvido, o passo conta como coberto;
- **modelo** — o binding resolvido do Criativo não é nulo (o lote da RN-654,
  a mesma `queryKey` de Configurações);
- **ideação** — o projeto tem ao menos uma sessão (a lista que a página já
  polla).

Nenhuma rota nova. Insumo ainda não lido (ou com erro) é "não sei" (RN-470), e
o cartão NÃO aparece enquanto houver um — afirmar "falta credencial" sem ter
lido seria a tela mentindo. Com os três feitos, ele some. Junto, a aba
Configurações passou a abrir pelo grupo de modelos, com a credencial à frente,
e o sumário acompanha a ordem.

**Destinos (revisão da RN-911, AT-597):** o passo da credencial leva a `/providers`
(a chave é do usuário e deixou as Configurações do projeto) e o do modelo leva a
`?tab=settings&section=models`; o catálogo, que o passo antigo abria, também é
de `/providers`.

- **Onde:** `apps/web/src/lib/primeiros-passos.ts:37` (`derivarPrimeirosPassos`),
  `apps/web/src/components/PrimeirosPassos.tsx:22` (`PrimeirosPassos`)
- **Teste:** `apps/web/src/lib/primeiros-passos.test.ts` (caminho feliz e "insumo
  não lido não vira pendente") e `apps/web/src/routes/ProjectOverviewTab.test.tsx`
  ("primeiros passos (RN-708, AT-372)")
- **Origem:** AT-372

<a id="rn-709"></a>

### RN-709 — O cartão diz o tempo certo do verbo, o teto não oferece "sempre permitir", e o plano diz quanto custa e só sobe agente com tarefa {#rn-709}

Medido no projeto de teste de 02/10. Quatro defeitos de um mesmo cartão de
decisão, fechados juntos:

- **O verbo segue o estado da ação (AT-371).** O cartão pendente de PR dizia
  "abriu pull request (de ADR)" antes de abrir. `VERBO_DA_ACAO` fala da
  PROPOSTA ("quer abrir pull request…") e `VERBO_DA_ACAO_EXECUTADA` dá o verbo
  do que já aconteceu, só para os tipos cujo tempo muda; `verboDaAcao` recebe o
  `status` e é a fonte única.
- **PR de ADR e de infra são teto da RN-418 (AT-371).** `open_adr_pr` e
  `open_infra_pr` entram em `TIPOS_SEM_SEMPRE_PERMITIR` (api e a cópia do web,
  conferida por teste), como `pr_open` — "sempre permitir" recusa gravar o
  padrão e o cartão não oferece o botão nem o "Modo automático". Fora do
  terminal, as notas não falam mais de comando ("npm test", "roda qualquer
  comando"): o tipo tipado tem nota própria.
- **O plano mostra a estimativa (AT-381).** Ao propor `propose_execution_plan`
  a api acrescenta ao payload `orcamentoPorTarefaMicros` — o orçamento por
  tarefa VIGENTE, o mesmo que a ativação usa (setting do projeto ou o default
  de US$ 0,50) —, e a frase do cartão diz "até US$ X (N tarefas × US$ Y) — é o
  teto por tarefa, não o preço". Sem rota nova.
- **Módulo sem tarefa não ganha agente (AT-381).** Aplicar o plano passa à
  ativação os módulos com ≥ 1 tarefa (`modulosDoPlano`); os do `module_map`
  sem tarefa ficam de fora e são ditos no resultado (`modulosSemTarefa`), ao
  lado de `tarefasPorModulo`. O botão "Ativar execução" (sem plano) e o plano
  sem `tarefas` seguem subindo o mapa inteiro. O resumo calculado chega ao
  Dev Lead no texto do resultado da ferramenta (`resumo_do_plano/1`), para ele
  citar os números em vez de recontar.
- **O recreate do app diz que porta publica (AT-758).** Um `container_recreate`
  com `reason: 'app_declared'` (proposto pela api depois do merge da PR de infra
  que declara `run.app`) diz que o app foi declarado e mostra `http://127.0.0.1:<host>`:
  a porta do host (13000+) que aprovar publica. Os outros recreates mantêm a
  frase acima. O texto é `actions.containerRecreate.appDeclared` em
  `approvals.json` (quatro locales), resolvido por `i18n.t` em `aprovacoes.ts`.

- **Onde:** `apps/web/src/lib/aprovacoes.ts:485` (`verboDaAcao`),
  `apps/api/src/domain/actions/sempre-permitir.ts:33` (`TIPOS_SEM_SEMPRE_PERMITIR`),
  `apps/api/src/application/use-cases/actions/propose-action.use-case.ts:88` (`execute`),
  `apps/api/src/application/use-cases/execution/execute-execution-plan.use-case.ts:89` (`execute`),
  `apps/api/src/application/use-cases/execution/activate-execution.use-case.ts:123` (`execute`),
  `apps/engine/lib/engine/agents/dev_lead_tools.ex:674` (`resumo_do_plano`)
- **Teste:** `apps/web/src/lib/aprovacoes.test.ts` ("AT-371 — o verbo segue o
  estado da ação", "AT-381 — o plano mostra a estimativa de gasto"),
  `apps/web/src/components/ApprovalCard.test.tsx` ("open_adr_pr pendente"),
  `apps/api/test/domain/actions/sempre-permitir.spec.ts`,
  `apps/api/test/application/use-cases/execution/activate-execution.use-case.spec.ts`
  ("módulos do plano"), `apps/api/test/application/use-cases/execution/execute-execution-plan.use-case.spec.ts`,
  `apps/engine/test/engine/agents/dev_lead_tools_test.exs` (`resumo_do_plano/1`)
- **Origem:** AT-371, AT-381

<a id="rn-712"></a>

### RN-712 — O fio da sessão mostra o que acabou de acontecer, uma vez e legível {#rn-712}

Medido no teste real de 02/10 (`loja-teste`): a faixa do turno mostrava
Markdown cru, a resposta do formulário estruturado aparecia duas vezes, o
seletor de handoff manual oferecia Dev Lead, QA e Infra desde o primeiro
minuto da ideação, o "Para" ficava no PO com o Arquiteto já trabalhando, o
botão "Iniciar ideação" reaparecia no meio da sessão e um docker-compose de 80
linhas empurrava a conversa para fora da tela. Desde a AT-375:

- **faixa do turno** — a prévia e as linhas expandidas passam por
  `textoPlanoDoMarkdown`: `**`, `##`, réguas, tabelas e crases viram texto
  corrido. A faixa é prévia; a resposta renderizada continua sendo a bolha do
  fim do turno (RN-460), e o store do streaming não muda (RN-639);
- **formulário respondido** — a api reenvia as respostas ao agente como
  `chat.message` do usuário; a bolha cujo texto é EXATAMENTE o que a api monta
  (`"<n>. <rótulo>: <resposta>"`), primeira mensagem de usuário depois da
  resposta, sai do fio, porque o card respondido já as mostra. Mensagem
  digitada que só pareça uma lista fica;
- **destinatário** — a escolha feita no SELETOR do composer é manual e nunca é
  sobrescrita. A que veio de um gesto (aceitar handoff nesta tela, "Estou
  pronto") segue o destino do último handoff ACEITO, inclusive o aceito pelo
  sistema (RN-660). Revisa a cláusula da RN-631 de que um aceite por outro
  caminho "só acrescenta a opção" — só para escolha que não foi manual. Sem
  escolha nenhuma e com duas opções o envio continua travado;
- **handoff manual** — o seletor nasce recolhido atrás de um botão; a lista de
  agentes não mudou;
- **"Iniciar ideação"** — some do cabeçalho assim que algum agente entrou na
  sessão (evento de agente ou handoff);
- **cabeçalho** — o horário vira "iniciada às HH:MM:SS", e a origem do idioma
  quebra em até duas linhas antes de elipsar, com o texto inteiro no `title`;
- **bloco de código** — acima de 20 linhas nasce recolhido nas 8 primeiras,
  com "Mostrar as N linhas".

Fica de fora, medido: a primeira bolha do Criativo "modelo não registrado" vem
do ENGINE — `criativo_server.ex` grava o texto acumulado com `modelName` nulo
quando o turno termina entregando um formulário (`gravar_texto_do_turno(state,
"", nil)`), não da tela.

- **Onde:** `apps/web/src/lib/texto-plano.ts:7` (`textoPlanoDoMarkdown`),
  `apps/web/src/lib/eco-de-formulario.ts:17` (`ecosDeRespostaEstruturada`),
  `apps/web/src/lib/session-destinatario.ts:255` (`resolverDestinatario`),
  `apps/web/src/components/ui/MarkdownMessage.tsx:99` (`CodeFence`)
- **Teste:** `apps/web/src/lib/texto-plano.test.ts`,
  `apps/web/src/lib/eco-de-formulario.test.ts`,
  `apps/web/src/lib/session-destinatario.test.ts` ("RN-712"),
  `apps/web/src/components/ui/MarkdownMessage.test.tsx` ("RN-712")
- **Origem:** AT-375

## Uma chave de cache, uma pergunta (RN-718)

<a id="rn-718"></a>

### RN-718 — Quem grava as ações de uma sessão no cache faz a MESMA leitura do fio {#rn-718}

`['session-actions', projectId, sessionId]` é UMA entrada do cache do TanStack
Query, e a aba Sessões gravava nela o resultado de outra pergunta: a PRIMEIRA
página crescente (`listActions({ limit: 200 })`, sem `latest`), enquanto o fio
da Sessão lê a cauda das 200 mais novas mais as pendentes que ela empurrou
([RN-637](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-637)). As duas telas trocavam o recorte uma da outra — depois de
abrir a aba, o fio podia desenhar as 200 ações mais ANTIGAS da sessão, o
defeito que a RN-637 fechou, reaberto pela porta do cache (AT-365).

**A regra:** a chave e a função andam juntas, em `consultaDasAcoesDaSessao`
(`apps/web/src/lib/acoes-da-sessao.ts`). Quem LÊ as ações de uma sessão para
pôr no cache usa esse par — `usePendingActions` e o resumo por sessão da aba
Sessões. Chave própria para a aba foi considerada e descartada: pararia a troca
de cache, mas manteria a aba resumindo o recorte errado. Com a mesma leitura, o
resumo ganha — a pendente nova de uma sessão longa passa a contar em
"aguardando". Quem só INVALIDA a chave (decisão nas telas de aprovação, o canal
vivo) continua escrevendo a lista à mão: invalidar não grava dado.

- **Onde:** `apps/web/src/lib/acoes-da-sessao.ts:76` (`chaveDasAcoesDaSessao`),
  `:80` (`consultaDasAcoesDaSessao`); `apps/web/src/lib/hooks.ts:432`
  (`usePendingActions`); `apps/web/src/routes/ProjectSessionsTab.tsx:274`
  (`acoesPorSessao`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` (describe "a
  leitura de ações é a mesma do fio": com o fio tendo gravado a cauda, montar a
  aba deixa a cauda + pendente no cache e nenhuma chamada sem `latest` — falha
  no código antigo, que gravava as 200 mais antigas; e a pendente empurrada
  para fora da cauda conta em "aguardando")
- **Lacuna declarada:** o cartão de uma ação cujo `proposed_action.created`
  saiu da janela de 200 eventos ainda SALTA para o topo do fio
  (`ordemDaAcaoNaTimeline` degrada para `createdAt` e ancora em 0.5) — fixado
  como comportamento atual em
  `apps/web/src/routes/SessionPage.acao-fora-da-janela.test.tsx`, cuja
  correção é decisão separada. O mesmo teste prova que o cartão decidido não
  volta a pedir decisão: o que pareceu "voltar" no AT-365 era OUTRA ação.
- **Origem:** AT-365
