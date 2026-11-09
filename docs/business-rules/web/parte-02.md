---
id: rn-web-parte-02
title: 'Regras de negócio — Web — parte 2 (desde RN-124)'
sidebar_label: 'Web — parte 2 (desde RN-124)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 2 (desde RN-124)

## Painel de projetos

<a id="rn-124"></a>

### RN-124 — O PO narra épico/história criados no fio, com link direto pro Backlog {#rn-124}

`backlog.epic_created`/`backlog.story_created` — que o PO já gravava no
event log (`CreateEpicUseCase`/`CreateStoryUseCase`) — não tinham
tratamento nenhum na timeline da sessão: criar história não deixava rastro
NENHUM no fio, só na aba Backlog, pra quem já soubesse ir olhar lá. Os dois
tipos ganham entrada na timeline, no MESMO corpo visual das outras
mensagens do agente (`.message`/`.bubble`) — nenhuma classe nova pro chip
em si, só o link.

O link ("Ver no Backlog") reusa o deep-link genérico da aba (`?tab=backlog`,
o mesmo mecanismo do CTA "Definir orçamento" do card do dashboard) — não
tenta realçar a história recém-criada dentro da aba, que é fora de escopo.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`timeline` — bloco
  `backlog.epic_created`/`backlog.story_created`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-inline-e-links.test.tsx`
  (`item 2`)
- **Verificado por execução real:** épico e história inseridos no event log
  de uma sessão real aparecem como "Épico criado"/"História criada" com o
  título, e o link navega pra `?tab=backlog` de verdade.
- **Origem:** pedido do usuário — link do PO pras histórias criadas, direto
  pro Backlog.

<a id="rn-125"></a>

### RN-125 — O aceite de handoff é INLINE no fio, com CTA pro Dev Lead apontando pra Executores {#rn-125}

O divisor "X passou o bastão ao Y" que já existia na timeline (`handoff.offered`)
vira um **card acionável** — com o botão de aceitar embutido — sempre que
representa a oferta pendente **atual** (a mesma que `offeredHandoff` já
resolvia para o botão da topbar). O botão da topbar **saiu**: com o aceite
morando dentro do fio, no lugar exato onde a passagem aconteceu, manter os
dois puxaria dois botões com o texto IDÊNTICO visíveis ao mesmo tempo — o
mesmo problema que `ApprovalCard` já evita ao nunca duplicar a ação fora do
fio (RN-096).

**Qual evento vira o card é decidido por PAR, não por id.** O payload de
`handoff.offered` carrega só `toAgent`; o `fromAgent` é o `actor` do evento
(RN-054 já usava essa leitura para o texto do divisor). Sem o id do handoff
no evento, "esta é a oferta atual" é respondido achando o `handoff.offered`
mais RECENTE (maior `seq`) com o MESMO par `fromAgent`/`toAgent` de
`offeredHandoff` — o que impede reabrir um convite de aceite que uma oferta
mais antiga pro mesmo par já tenha resolvido (aceita, recusada ou superada
por uma oferta nova).

**O card pro Dev Lead ganha um segundo link**, "Acompanhe a execução em
Executores", pra aba que já existe (RN-121) — é o início da EXECUÇÃO, e quem
aceita precisa saber onde olhar depois. As outras ofertas (PO, Arquiteto…)
não ganham o link: a sessão delas segue sendo o próprio lugar de acompanhar,
não há "onde mais olhar".

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`timeline` — bloco
  `handoff.offered`, `offeredHandoffEventSeq`; `isActive` subiu para antes do
  `useMemo`), `apps/web/src/routes/SessionPage.module.css` (`.handoffCard`,
  `.timelineLink`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-inline-e-links.test.tsx`
  (card acionável só na oferta atual, oferta antiga do mesmo par fica muda,
  handoff já aceito não mostra botão nenhum, link de Executores só no
  `dev-lead`); `apps/web/src/routes/SessionPage.pista-e-status.test.tsx`
  atualizado para o botão inline (não mais na topbar)
- **Verificado por execução real:** aceitar um handoff pro PO numa sessão
  criativa contra um build isolado (stack Docker próprio, projeto/sessão
  reais) — o card vira divisor mudo e o log de eventos avança assim que o
  clique volta da api; o CTA pro Dev Lead navega pra `?tab=executores` de
  verdade.
- **Origem:** pedido do usuário — aceite de handoff também inline no fio,
  não só na topbar.

<a id="rn-126"></a>

### RN-126 — Promoção de história é decidível INLINE no fio, com o mesmo mecanismo da aba Backlog {#rn-126}

`backlog.story_promotion_proposed` (RN-048) ganha o mesmo tratamento que
RN-125 deu ao handoff: o evento vira **card acionável** na timeline da
sessão, com os botões "Promover" e "Devolver" chamando os MESMOS
`promoteStories`/`returnStory` que `PromotionQueue`
(`ProjectBacklogTab.tsx`) já usa — nenhum endpoint novo, nenhuma segunda
fonte de verdade. A decisão continua acontecendo em UM lugar (o backend), só
o gatilho ganhou um segundo caminho.

**Resolução por evento posterior, não por status derivado à parte.** O card
some sozinho (vira divisor mudo, sem botões) assim que um evento de seq
MAIOR decidir o destino da MESMA história —
`backlog.story_transitioned{storyId}` (promovida, emitido por
`PromoteStoriesUseCase` via `TransitionStoryUseCase`) ou
`backlog.story_promotion_returned{storyId}` (devolvida). Sem essa checagem,
promover ou devolver deixaria os mesmos dois botões plantados no fio,
oferecendo de novo uma decisão já tomada.

`backlog.story_promotion_returned` ganha narração simétrica no fio (motivo
incluído), reusando a mesma frase que `apps/web/src/lib/activity.ts` já
usava só no log colapsado da sidebar.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`timeline` — blocos
  `backlog.story_promotion_proposed`/`backlog.story_promotion_returned`,
  `handlePromoteStory`/`handleReturnStory`, modal de motivo reusando
  `Modal`/`Textarea`)
- **Teste:** `apps/web/src/routes/SessionPage.promocao-inline-e-volta.test.tsx`
  (card com os botões, promover chama `promoteStories` com o `storyId` do
  payload, devolver exige motivo e chama `returnStory`, história resolvida
  por `story_transitioned` posterior vira divisor mudo, `story_promotion_returned`
  narra com o motivo)
- **Origem:** pedido do usuário — promoção de história inline no fio, opção
  barata reusando RN-048 em vez de gatear a criação da história.

<a id="rn-131"></a>

### RN-131 — Três corridas confirmadas AO VIVO no fio da sessão: convite por cima do histórico, indicador ansioso e turno preso em `handleReadiness` {#rn-131}

Três defeitos achados navegando `SessionPage.tsx` de verdade no Chrome, não
por teste — e os três eram condição de corrida ou critério incompleto
disfarçado de decisão de produto.

**1. `conversaComecou` virou "existe QUALQUER evento", não "existe
`chat.message`/`agent.response`".** O critério anterior (achado G) nasceu
pra não confundir os cards do bootstrap do git com conversa, mas tinha o
efeito contrário: uma sessão criada pelo `git-bootstrap` (ações de
commit/branch já aprovadas, zero `chat.message`) mostrava o convite por
cima delas, e o mesmo acontecia — de forma bem mais grave — na sessão que a
ativação de execução usa, com dezenas de eventos reais (`tool.call`,
`tool.result`, eventos de task) e nenhum `chat.message`/`agent.response`: o
convite cobria o histórico de execução **inteiro**. Sessão nova é a única
sem nenhum evento — essa é a pergunta certa.

**2. `conviteVisivel` espera `useSessionEvents` terminar de carregar.** Em
cache frio (reload de página), `session` podia chegar enquanto `events`
ainda era `[]` — o default de `data?.items`, indistinguível de "sessão
vazia de verdade" até o primeiro fetch resolver. Sem o gate
`!eventsQuery.isPending`, o convite piscava por cima de sessões com
histórico grande.

**3. O indicador de "pensando" (bolha com os 3 pontinhos) só liga depois de
5s sem nenhum texto chegar.** Antes ele ligava no instante em que
`streaming`/`statusAgent` virava truthy — ruído visual na maioria dos
turnos, que respondem em menos de um segundo. Um `useEffect` arma um
`setTimeout(…, 5000)` quando o turno começa sem texto ainda, e o desarma (via
cleanup) assim que o primeiro delta chega ou o turno termina antes do prazo.
Texto de verdade (`streamingText`) continua aparecendo **na hora**, nunca
espera o timer — só o indicador vazio é que ganhou paciência.

**4. `handleReadiness` ganhou a mesma rede de segurança que `handleSend` já
tinha.** `confirmReadiness` é, como `sendAgentMessage`, um `GenServer.call`
síncrono no engine (até 120s) — e o canal Phoenix pode não ter terminado de
conectar (ticket + join, RN-108) quando o turno acaba, perdendo o broadcast
de `agent.done` pra sempre. `handleSend` já chamava
`finalizarTurnoDoAgente()` assim que a chamada síncrona resolvia,
independente do canal ter entregue o evento; `handleReadiness` tinha ficado
de fora dessa correção, e sem ela a bolha do agente ficava presa vazia
(`streaming: true`, sem texto) até a página recarregar.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`conversaComecou`,
  `conviteVisivel`, o `useEffect` de `pensandoVisivel` logo abaixo de
  `agenteExibido`, e o bloco de sucesso de `handleReadiness`)
- **Teste:**
  `apps/web/src/routes/SessionPage.convite-so-em-sessao-vazia.test.tsx`
  (sessão vazia mostra o convite; sessão com eventos de git-bootstrap ou com
  dezenas de `tool.call`/`tool.result` esconde; `eventsQuery.isPending`
  segura o convite até o primeiro fetch resolver),
  `apps/web/src/routes/SessionPage.pista-e-status.test.tsx` (achado B —
  indicador não aparece antes de 5s, aparece depois, some no primeiro delta
  e nunca aparece quando o turno termina antes do prazo), e
  `apps/web/src/routes/SessionPage.readiness-turno-preso.test.tsx`
  (`confirmReadiness` resolvendo sem `onAgentDone` reconcilia o estado do
  mesmo jeito que `SessionPage.turno-preso.test.tsx` já prova pra
  `handleSend`)
- **Origem:** investigação AO VIVO do produto no Chrome — os três reproduzidos
  manualmente antes da correção.

<a id="rn-136"></a>

### RN-136 — O card acionável de handoff no chat só considera quem CONVERSA nesta tela {#rn-136}

> **Desde o [ADR 0185](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0185-estou-pronto-fecha-os-dois-gates.md)
> ([RN-658](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-658))** o handoff Criativo→PO que o "Estou pronto" pediu
> nasce e é aceito na mesma chamada, em nome de quem clicou — o card de
> aceite dele só aparece quando esse aceite não cabe (sessão anterior ao ADR,
> brief que não veio do clique) ou falhou. O filtro abaixo não muda.

`OfferInfraHandoffUseCase` oferece o handoff pro Infra e, na MESMA
confirmação, oferece pro Dev Lead logo em seguida (FASE 14d) — duas chamadas
separadas, a de Infra primeiro. `handoffs` (o que `SessionPage.tsx` lê de
`useHandoffs`) vem ordenado por `createdAt` ASC
(`DrizzleHandoffRepository#findBySession`), e o `offeredHandoff` que decide
qual card vira "acionável" resolvia com um `.find()` puro — sempre o
`offered` mais **antigo**. Como o Infra Lead não é conversacional (não está
em `AGENTES_DE_CHAT`, e nunca é aceito por esta tela), o card do Dev Lead só
ficaria acionável depois de alguém aceitar o de Infra num lugar que esta
tela não mostra — na prática, nunca: o usuário só via "aceitar handoff de
Infra" e o convite pro Dev Lead ficava invisível atrás dele.

O filtro restringe `offeredHandoff` a handoffs endereçados a um agente de
`AGENTES_DE_CHAT`. O handoff pro Infra continua **narrado** no fio — o
`handoff.offered` dele vira divisor mudo, como qualquer oferta que não é "a
atual" — só o card com botão é que passa a ignorá-lo: Infra nunca teve (nem
precisa ter) um jeito de ser aceito por aqui.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`offeredHandoff`)
- **Teste:**
  `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`,
  describe "problema 1" — Infra mais antigo + Dev Lead mais novo resolve pro
  card do Dev Lead, nunca pro de Infra; só Infra `offered` não mostra card
  nenhum
- **Origem:** investigação de código + teste ao vivo no Chrome — o handoff
  pro Dev Lead nunca ficava acionável depois da FASE 14d

<a id="rn-137"></a>

### RN-137 — "Ativar execução" tem atalho inline no card do Dev Lead, sem baixar a exigência de papel {#rn-137}

O card de aceite do handoff pro Dev Lead ganhou um botão "Ativar execução"
ao lado do link "Acompanhe a execução em Executores" — atalho pra quem já
sabe o que quer, sem passar pela conversa. Chama a MESMA
`activateExecution` que a Visão Geral usa, agora com `sessionId` (a sessão
de chat aberta) como `originSessionId` — sem isto a sessão que trouxe o
Dev Lead ficava `active` para sempre, mesmo com a execução (numa sessão
SEPARADA) já tendo decolado por este atalho ([RN-135](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-135)).

**A rota continua exigindo `maintainer`** — DELIBERADAMENTE não alinhada ao
`developer` que já basta pra aceitar o handoff no mesmo card. Quem ativa
vira `session.createdBy` da sessão de execução, e é esse papel que
`ProposeActionUseCase` resolve (`ResolveEffectiveRoleUseCase.forProject`)
como o EFETIVO de todo `git_commit`/`git_push`/`pr_open` que os dev agents
propuserem dali em diante — é o mesmo motivo que já justificava o
`maintainer` do botão da Visão Geral
(`ExecutionController#activate`). Baixar a exigência aqui inverteria essa
resolução em silêncio: toda PR que a execução abrisse passaria de
`auto_approve` para `require_approval` sempre que quem clicou fosse
`developer`, sem ninguém ter decidido isso. Quem não é `maintainer` recebe
a frase real da api ("Papel insuficiente para esta ação", via
`mensagemDaApi`) em vez de um erro genérico.

Sem gate de `module_map` client-side: quando este card existe, o Arquiteto
já o definiu — é o artefato que precede a oferta do handoff pro Dev Lead —,
então replicar o `disabled={!hasModuleMap}` da Visão Geral travaria o botão
à toa. O caso raro (sessão inconsistente) cai no mesmo catch que trata
403/outros erros.

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
  (`handleActivateExecution`), `apps/web/src/lib/api-client.ts`
  (`activateExecution` ganhou `originSessionId`)
- **Teste:**
  `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`,
  describe "problema 2" — clique chama `activateExecution` com
  `sessionId`; 403 mostra a frase real da api; o botão convive com o de
  aceitar o handoff e com o link de Executores
- **Origem:** investigação de código + teste ao vivo no Chrome — pedido de
  atalho, com a divergência de papel confirmada e mantida por decisão
  (não corrigida por alinhamento automático)

<a id="rn-138"></a>

### RN-138 — Mensagens de um agente colapsam depois que ele passa o bastão {#rn-138}

A timeline do chat mostrava tudo sempre expandido, sem agrupar por autor —
numa sessão longa com Criativo, PO e Arquiteto se revezando, o histórico de
quem já saiu de cena competia por espaço com quem está falando agora. Cada
entrada da timeline ganhou um `agentId` (o `actor.id` de quem a gerou,
quando é um agente — `agent.response`, `agent.error`, épico/história
criados pelo PO, card de aprovação); entradas de usuário e as que marcam
uma TRANSIÇÃO (handoff, promoção de história) ficam sem `agentId` de
propósito, porque são pontos de corte por natureza.

Uma sequência CONSECUTIVA do mesmo `agentId` vira cabeçalho colapsável
(`Disclosure` do design system, fechado por padrão — nome do agente +
contagem, reabre com um clique) quando as duas condições valem:

1. **o agente já passou o bastão** — existe um handoff dele (`fromAgent`)
   com `status: 'accepted'` (a mesma verdade que o `handoff.accepted` do
   event log grava, sem precisar reconstruir por junção de evento); e
2. **nenhuma ação dele está `pending`** — a checagem é por `actor.id` em
   TODAS as `actions` da sessão, não só nas da sequência corrente: uma
   corrida de aprovação em aberto não pode ficar escondida atrás de um
   clique em NENHUM ponto do fio.

Uma sequência de 1 entrada nunca colapsa — "Fulano · 1 mensagem" no lugar
da própria mensagem não ganha nada. Qualquer entrada sem `agentId`, ou de
um agente diferente, quebra a sequência corrente exatamente como uma troca
de agente quebra — só agrupa o que é realmente consecutivo.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`TimelineEntry.agentId`,
  `timelineAgrupada`), `apps/web/src/routes/SessionPage.module.css`
  (`.agentGroup*`)
- **Teste:**
  `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`,
  describe "problema 3" — colapsa com bastão passado e sem ação pendente;
  não colapsa sem handoff aceito; não colapsa com ação pendente do mesmo
  agente; mensagem de outro autor no meio quebra o agrupamento
- **Origem:** investigação de código + teste ao vivo no Chrome — pedido de
  colapso, com `AgentTimelineTree`/`timeline-tree.ts` como referência de
  FORMA (agrupar por agente, nome + contagem, aberto/fechado), adaptada à
  timeline heterogênea intercalada do chat

---

<a id="rn-144"></a>

### RN-144 — A aba Criativo não lista a sessão de execução vigente {#rn-144}

A sessão que recebe `execution.activated` e os eventos de tool-call dos dev
agents precisa nascer com `kind: 'criativa'` — regra estrutural (RN-097,
`garantirQuePodeAtivarExecucao`), sem isso o evento é recusado. Como
`ProjectSessionsTab` (a aba Criativo, RN-104) lista sessões filtrando só por
`session.kind === 'criativa'`, a sessão de execução aparecia MISTURADA na
lista ao lado de ideações de verdade — abrir ela em `SessionPage.tsx` mostra
uma timeline inteira de tool-calls de dev agent, parecendo (pro usuário) "o
dev escrevendo no chat do Criativo". Confirmado ao vivo: uma sessão real com
35+ eventos de dev agent aparecia normal na lista, ao lado de sessões reais
de ideação.

A correção reusa o sinal que a [RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139) já expõe —
`useActiveExecutionSession`/`GET /projects/:projectId/execution/session` — em
vez de o backend calcular um campo novo por sessão (`hasExecutionActivated`
ou equivalente). A aba Criativo busca a sessão vigente e a exclui da lista
renderizada:

- a busca só roda na aba Criativo (`enabled` desligado em `kind !==
  'criativa'`) — a aba Chat nunca fez essa chamada e continua sem fazer;
- o filtro é por `id`, depois do filtro por `kind` já existente — não muda o
  que a lista É, só o que ela EXCLUI.

**Decisão deliberada de escopo:** isto cobre só a execução VIGENTE, não
execuções ANTIGAS já encerradas (`execution.activated` gravado numa sessão
que hoje está `closed`). Calcular isso pediria o backend anotar, por sessão,
se ela tem o evento gravado — mudança no repositório e no endpoint de
listagem, para um caso residual: uma sessão de execução ANTIGA aparece com o
badge `closed`, o que já sinaliza "não é uma ideação ativa" de um jeito bem
menos ambíguo do que a vigente (que aparecia `active`, indistinguível de uma
ideação em andamento). Se isso voltar a confundir na prática, a saída é o
endpoint de listagem devolver o sinal por sessão — não um `filter` a mais no
front por sessão antiga.

- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx`
  (`ProjectSessionsTab`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` — a vigente
  some da lista Criativo com sessões normais ao lado, a aba Chat não chama a
  busca de execução vigente, e sem execução vigente (`null`) a lista aparece
  inteira
- **Origem:** achado de investigação de código + teste ao vivo — sessão real
  com execução ativa aparecendo misturada na aba Criativo

<a id="rn-147"></a>

### RN-147 — O cabeçalho do grupo colapsado mostra o ícone do agente, não só o nome {#rn-147}

O `Disclosure` de `timelineAgrupada` ([RN-138](#rn-138)) recebia só a STRING
do nome em `titulo` — cada mensagem expandida já tem um avatar (`.avatar` +
ícone), e o cabeçalho colapsado perdia essa pista visual justamente onde ela
mais ajuda a escanear o fio.

`AvatarDoAgente` reusa a MESMA caixa `.avatar` das mensagens expandidas, mas
o ícone escolhido é o do ROSTER (`AGENTS[id].icon`) — a mesma fonte que já
identifica "quem está falando" no indicador de streaming (`agenteExibido.icon`,
[RN-131](#rn-131)) — e não o ícone por TIPO de evento que cada entrada
expandida usa (`ModelIcon` em `agent.response`, `StackIcon` em
`backlog.*_created`, `AlertCircleIcon` em `agent.error`). Um grupo colapsado
pode misturar esses tipos de entrada de um mesmo agente; o cabeçalho
representa o AGENTE, não a última entrada dele, e só o ícone do roster é
estável para isso. Sem `id`, ou agente fora do roster, degrada para
`ModelIcon` — nunca para uma caixa vazia.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`AvatarDoAgente`,
  `timelineAgrupada`), `apps/web/src/routes/SessionPage.module.css`
  (`.agentGroupTitulo`)
- **Teste:** `apps/web/src/routes/SessionPage.arquiteto-modelo-icone.test.tsx`,
  describe "problema 3" — o cabeçalho colapsado tem o PATH do ícone do PO
  (`UserIcon`), não só um SVG decorativo genérico
- **Origem:** investigação de código — `Disclosure` já aceitava `ReactNode`
  em `titulo`; faltava passar o avatar junto do nome

<a id="rn-148"></a>

### RN-148 — Histórias com promoção pendente ao mesmo tempo viram carrossel, não N cards {#rn-148}

O PO cria histórias uma a uma, e cada `backlog.story_promotion_proposed`
([RN-126](#rn-126)) virava um card avulso na timeline — numa leva de várias
histórias, isso empilhava N cards idênticos disputando o mesmo espaço,
misturados com o resto da narração.

Uma **leva** é o conjunto de propostas de promoção AINDA PENDENTES na
sessão, avaliado a cada render — não "criadas em sequência sem
interrupção". O critério é o MESMO que cada card avulso já usava sozinho
para decidir se virou card acionável ou divisor (nenhum
`backlog.story_transitioned`/`backlog.story_promotion_returned` posterior
com o mesmo `storyId`), só que olhado de uma vez para a sessão inteira:

- **0 ou 1 pendente:** nada muda — card avulso de sempre (a degradação é
  deliberada: um carrossel de um slide só não ganha nada virando carrossel).
- **2+ pendentes ao mesmo tempo:** viram UM `Carousel` (novo no design
  system, `apps/web/src/components/ui/Carousel.tsx`), inserido na posição
  da PRIMEIRA proposta ainda pendente; as demais somem como card
  individual — cada uma vira um SLIDE dele. Cada slide mostra a mesma
  frase do card avulso ("história … pronta, aguardando sua promoção"), um
  resumo/RF se o payload trouxer (hoje não traz — ver abaixo), e os botões
  Promover/Devolver daquela história específica, chamando os MESMOS
  `promoteStories`/`returnStory` de sempre.
- **"Aprovar todas"** no cabeçalho do carrossel chama `promoteStories` com
  os ids de TODAS as pendentes numa chamada só — o endpoint já era lote
  (`promoteStories(projectId, storyIds[])`, RN-048), então não houve mudança
  de contrato nenhuma, só de quem monta a lista.
- Uma história resolvida (promovida ou devolvida) enquanto o carrossel está
  aberto sai da leva no próximo render (a query de eventos é invalidada nas
  duas ações) — se sobrar só 1 pendente, o carrossel se desfaz sozinho e o
  card volta a ser avulso.

`resumo`/RF no slide é campo PRONTO, não usado: `CreateStoryUseCase` hoje só
grava `storyId`/`epicId`/`title` no payload de `backlog.story_promotion_proposed`
— sem descrição nem requisitos funcionais. O slide já sabe exibir
`description`/`rf` se o payload um dia carregar (degrada pro título sozinho
até lá); estender o payload ficou fora desta entrega, por não ter sido
pedido.

- **Onde:** `apps/web/src/components/ui/Carousel.tsx` (componente novo,
  navegação genérica), `apps/web/src/routes/SessionPage.tsx`
  (`promocoesPendentes`, `ehLevaDeHistorias`, `StorySlide`,
  `handlePromoteAll`), `apps/web/src/routes/SessionPage.module.css`
  (`.storySlide`)
- **Teste:** `apps/web/src/components/ui/Carousel.test.tsx` (navegação,
  ARIA, só o slide atual montado, índice clampado quando a lista encolhe),
  `apps/web/src/routes/SessionPage.carrossel-historias.test.tsx` (3+
  pendentes viram carrossel; "Aprovar todas" manda o lote inteiro; promoção
  e devolução unitárias continuam funcionando a partir de um slide
  navegado; 1 pendente degrada pro card simples; história resolvida sai da
  leva e o carrossel recalcula a contagem)
- **Origem:** pedido do usuário — histórias produzidas em lote pelo PO
  ficavam difíceis de decidir uma por uma no fio

<a id="rn-152"></a>

### RN-152 — A branch de uma task diz de qual dev agent e módulo ela é, no dropdown da aba Code {#rn-152}

`CodeBranchPicker` já listava toda branch do repositório, inclusive as dos
dev agents (`feature/task-XXXXXXXX`, `Engine.Dev.AgentIo`), mas sem pista
nenhuma de quem a criou — só o nome cru. `ReadProjectCodeUseCase.branches`
resolve isso sem chamada a mais ao provider de git: os 8 chars depois de
`feature/task-` são exatamente o primeiro grupo hifenizado do uuid da task
(`"feature/task-" <> String.slice(to_string(row.task_id), 0, 8)`, não um
substring arbitrário), então casam contra `TaskRepository
.findByProjectAndIdPrefix` (join por PROJETO, pra prefixo de 8 chars nunca
vazar task de outro projeto). O `assignedTo` da task é o agent_id
(`dev-<modulo>`/`dev-<modulo>-2`, RN-087); o módulo é resolvido comparando
contra o `module_map` VIGENTE do projeto pelas MESMAS funções que o geraram
(`devAgentId`/`extraDevAgentId` em `activate-execution.use-case.ts`) — nunca
por regex reversa, que degeneraria em ambiguidade pra nome de módulo com
caractere especial.

`producedBy: { agentId, moduleId } | null` é degradação honesta, do mesmo
jeito que `ahead`/`behind` já são: `null` pra branch sem o padrão (manual do
usuário, ou `main`/`dev`/`qa`), e também quando o padrão bate mas a
task/módulo não são mais resolvíveis (task apagada, módulo removido do mapa
vigente) — nunca um valor inventado. No dropdown, cada branch produzida por
um dev ganha o ícone e a cor do agente (`AGENTS`/`agents.ts`, RN-087),
reaproveitando a MESMA degradação que `apps/web/src/lib/agent-status.ts` já
usa pro roster ao vivo: módulo sem chave fixa em `AGENTS` herda ícone/cor de
`dev-backend`.

- **Onde:** `apps/api/src/application/use-cases/git/read-project-code.use-case.ts`
  (`branches`/`producedBy`/`moduloDoAgente`),
  `apps/api/src/application/ports/backlog-repository.port.ts`
  (`TaskRepository.findByProjectAndIdPrefix`),
  `apps/api/src/infrastructure/persistence/drizzle/backlog.repository.ts`,
  `apps/api/src/interfaces/http/git/dto/code.response.dto.ts`
  (`CodeBranchProducedByResponseDto`), `apps/web/src/lib/api-types.ts`
  (`CodeBranchProducedBy`), `apps/web/src/routes/code/CodeBranchPicker.tsx`
  (`IconeDoAgenteProdutor`/`defDoAgenteProdutor`)
- **Teste:**
  `apps/api/test/application/use-cases/git/read-project-code.use-case.spec.ts`
  (describe "producedBy da branch de task" — task resolvida com módulo e com
  o agente extra `-2`, branch fora do padrão nunca ganha `producedBy` mesmo
  com task de prefixo casável, prefixo sem task no projeto, módulo removido
  do mapa vigente e task sem dono ainda degradam pra `null`),
  `apps/web/src/routes/code/CodeBranchPicker.test.tsx` (branch de task mostra
  o selo do dev agent dono; branch sem padrão não ganha selo nenhum)
- **Origem:** pedido do usuário — nenhuma pista visual de quem criou a
  branch no dropdown rico da FASE 26b

<a id="rn-156"></a>

### RN-156 — indicador de espera de 5s tem texto fixo, sem interpolar o agente {#rn-156}

O indicador que aparece depois de 5s sem resposta (`pensandoVisivel`) mostra
a frase fixa "Reunindo informações...", sem o nome do agente interpolado —
substitui o texto anterior "{Agente} está escrevendo…". O nome do agente já
é visível no cabeçalho assim que o streaming de texto real começa; repeti-lo
no indicador de espera não ajudava a leitura.

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
- **Teste:** `apps/web/src/routes/SessionPage.pista-e-status.test.tsx`,
  `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx`
- **Origem:** achado de PR #286 — o texto anterior nomeava um agente que já
  estava visível no cabeçalho

<a id="rn-157"></a>

### RN-157 — criação de épico/história pelo PO vira aviso compacto, não bolha completa {#rn-157}

Os eventos `backlog.epic_created`/`backlog.story_created` deixam de
renderizar como bolha completa de mensagem (`.message`/`.bubble`, avatar de
32px — o mesmo peso visual de uma resposta de agente de verdade) e passam a
usar o mesmo formato de aviso compacto que `.handoffDivider`/`.handoffPill`
já usa para a passagem de bastão: linha centralizada com filete horizontal e
pílula compacta, mantendo o link "Ver no Backlog". `agentId` continua
populado no `TimelineEntry` — ao contrário do divisor de handoff, isto não
marca uma transição entre agentes, é uma ação do PO dentro do próprio turno
dele, e segue elegível ao colapso por agente ([RN-138](#rn-138)).

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
- **Teste:** `apps/web/src/routes/SessionPage.handoff-inline-e-links.test.tsx`,
  `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx`
- **Origem:** achado de PR #286 — a bolha completa tinha peso visual igual a
  uma resposta de agente de verdade, para uma ação de metadado do PO

<a id="rn-158"></a>

### RN-158 — Markdown leve com highlight no chat {#rn-158}

`agent.response` no fio da Sessão renderiza um subconjunto de Markdown
(negrito `**texto**`, itálico `*texto*`/`_texto_`, código inline
`` `texto` ``, cabeçalho `#`/`##`/`###`, lista `-`/`1.`, link
`[texto](url)` e fence de código ```` ```linguagem ````), via parser
próprio por regex (`apps/web/src/lib/markdown.ts`), sem dependência nova.
`chat.message` (texto digitado pelo usuário) permanece literal — Markdown
só se aplica à SAÍDA de um agente/LLM, nunca à entrada humana.

Segurança: o parser nunca produz HTML — devolve uma árvore de dados que
`MarkdownMessage.tsx` converte em elementos React diretamente (nunca
`dangerouslySetInnerHTML`). Um link só vira `<a href>` clicável quando o
esquema da URL é `http`, `https` ou relativo (`/...`, `#...`); qualquer
outro esquema (`javascript:`, `data:`, etc.) degrada para o texto do link,
nunca para um `href` executável.

Código dentro de um fence ganha realce por token, reusando
`highlightLine`/`highlightFile` de `apps/web/src/routes/code/highlight.ts`
— a mesma função que já colore a aba Code. `sh`/`bash` ganharam
vocabulário próprio de palavras-chave de shell (antes só tinham o
comentário de linha `#` mapeado e caíam no fallback de JS). Fences
```` ```sh ````/```` ```bash ```` ganham a estética visual de terminal
(prompt `$` por linha de comando), consistente com o `$ comando` que
`ApprovalCard` já usa para a ação `terminal`.

- **Onde:** `apps/web/src/lib/markdown.ts`,
  `apps/web/src/components/ui/MarkdownMessage.tsx`,
  `apps/web/src/routes/code/highlight.ts`
- **Teste:** `apps/web/src/lib/markdown.test.ts`,
  `apps/web/src/components/ui/MarkdownMessage.test.tsx`,
  `apps/web/src/routes/code/highlight.test.ts`,
  `apps/web/src/routes/SessionPage.markdown-resposta.test.tsx`
- **Origem:** PR #288 — respostas de agente com listas, código e links
  chegavam como texto cru no fio, sem estrutura nenhuma

<a id="rn-159"></a>

### RN-159 — Artefatos Gerados agrupados por agente {#rn-159}

O painel "Artefatos gerados" da Sessão (`ContextAside` em
`SessionPage.tsx`) lista PR de dev (`pr_open`), PR de ADR do Arquiteto
(`open_adr_pr`) e épico/história criados pelo PO
(`backlog.epic_created`/`backlog.story_created`), agrupados por
`agentId` — quem gerou cada artefato — com o mesmo padrão de
`Disclosure` colapsável da [RN-138](#rn-138) (nome do agente + contagem,
expansível pro título de cada artefato).

Cada artefato navega pro lugar onde ele vive: PR (dev ou ADR) abre a URL
real (`executionResult.pullRequestUrl`, mesmo campo que
`ProjectOverviewTab.tsx` já lê para PR de ADR); épico/história navega
para `/projects/:projectId?tab=backlog` (mesmo padrão `Link` já usado nos
avisos compactos do PO no fio principal, [RN-124](#rn-124)/
[RN-157](#rn-157)). PR ainda sem `pullRequestUrl` (execução pendente)
aparece no painel sem virar link clicável.

Fora de escopo, por decisão registrada em comentário no código
(`ContextAside` em `SessionPage.tsx`): module_map/C4 — são estado
VIGENTE do projeto (uma versão corrente, sobrescrita a cada geração), não
um artefato datado por SESSÃO como PR/épico/história; a aba Visão Geral
(`ProjectOverviewTab.tsx`) já é o lugar deles hoje, sem âncora própria —
endereçar isso é fora do escopo desta entrega.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`ContextAside`)
- **Teste:** `apps/web/src/routes/SessionPage.artefatos-gerados.test.tsx`
- **Origem:** PR #288 — o painel não distinguia quem gerou cada artefato
  nem cobria PR de ADR e épico/história, só PR de dev

<a id="rn-160"></a>

### RN-160 — "Confirmar arquitetura pronta" exige pelo menos 1 história promovida {#rn-160}

O botão "Confirmar arquitetura pronta" (handoff Arquiteto→Dev Lead, via
`confirmArchitectureReadiness`) nasce `disabled` até existir no backlog do
projeto pelo menos 1 história com status diferente de `draft` — ou seja, já
promovida por `PromoteStoriesUseCase`/`TransitionStoryUseCase` ([RN-048](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-048)),
não bastando ter regra de negócio capturada. `in_progress`/`done` também
contam, porque só se chega lá tendo passado por `ready`. A fonte é a MESMA
que a aba Backlog já usa (`useBacklog`, `ProjectBacklogTab.tsx`, mesma
queryKey `['backlog', projectId]`) — sem round-trip novo. Enquanto não há
história promovida, o botão mostra a dica em `title` explicando o motivo.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`hasPromotedStory`,
  render do botão)
- **Teste:** `apps/web/src/routes/SessionPage.readiness-arquitetura-exige-historia.test.tsx`
- **Origem:** pedido do usuário — o botão de handoff Arquiteto→Dev Lead
  não tinha gate nenhum

Só valia no CLIENTE: uma chamada HTTP direta ignorava a regra. Fechado por
[RN-404](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-404) (ADR 0094), que revalida no backend.

<a id="rn-161"></a>

### RN-161 — Aceitar o handoff pro Dev Lead encadeia a ativação de execução quando o papel efetivo já autoriza {#rn-161}

> **Revisada pela [RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677) (ADR 0194, decisão do
> dono em 01/10):** aceitar o handoff ao Dev Lead deixou de encadear a ativação
> da execução, para TODO papel — o aceite só o traz para PLANEJAR, e quem ativa
> é a APROVAÇÃO do plano dele (`propose_execution_plan`). O texto abaixo
> descreve a fusão como ela era.

`handleAcceptHandoff` (`SessionPage.tsx`) encadeia `activateExecution`
automaticamente quando `toAgent === 'dev-lead'` E o papel EFETIVO de quem
aceita — lido do mesmo `useCurrentWorkspaceWithRole()` que já autoriza o
"Auto mode" ([RN-153](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-153)) e as telas de Aprovações/Configurações — é
`owner` ou `maintainer`. Para `developer` (ou papel ainda não resolvido), o
fluxo atual continua intocado: aceitar não ativa nada, e "Ativar execução"
permanece como segundo botão. A checagem é só no cliente —
`POST .../execution/activate` continua exigindo `maintainer` no backend
([RN-137](#rn-137)); a fusão só evita um clique redundante para quem já
tinha os dois papéis. Reusa a MESMA `handleActivateExecution` que o botão
"Ativar execução" já chama, que trata o próprio erro (toast +
`mensagemDaApi`) e nunca relança — evita que um erro de ativação tardio
seja reportado como "não foi possível aceitar o handoff".

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
  (`podeFundirHandoffComExecucao`, `handleAcceptHandoff`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-devlead-e-colapso.test.tsx`,
  describe "problema 4"
- **Decisão arquitetural:** [ADR 0069](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0069-fusao-condicional-do-handoff-com-a-ativacao-de-execucao.md)
- **Origem:** pedido do usuário (desenho aprovado)

<a id="rn-172"></a>

### RN-172 — Handoff e aprovação são o DESFECHO do turno {#rn-172}

No fio da sessão, o **handoff oferecido** e o **card de aprovação** aparecem
DEPOIS da última fala do turno em que nasceram — nunca no meio dele.

Isto **não corrige ordenação**: a RN-155 continua valendo inteira, e a
timeline segue ordenada pelo `seq` do event log. O que o log registra é a
verdade: `po_server.ex` (`run_turn/2`) emite, na MESMA iteração, o
`agent.response` do turno, DEPOIS o `tool.call` de `offer_handoff` (que grava
`handoff.offered`) e SÓ ENTÃO recursa para o `agent.response` de fechamento.
O `seq` do handoff é honestamente menor que o da última fala. O mesmo vale
para `proposed_action.created`, que nasce no meio do turno enquanto o agente
ainda tem o que dizer. Mostrar "passou o bastão" ou "aprove isto" no meio da
conversa é leitura errada de um dado certo — então a regra é de
APRESENTAÇÃO, aplicada numa passada separada e explícita
(`afundarDesfechos`), depois do `sort` por `seq`, e não escondida num
comparador com três termos.

Turnos diferentes **nunca se misturam**. Um desfecho desce até o fim do
trecho logo abaixo dele e para na primeira entrada que falhe qualquer uma das
três condições:

1. **mesmo turno** — turno é o `seq` da última ABERTURA anterior à entrada, e
   abertura é evento de ator `user` (`chat.message`, `agent.activated`,
   promoção/devolução de história). Protege o caso em que a fronteira entre
   dois turnos não tem entrada VISÍVEL nenhuma: `agent.activated` abre turno e
   não vira item do fio.
2. **mesmo autor** — em sessão de EXECUÇÃO vários agentes escrevem sem que o
   usuário fale uma única vez, e todos ficam no mesmo turno; o desfecho de um
   não pode atravessar a fala de outro.
3. **não é desfecho** — dois desfechos seguidos preservam a ordem entre si (o
   `handoff.offered` do Infra antes do Dev Lead, na mesma confirmação).

Ator `system` NÃO abre turno: é ruído de infraestrutura no meio do fio, não
decisão de quem conversa.

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
  (`aberturasDeTurno`, `turnoDoSeq`, `afundarDesfechos`, e os campos
  `autor`/`turno`/`desfecho` de `TimelineEntry`)
- **Teste:** `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx`
  (describes "RN-172 — turno e desfecho (unidade)" e "RN-172 — a sequência
  REAL do engine, renderizada")
- **Origem:** uso real no `exp001` — "a passagem de bastão do PO para o
  arquiteto está aparecendo acima da última mensagem do PO" e "a mensagem de
  aprovação apareceu acima do chat do arquiteto até ele finalizar a resposta"

---

<a id="rn-173"></a>

### RN-173 — O fio acompanha tudo que cresce, e só quem já estava no fim {#rn-173}

O chat rola para o fim quando o conteúdo cresce — **e não só quando chega
evento novo**. As duas fontes da timeline são queries SEPARADAS (`events` e
`actions`), e a altura ainda muda sem nenhuma das duas: abrir/fechar um
`Disclosure` (colapso por agente da RN-138, "Detalhes" do card de aprovação),
Markdown reflowando, diagrama renderizando depois. Por isso são dois
mecanismos: as dependências do efeito cobrem o que o React sabe
(`events.length`, `actions.length`, `streamingText`), e um `ResizeObserver`
sobre o CONTEÚDO do fio cobre o que só o layout sabe.

A guarda continua **inalterada e deliberada**: só rola quem já está a menos de
120px do fim. Quem subiu para reler o histórico não é arrastado — o fio segue
a conversa, não sequestra a leitura.

No mesmo fio, o card de aprovação deixa de ocupar os 780px inteiros da
coluna: ganha teto de 560px e fica centralizado, como
`.handoffCard`/`.handoffDivider` já são. Recuar 45px como as bolhas seria
errado — o card não é fala de ninguém, é uma decisão pedida ao usuário. A
fila da aba Aprovações não muda: lá o card DEVE preencher a coluna do grid.
Desde a AT-322 o card é UM só em toda superfície e preenche o contêiner —
quem aplica o teto e a centralização no fio é o contêiner dele
(`.acaoNoFio`), não mais uma variante do card.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`acompanharOFim` e os dois
  efeitos que o chamam); `apps/web/src/components/ApprovalCard.module.css`
  (`.card`) e `apps/web/src/routes/SessionPage.module.css` (`.acaoNoFio`)
- **Teste:** `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx`
  (describe "RN-173 — o fio acompanha o que cresce", com o caso de o usuário
  ter rolado para cima)
- **Origem:** uso real no `exp001` — "o scroll do chat deve ficar sempre no
  final seguindo o chat" e "aprovação mal diagramado deve ficar ao centro"

<a id="rn-174"></a>

### RN-174 — Ação que dispara turno de agente arma o indicador do fio {#rn-174}

O indicador de "o agente está trabalhando" (os três pontinhos depois de 5s,
[RN-131](#rn-131)/[RN-156](#rn-156)) só aparece enquanto `streaming` ou
`statusAgent` valem, e eles eram ligados em três lugares: o composer
(`handleSend`), as confirmações de prontidão e o canal Phoenix. **Toda ação da
tela que dispara um turno síncrono no engine passa a armá-lo também.**

São duas, e nenhuma delas é o composer:

1. **Responder o formulário de perguntas estruturadas** —
   `AnswerStructuredQuestionUseCase` reusa `SendAgentMessageUseCase`
   ([RN-162](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-162)), e a chamada só resolve depois do turno inteiro.
2. **Devolver uma história ao PO** — `ReturnStoryUseCase` chama `reviseStory`,
   que é `handle_call({:revise, …})` no `po_server`: a resposta HTTP espera o
   PO reescrever a história.

O canal Phoenix não cobre o buraco, e é isso que torna a correção necessária
em vez de redundante: quando ele ainda não terminou de conectar (ticket +
join, [RN-108](parte-01.md#rn-108)) o broadcast de `agent.status` "working" não tem
ouvinte e se perde — a tela fica em silêncio absoluto por dezenas de segundos,
que é indistinguível de "não vai acontecer nada".

O par é `iniciarTurnoDoAgente(agente)` **antes** do `await` (o `agent.status`
do canal pode chegar primeiro, e sem o agente fixado o indicador nasceria sem
saber quem fala) e `finalizarTurnoDoAgente()` no `finally` — nos DOIS
caminhos, porque um erro que deixasse `streaming` ligado travaria o composer
até o próximo turno. Resolver a chamada é sinal de fim de turno tão confiável
quanto o `agent.done` do canal, e `finalizarTurnoDoAgente` é idempotente. O
prazo de 5s não muda: turno que responde rápido continua sem mostrar nada.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`iniciarTurnoDoAgente`,
  `handleReturnStory`, `StructuredQuestionCard`)
- **Teste:** `apps/web/src/routes/SessionPage.perguntas-estruturadas.test.tsx`
  e `apps/web/src/routes/SessionPage.promocao-inline-e-volta.test.tsx`
  (describes de RN-174, com o caso de falha provando que o indicador não fica
  preso)
- **Origem:** uso real no `exp001` — "caso a web, api e engine demore mais de
  5s para ter uma resposta, a web deve apresentar uma animação no chat
  mostrando que o agente está pensando"

<a id="rn-176"></a>

### RN-176 — Tabela em Markdown no fio vira tabela de verdade {#rn-176}

O Markdown leve do chat ([RN-158](#rn-158)) passa a reconhecer **tabela GFM** e
a renderizá-la com o `Table` do design system — o mesmo componente de
Configurações, Gastos e Executores, não uma `<table>` própria: "como o Brabo
desenha uma tabela" é uma decisão só. Antes, a tabela do Mapa de Módulos que o
Arquiteto escreve na resposta saía como parágrafo com pipes literais.

O que distingue tabela de prosa com `|` é a **linha separadora**, e ela é
obrigatória como no GFM: sem ela o bloco continua sendo parágrafo, então
"escolha entre a | b | c" não vira tabela por engano. O cabeçalho manda no
número de colunas — linha curta ganha célula vazia, linha longa perde o
excesso —, `\|` escapado fica dentro da célula, e o alinhamento sai dos
dois-pontos do separador. Zero dependência nova: o parser continua sendo o
próprio, por regex, e a árvore de dados continua virando elementos React
diretos (nenhum `dangerouslySetInnerHTML`).

**O artefato `artifact.module_map` continua FORA do fio**, e a escolha é
deliberada: ele é estado VIGENTE do projeto, não artefato datado por sessão —
a mesma decisão já registrada na [RN-159](#rn-159) —, e vive na Visão Geral.
O que o usuário pediu foi a tabela **dentro da mensagem**, e é ela que passou
a ser desenhada; a correção serve a QUALQUER agente que escreva uma tabela, e
não só ao Mapa de Módulos.

No balão, a tabela **rola na horizontal** em vez de espremer coluna: o fio tem
~700px e um `module_map` tem 4 colunas.

- **Onde:** `apps/web/src/lib/markdown.ts` (bloco `table`, `celulasDaLinha`),
  `apps/web/src/components/ui/MarkdownMessage.tsx` (`TabelaMarkdown`),
  `apps/web/src/components/ui/MarkdownMessage.module.css`
- **Teste:** `apps/web/src/lib/markdown.test.ts` (describe "tabela (RN-176)"),
  `apps/web/src/components/ui/MarkdownMessage.test.tsx`
- **Origem:** uso real no `exp001` — "a tabela dentro da mensagem do Mapa de
  Módulos do arquiteto tem que ficar bem estruturada em formato tabela,
  utilizar design system do próprio Brabo"

<a id="rn-177"></a>

### RN-177 — O log mostra tudo, e o histórico se recolhe por ORIGEM {#rn-177}

O feed de atividade escondia seis tipos de evento (`tool.call`, `tool.result`,
`agent.response`, `agent.delta`, `agent.status`, `context.compacted`) **sem
oferecer alternativa nenhuma**: quem quisesse ver o que o agente e o harness
trocam entre si tinha de abrir o banco. O filtro continua, e continua
**desligado por padrão** — a razão dele não mudou (116 de 193 eventos reais
eram desses tipos, ver `isMachineEvent`) —, mas virou **escolha**: um botão
"Eventos de máquina" no mesmo trilho dos chips de tipo.

Mostrar tudo só resolve metade: uma sessão longa vira uma lista que ninguém
percorre. Por isso as **5 mais recentes ficam abertas** e o resto entra em
colapsos por **ORIGEM** — uma classificação NOVA, que não substitui o
`ActivityKind`: `kind` diz de que ASSUNTO o evento fala (commit, PR, permissão)
e decide ícone e cor; `origem` diz de que CAMADA ele veio, e é ela que torna o
histórico legível em punhados. As seis saem do dado que existe — `actor.kind` e
o prefixo do `type` —, nunca de suposição:

| origem | o que cai nela |
|---|---|
| `harness` | `tool.*`, `toolloop.*`, `agent.status`, `context.compacted` |
| `llm` | `agent.response`, `agent.delta`, `llm.*` |
| `usuario` | qualquer evento com `actor.kind === 'user'` |
| `sistema` | qualquer evento com `actor.kind === 'system'` |
| `agente` | `agent.*` restante, `handoff.*`, `delegation.*`, `chat.*` de agente |
| `eventos` | o event log de domínio (backlog, git, PR, artefato, bootstrap…) |

A **precedência** é o que torna a classificação previsível, e está na ordem dos
`if`: mecanismo (`harness`, `llm`) vence ator, porque um `tool.call` é do
harness qualquer que seja o ator; e ator vence prefixo de agente, porque
`chat.message` existe dos dois lados e quem os distingue é quem falou. Tipo que
ninguém previu cai em `eventos` — nunca some, nunca inventa categoria.

**A mesma regra vale no FIO da sessão**, com o eixo invertido: o fio é
crescente (o mais novo junto do composer), então as 5 últimas entradas ficam
abertas em baixo e o histórico recolhido fica no TOPO. O corte é sobre a lista
já agrupada por agente ([RN-138](#rn-138)) — quem conta é o que o usuário vê, e
um colapso de doze mensagens é UMA entrada na tela. **Revista no fio pela
[RN-644](parte-05.md#rn-644):** lá o corte conta só MENSAGENS, recua
até a abertura do turno e o histórico é UM bloco cronológico, não grupos por
origem (que punham a resposta acima da pergunta). O painel de log segue como
descrito aqui.

- **Onde:** `apps/web/src/lib/activity.ts:95` (`OrigemDeEvento`), `:125`
  (`origemDoEvento`), `:152` (`agruparPorOrigem`);
  `apps/web/src/components/ActivityFeed.tsx:34` (o corte de 5), `:66` (o
  toggle); `apps/web/src/routes/session-fio.tsx:119` (o corte do fio), `:291`
  (`dividirFio`); `apps/web/src/routes/SessionPage.tsx:516` (`fio`)
  toggle); `apps/web/src/routes/session-fio.tsx:119` (o corte do fio), `:291`
  (`dividirFio`); `apps/web/src/routes/SessionPage.tsx:516` (`fio`)
- **Teste:** `apps/web/src/lib/activity-origem.test.ts`,
  `apps/web/src/components/ActivityFeed.test.tsx` (describe "ordem,
  agrupamento e o toggle de máquina"),
  `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx` (describe
  "RN-177")
- **Origem:** uso real no `exp001` — "em log de eventos mostrar também log do
  sistema, concentrar a mensagem em grupo, ou seja mantém as últimas 5
  mensagens mas abaixo vira o grupo de log de eventos, sistema, llm, harness,
  agente, usuário"

<a id="rn-178"></a>

### RN-178 — O painel da sessão lê do último para o primeiro, e a lista de regras pagina {#rn-178}

As quatro seções do painel de contexto (regras de negócio, artefatos gerados,
arquivos tocados e log de eventos) eram **crescentes**: abriam no começo da
sessão. Numa sessão de milhares de eventos isso entrega a tela errada — quem
abre o painel quer o que acabou de acontecer. As quatro passaram a ser
**decrescentes**, inclusive dentro da árvore de backlog ([RN-179](#rn-179)).

Uma consequência que veio junto: o botão "Carregar mais antigos" do feed
([RN-099](parte-01.md#rn-099)) **mudou de lado**. Ele ficava ACIMA da lista porque a lista
era crescente e o passado estava em cima; com a ordem invertida o passado está
no fim, e um botão no topo pediria para rolar na direção contrária à que ele
carrega — o mesmo argumento de antes, com o sinal trocado.

E **acima de 5 regras a lista pagina**, em vez de crescer sem fim: o painel tem
a largura de uma coluna e uma sessão de ideação passa de vinte regras sem
esforço. A página vigente é resolvida por *clamp* (`min(pagina, total - 1)`) e
não por efeito de sincronização: uma regra nova chegando pelo poll alonga a
lista, e um `useEffect` renderizaria uma vez com a página inválida antes de
corrigir. Com 5 ou menos, o paginador **não existe** — controle que não pagina
nada é ruído ocupando altura.

- **Onde:** `apps/web/src/routes/ContextAside.tsx:110` (`REGRAS_POR_PAGINA`) e
  a ordenação das quatro seções no mesmo arquivo;
  `apps/web/src/components/ActivityFeed.tsx:98` (o `sort` decrescente)
- **Teste:** `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  (describe "RN-178"), `apps/web/src/components/ActivityFeed.test.tsx`
- **Origem:** uso real no `exp001` — "mostrar log de eventos, arquivos tocados
  e regras de negócio sempre em ordem do último para o primeiro de acordo com
  a data" e "caso as regras de negócio ficar acima de 5, deve-se paginar"

<a id="rn-179"></a>

### RN-179 — O artefato do PO é uma ÁRVORE: épico → história → tarefa {#rn-179}

O painel "Artefatos gerados" ([RN-159](#rn-159)) listava épico e história lado
a lado, planos, e **ignorava `backlog.task_created`** — justamente o que um dev
agent pega para trabalhar. Os três passaram a formar uma árvore, com o filho
dentro de um colapso do pai, e as tarefas nascem FECHADAS: um épico com trinta
tarefas tomaria o painel inteiro sem que ninguém tivesse pedido.

O parentesco sai do **vínculo que o evento já carrega** —
`backlog.story_created` grava `epicId`, `backlog.task_created` grava `storyId`
—, nunca da vizinhança no log. Nó cujo pai não está entre os eventos carregados
**sobe para a raiz** em vez de ser pendurado no épico mais próximo: inventar
parentesco é pior que mostrar o nó solto, e uma tarefa cuja história ficou fora
da janela é caso normal, não erro.

Cada nível continua sendo um **link** para o Backlog, e o colapso dos filhos
vem ABAIXO da linha em vez de dentro do cabeçalho — cabeçalho de `Disclosure` é
`<button>`, e um `<a>` dentro de um `<button>` é HTML inválido e alvo de clique
ambíguo. O contador do cabeçalho da seção conta a árvore INTEIRA, não só as
raízes: dizer "3" com dezoito tarefas dentro seria o mesmo tipo de número que
não corresponde a nada que a [RN-151](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-151) tirou da sidebar.

- **Onde:** `apps/web/src/lib/session-backlog-tree.ts:68`
  (`montarArvoreDeBacklog`), `apps/web/src/routes/ContextAside.tsx:210` (as
  raízes viram item), `:225` (a contagem da árvore)
- **Teste:** `apps/web/src/routes/SessionPage.artefatos-gerados.test.tsx`
  (casos "épico/história/tarefa do PO viram árvore" e "nó sem pai carregado
  aparece na raiz")
- **Origem:** uso real no `exp001` — "mostrar também as tarefas criadas no
  artefato do PO, mas abaixo do épico e ter opção de colapsar"

<a id="rn-180"></a>

### RN-180 — O painel diz o que NÃO está mostrando {#rn-180}

`useSessionEvents` busca `{ limit: 200, latest: true }`, e o painel de contexto
lia esse recorte por prop. Consequência: numa sessão de milhares de eventos as
quatro seções mostravam a cauda **como se fosse a sessão inteira** — regra de
negócio capturada no começo da ideação simplesmente não existia, sem aviso
nenhum.

O painel passou a ler o mesmo histórico paginado que a aba de Atividade da
Visão Geral já usava ([RN-099](parte-01.md#rn-099)), com a `queryKey` da cauda
compartilhada com o fio — **zero requisição a mais** no ciclo de poll
([RN-090](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-090)/[RN-091](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-091)). Duas coisas mudaram com isso:

1. **O feed ganhou o pager que o componente sempre teve.** As props
   `onLoadOlder`/`hasOlder`/`loadingOlder` são opcionais desde a RN-099 e este
   call site nunca as passava — era essa a razão de a sessão perder o começo em
   silêncio.
2. **Uma nota conta quantos eventos faltam.** O número sai de SUBTRAÇÃO sobre o
   `seq` (gapless e por sessão): `menor seq baixado − 1`. Nunca de uma
   requisição a mais — o mesmo mecanismo do "+ N mais antigos" do sino
   ([RN-100](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-100)). Alcançando o começo da sessão a nota **desaparece**, em
   vez de afirmar um zero.

As seções derivadas leem `baixados` (tudo que já veio) e não `events` (a janela
de 100 do feed): elas não paginam item a item, e cortá-las na janela as faria
mostrar MENOS do que mostravam antes desta mudança. É o mesmo botão que
alimenta as duas.

O `pausarPoll` desce por `useSessionEventHistory` até `useSessionEvents`, e não
é detalhe: o intervalo de refetch é de cada OBSERVADOR, não da query. Um
segundo observador da mesma chave com timer ligado ressuscitaria o poll que a
tela pausa durante o turno — e com ele a duplicata visual da bolha em
streaming.

- **Onde:** `apps/web/src/lib/hooks.ts:262` (o `pausarPoll` do histórico),
  `:388` (`baixados`); `apps/web/src/routes/ContextAside.tsx:154`
  (`eventosAnteriores`) e o `ActivityFeed` com o pager, no fim do mesmo
  arquivo
- **Teste:** `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  (describe "RN-180")
- **Origem:** revisão da própria rodada — o teto de 200 existia em silêncio nas
  quatro seções

<a id="rn-181"></a>

### RN-181 — Delegação de área aparece no fio {#rn-181}

Quando uma área (QA, Infra) delega a subagentes e consolida o veredito, os três
desfechos que o lead registra — `delegation.completed`, `delegation.failed` e
`delegation.dispensed` — só existiam no painel de log. Quem acompanhava a
sessão via o gate abrir e fechar **sem nenhum sinal** de que houve uma segunda
tentativa por baixo.

Os três passaram a ser narrados no fio como **aviso compacto**, no formato da
[RN-157](#rn-157) — não bolha: é notificação do que aconteceu dentro da área,
não uma fala. A FRASE sai de `classifyEvent`, a mesma do painel, porque duas
redações do mesmo evento divergem na primeira mudança de payload; e ela já
nomeia o subagente e a área, então o lead **não** é prefixado (produziria "QA
Lead QA Automação concluiu a delegação (qa)").

O contrato externo da área **não muda** (ADR 0038): o fio não passa a endereçar
subagente, só a narrar o que o lead já registrou. A origem da falha viaja junto
em `delegation.failed`, pela mesma razão da [RN-059](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-059) — é ela que diz
se o próximo passo é trocar a chave, esperar o provider ou abrir um bug.

- **Onde:** `apps/web/src/routes/session-timeline-montagem.tsx:754`
- **Teste:** `apps/web/src/routes/SessionPage.painel-e-agrupamento.test.tsx`
  (describe "RN-181")
- **Origem:** uso real no `exp001` — "quando houver uma nova tentativa e
  consolidação de algum agente deve apresentar no chat"

<a id="rn-182"></a>

### RN-182 — O tema é escolhido, persistido e aplicado antes do primeiro paint {#rn-182}

O tema claro existe em `design/tokens.css` desde o começo, sob
`[data-theme='light']`, e **nada em `apps/web` escrevia esse atributo**: o
único jeito de ver o tema claro era digitar o atributo no DevTools. Ele passa a
ser alcançável.

A preferência mora em `localStorage['brabo.theme']`, aceita **só** `'dark'` ou
`'light'`, e o default é `dark` — o tema primário do design system. Quem aplica
é `apps/web/public/theme-boot.js`, **síncrono no `<head>` e antes do bundle**:
`data-theme` decide as cores de todo o `tokens.css`, e aplicá-lo depois da
hidratação faria o usuário do tema claro ver um flash escuro a cada carga.

É **arquivo, não script inline**, e a razão é a mesma que fez as fontes serem
auto-hospedadas (ADR 0036): a imagem de produção serve sob `script-src 'self'`
(`docker/web/nginx.conf`), sem `'unsafe-inline'` e sem nonce. Inline
funcionaria em `pnpm dev:web` e seria **bloqueado na imagem publicada** — o
pior modo de falha possível, porque só aparece depois do deploy.

O caminho inteiro degrada em vez de quebrar: `localStorage` pode lançar (modo
privado, storage bloqueado em iframe) e tema é preferência, não função; valor
desconhecido cai no default em vez de virar um `data-theme` que o CSS não
conhece e que renderizaria sem tema nenhum.

- **Onde:** `apps/web/public/theme-boot.js:41`,
  `apps/web/index.html:53`
- **Teste:** `apps/web/src/lib/tema.test.ts` (describe "contrato com o script
  de boot")
- **ADR:** [0074](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0074-tema-alcancavel-e-o-boot-sob-csp.md)

<a id="rn-183"></a>

### RN-183 — A preferência de tema tem uma fonte, e o atributo do `<html>` é a verdade {#rn-183}

Ler, gravar, alternar e observar o tema é `apps/web/src/lib/tema.ts` — o botão
mora no shell e consome essa API, nunca escreve `data-theme` por conta própria.

Três decisões dentro dela:

1. **`temaAtual()` lê o ATRIBUTO primeiro**, e só depois o `localStorage` e o
   default. É o atributo que a tela está mostrando; cair na preferência gravada
   antes dele faria a UI afirmar um tema diferente do que se vê, no exato caso
   em que o boot falhou.
2. **`lerTemaSalvo()` devolve `null`, não o default**, quando não há preferência
   gravada. Quem nunca escolheu pode um dia seguir o sistema operacional
   (`prefers-color-scheme`), e apagar essa distinção aqui tiraria a informação
   de quem decidir isso depois.
3. **`observarTema()` cobre o evento `storage`**, que o navegador dispara nas
   OUTRAS abas do mesmo origin. Sem isso dois separadores abertos ficariam em
   temas diferentes até o próximo reload.

A chave e o default são repetidos em `public/theme-boot.js` porque ele roda
antes do bundle e não pode importar nada. É a única duplicação possível de
divergir em silêncio, e por isso o teste lê o arquivo de boot e reprova se os
dois deixarem de bater.

- **Onde:** `apps/web/src/lib/tema.ts:73`
- **Teste:** `apps/web/src/lib/tema.test.ts`
- **ADR:** [0074](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0074-tema-alcancavel-e-o-boot-sob-csp.md)

<a id="rn-184"></a>

### RN-184 — Contraste é medido nos DOIS temas {#rn-184}

Enquanto o tema claro era inalcançável ([RN-182](#rn-182)), medir só o escuro
era honesto: medir uma tela que ninguém pode abrir é medir uma intenção. Com o
botão de tema, deixar de medir o claro passaria a esconder metade da superfície
visível do produto — então os pares passam a ser cobrados nos dois temas, com o
mesmo piso (4,5:1 para texto, 3:1 para elemento de interface).

Para isso, **seis tokens do tema claro mudaram de valor**. O fundo mais
exigente do claro é o `--code-bg` (papel, `#efe4d2`, a um passo das
superfícies), e quem fecha contra ele fecha contra o resto: `--accent`
3,56 → 4,81, `--warning` 3,15 → 4,98, `--success` 3,89 → 5,12, `--violet`
4,16 → 4,95, `--text-muted` 2,76 → 5,17, e `--accent-hover` seguiu o accent um
degrau abaixo. O tema escuro **não mudou um valor**, e a dívida conhecida dele
seguiu travada pelos mesmos cinco números (3,89 / 3,10 / 3,88 / 3,88 / 4,41)
até a [RN-640](parte-05.md#rn-640) (ADR 0181), que a fechou com a
paleta neutra e a transformou em piso.

O `--text-muted` do claro não era dívida: a 2,40:1 sobre `--surface-2` ele
reprovava até o piso de **elemento de interface**, que é o mais baixo que
existe. Era defeito, e o tema claro não tem por que ser pior que o primário.

- **Onde:** `design/tokens.css:208`
- **Teste:** `apps/web/src/lib/contraste.test.ts`,
  `apps/web/src/design-contraste.test.ts`,
  `apps/web/test/design-contraste.test.ts`
- **ADR:** [0074](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0074-tema-alcancavel-e-o-boot-sob-csp.md)

<a id="rn-185"></a>

### RN-185 — Os oito papéis de sintaxe, e o valor do handoff só entra medido {#rn-185}

A paleta de realce era três tokens próprios (`--syntax-function`,
`--syntax-comment`, `--syntax-operator`) e cinco reusos de semântico
(`--accent`, `--warning`, `--violet`, `--success`, `--text-primary`). É esse
reuso que fazia a paleta ser medida só no escuro: no claro os semânticos
reprovavam contra o `--code-bg` de papel.

Passa a ter os **oito papéis** do handoff, com o prefixo `--syntax-*` que o
repositório já usa, e cada um com valor próprio por tema. Nomear os oito é o
que permite o realce divergir do semântico no dia em que precisar.

**Valor do handoff só entra quando a medição aprova.** Contra o próprio
`--code-bg` do handoff, cinco dos oito reprovam os 4,5:1 que texto de código
exige — `--syn-cm` 4,09:1 no escuro e 2,32:1 no claro, `--syn-kw` 4,34:1,
`--syn-str` 4,20:1, `--syn-fn` 4,14:1, `--syn-op` 4,00:1. Onde o handoff
reprova, vale o número medido: é a mesma régua do ADR 0036 — a intenção do
handoff vale, o mecanismo (ou o número) que quebra o produto, não.

Os cinco semânticos continuam sendo quem pinta (`SyntaxTokens.module.css` não
mudou nesta entrega) e por isso vão **medidos ao lado** dos oito: enquanto
forem o pixel de verdade, é deles que o piso é cobrado. No tema claro cada
papel tem hoje o MESMO número do semântico que o pinta, de propósito — duas
fontes com números diferentes para o mesmo pixel divergiriam na primeira
correção feita de um lado só.

- **Onde:** `design/tokens.css:111`
- **Teste:** `apps/web/src/lib/contraste.test.ts` (describe "contraste — paleta
  de sintaxe sobre --code-bg")
- **ADR:** [0074](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0074-tema-alcancavel-e-o-boot-sob-csp.md)

<a id="rn-195"></a>

### RN-195 — A sidebar recolhe para uma trilha de ícones, com a preferência persistida {#rn-195}

`Shell.tsx` tinha largura fixa (248px) e nenhum jeito de encolher. Passa a
alternar entre 264px e 62px (tokens `--sidebar-w`/`--sidebar-w-collapsed`,
removidos com o ADR 0241: hoje a largura é a do shadcn) com `transition: width .18s ease`. Recolhida, vira uma trilha vertical: um
quadrado de iniciais por projeto (borda na cor de identidade,
[RN-197](#rn-197)) mais um ícone de Atividades; clicar num projeto na
trilha reexpande a barra, abre aquele projeto e navega para ele.

A preferência é do usuário e sobrevive a reload: `brabo.sidebar.collapsed`
(`'1'`/`'0'`) em `apps/web/src/lib/sidebar-state.ts`. Ela é **só manual**
(`colapsadoManual`): havia um segundo estado, **automático**
(`autoColapsado`), somado por OR pela aba de Código, e ele foi removido pelo
[ADR 0126](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0126-trilho-vertical-de-navegacao-do-projeto.md) — ver
[RN-201](#rn-201). Nenhuma tela recolhe a sidebar por conta própria; o que se
vê recolhido foi o usuário quem pediu, e está gravado.

- **Onde:** `apps/web/src/routes/Shell.tsx:340-351` (estado e toggle),
  `apps/web/src/routes/Shell.module.css` (`.sidebar`, `.colapsado .sidebar`,
  `.trilha*`), `apps/web/src/lib/sidebar-state.ts`
  (`lerColapsado`/`gravarColapsado`)
- **Teste:** `apps/web/src/lib/sidebar-state.test.ts` (describe "colapso"),
  `apps/web/src/routes/Shell.test.tsx`
- **Origem:** PROGRAMA 28, Onda 2, frente B —
  `design_handoff_brabo/README.md` seção "Navigation shell"

<a id="rn-196"></a>

### RN-196 — Projetos expansíveis revelam as abas do projeto, N ao mesmo tempo {#rn-196}

Cada projeto na sidebar ganha um chevron: clicar nele expande a linha e
revela a lista de abas daquele projeto (Visão geral, Executores, Criativo,
Chat, Code, Backlog, Aprovações, Insights, Gastos, Configurações), cada uma
um link para `/projects/$projectId?tab=<chave>`. Vários projetos podem ficar
abertos ao mesmo tempo — o estado é um `Set<string>` de ids, persistido em
`brabo.sidebar.open`.

A lista de abas e os rótulos vêm de `ABAS_DO_PROJETO`
(`apps/web/src/routes/project-tabs.ts`, dono da frente C, rodando em
paralelo nesta mesma onda) — a sidebar só **lê** o array exportado, nunca
reescreve nomes de aba. **Suposição de shape**, para conferir contra o que a
frente C entregou: `AbaDoProjeto` tem `key: string`, `label: string` e
`count?: (contagens: ContagensDeAba) => number | undefined`, com
`ContagensDeAba = { promocoesPendentes, aprovacoesPendentes,
hipotesesPendentes }`. A sidebar só consegue preencher
`aprovacoesPendentes` de graça (`pendingApprovalsCount` já vem no resumo do
dashboard, [RN-151](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-151)); `promocoesPendentes`/`hipotesesPendentes`
entram como `0` — calculá-los exigiria uma consulta nova POR PROJETO
ABERTO na sidebar, a mesma classe de N+1 que a RN-090/091 fechou no
dashboard. Os dois selos continuam corretos dentro da régua da própria
`ProjectPage`; só o preview na sidebar é parcial, e é uma omissão
deliberada, não um bug.

O projeto da rota ATUAL sempre aparece expandido (`projetosAbertosEfetivo`),
mesmo sem estar no `Set` persistido — abrir "de graça" pela rota não grava
nada; só o clique explícito no chevron entra em `brabo.sidebar.open`.

**Desde o [ADR 0211](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0211-uma-navegacao-so-a-sidebar-absorve-o-trilho.md)
(AT-404) esta lista é a ÚNICA navegação do projeto:** o trilho vertical saiu e
ela recebeu tudo o que só ele tinha — os três grupos com cabeçalho, a aba
ativa marcada, o `tablist` vertical nomeado pelo projeto, o teclado
(`ArrowDown`/`ArrowUp`/`Home`/`End` com volta, atravessando grupos) e os CINCO
contadores, cada um na sua aba e nunca somados. A omissão deliberada acima
continua valendo para projeto FECHADO e para o projeto aberto fora da moldura
(na Sessão, por exemplo): só Aprovações, do resumo. Com a moldura do projeto
montada, os cinco números saem do MESMO hook que ela usa
(`useContagensDoProjeto`), sem requisição nova. Recolhida, o quadrado do
projeto aberto abre um flyout com as mesmas abas.

- **Onde:** `apps/web/src/routes/Shell.tsx:564` (`projetosAbertosEfetivo`),
  `:504` (`useContagensDoProjeto`), `:519` (`irParaAba`), `:546`
  (`flyoutAberto`), `:243` (`contagensDoResumo`);
  `apps/web/src/routes/AbasDoProjeto.tsx:69` (`AbasDoProjeto`), `apps/web/src/routes/AbasDoProjeto.helpers.ts:11`
  (`itensDasAbas`), `apps/web/src/routes/AbasDoProjeto.tsx:86` (`aoTeclar`);
  `apps/web/src/lib/contagens-do-projeto.ts:22` (`useContagensDoProjeto`),
  `:70` (`publicarAbaAtiva`), `:86` (`pedirAba`);
  `apps/web/src/lib/sidebar-state.ts` (`lerProjetosAbertos`/`gravarProjetosAbertos`)
- **Teste:** `apps/web/src/lib/sidebar-state.test.ts` (describe "conjuntos"),
  `apps/web/src/routes/Shell.test.tsx` (describe "Shell — abas do projeto
  aberto (ADR 0211)": as 12 abas, os cinco contadores separados, a ativa, o
  clique e a seta navegando, o flyout recolhido, a gaveta no telefone e o caso
  de falha — sem a moldura montada, só o número do resumo),
  `apps/web/src/routes/AbasDoProjeto.test.tsx` (grupos, ativa, contadores,
  teclado, roving tabindex, link por projeto), `apps/web/src/routes/project-tabs.test.tsx`
- **Origem:** PROGRAMA 28, Onda 2, frente B; ADR 0211 (AT-404)

<a id="rn-197"></a>

### RN-197 — Duas cores de projeto, dois propósitos: identidade não é status {#rn-197}

O handoff pede um "ponto de cor do projeto" na linha expandida e o mesmo
princípio de cor na trilha recolhida. O produto já tinha um dot ali —
`NavStatusDot` — mas ele é **status** (orçamento/atividade recente,
derivado sem consulta própria de `useProjectsSummary`/`useProjectsStatus`,
RN-039), não identidade: a cor dele MUDA com o tempo.

Decisão, documentada em vez de resolvida: a linha expandida continua
mostrando só `NavStatusDot` (é informação acionável; duplicar um segundo
dot ao lado seria ruído). A cor de IDENTIDADE — estável por projeto, hash
determinístico do id sobre uma paleta fixa de tokens (`corDoProjeto`,
sem tabela nova, mesma ideia de `AGENTS[key].color`) — aparece só na
trilha recolhida, como borda do quadrado de iniciais, que é onde não há
espaço para os dois dots e onde a identidade (não o status) é o que ajuda a
achar o projeto certo entre vários quadrados parecidos.

Do mesmo jeito, o handoff pede "badge com o total de últimas iterações" no
projeto; o produto usa `pendingApprovalsCount` desde a RN-151, que é
posterior ao handoff e resolve um defeito real (um número que não
correspondia a nada acionável ao clicar). Este badge **não muda** — RN-151
continua valendo, e é o handoff que diverge aqui.

- **Onde:** `apps/web/src/lib/sidebar-state.ts` (`corDoProjeto`),
  `apps/web/src/routes/Shell.tsx` (`NavStatusDot`, comentário da divergência)
- **Teste:** `apps/web/src/lib/sidebar-state.test.ts` (describe "corDoProjeto")
- **Origem:** PROGRAMA 28, Onda 2, frente B — divergência entre
  `design_handoff_brabo/CHECKLIST-CONFRONTO.md` e RN-151

<a id="rn-199"></a>

### RN-199 — Botão de tema no rodapé, funcional recolhido {#rn-199}

O rodapé da sidebar ganha um botão sol/lua que consome a API de
`apps/web/src/lib/tema.ts` da Onda 1/frente A (`temaAtual`,
`alternarTema`, `observarTema`) sem reimplementar nada — só o BOTÃO é novo.
Funciona recolhido (62px): o rótulo textual some, mas `aria-label`/`title`
continuam descrevendo o tema atual e o clique continua alternando.

- **Onde:** `apps/web/src/routes/Shell.tsx:130-148` (`BotaoDeTema`)
- **Teste:** `apps/web/src/lib/tema.test.ts` (a API, inalterada por esta RN)
  — `Shell.test.tsx` não duplica a suite do tema, só monta o Shell
- **Origem:** PROGRAMA 28, Onda 2, frente B

<a id="rn-200"></a>

### RN-200 — Só Projetos e Atividades como itens globais {#rn-200}

Os dois itens sem rota do rodapé da nav ("Chat global"/"Configurações",
`title="em breve"`) saem. O handoff é explícito: só Projetos e Atividades
são itens GLOBAIS — tudo o mais é escopado a um projeto. "Configurações"
continua existindo, como ABA de projeto ([RN-196](#rn-196)) dentro da linha
expandida — o que sai é o item solto sem destino.

- **Onde:** `apps/web/src/routes/Shell.tsx` (o bloco `.globalNav`/
  `.inertNavItem` da FASE 17a foi removido, sem substituto global)
- **Teste:** `apps/web/src/routes/Shell.test.tsx` (describe "sem itens
  globais inertes")
- **Origem:** PROGRAMA 28, Onda 2, frente B —
  `design_handoff_brabo/README.md` seção "Navigation shell"

<a id="rn-201"></a>

### RN-201 — Projeto/aba ativos persistem entre páginas; o colapso da sidebar é SÓ do usuário {#rn-201}

Duas chaves finais do handoff: `brabo.project` (o projeto ativo) e
`brabo.tab` (a aba ativa) — gravadas quando o usuário clica um link de aba
NA SIDEBAR (`LinhaDeAba`/o link de nome do projeto). `?tab=` na URL só vale
como deep-link INICIAL (`project-tabs.ts`, FASE 24) — trocar de aba dentro
de `ProjectPage.tsx` é estado local e não escreve na URL depois do
primeiro load, então estas chaves são o único jeito de a preferência
sobreviver entre uma navegação e outra. **Esta metade nunca mudou.**

**O auto-colapso da aba de Código SAIU (ADR 0126).** Até aqui a aba de
Código recolhia a sidebar sozinha para dar largura ao editor, sem gravar
preferência: `AutoCollapseContext`/`useAutoCollapseSidebar` em
`sidebar-state.ts`, registrados por `ProjectCodeTab.tsx` (a única
chamadora) e somados por OR ao colapso manual dentro do `Shell`. O contexto,
o hook, o estado `autoColapsado`, o `Provider` em torno de `<Outlet />` e o
`disabled` do botão de recolher — que existia só para proteger esse caminho
— foram todos removidos.

O motivo é estrutural: com o trilho vertical do projeto
(`routes/ProjectRail.tsx`, removido no ADR 0211) sempre presente, manter o auto-colapso poria a
trilha de ícones do Shell encostada no trilho do projeto — DOIS trilhos
verticais adjacentes, permanentes, na aba mais pesada do produto.

O que passa a valer: **o colapso da sidebar é uma decisão do USUÁRIO, e só
dele.** Continua manual, continua persistido em `brabo.sidebar.collapsed`
([RN-195](#rn-195)), e nenhuma tela recolhe a sidebar por conta própria.

**O custo, aceito e declarado:** a aba de Código passa a abrir com a sidebar
EXPANDIDA (264px) + o trilho do projeto (180px) + o trilho do próprio
`CodeShell` (48px) — 492px de moldura antes do primeiro caractere de código,
MEDIDOS no navegador, contra ~110px antes (62px de sidebar recolhida + 48px
do trilho do Código). Recolher manualmente continua possível e
ainda produz trilho do Shell ao lado do trilho do projeto — a diferença é
que agora quem escolheu foi o usuário, não o sistema.

**Revisto pelo [ADR 0211](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0211-uma-navegacao-so-a-sidebar-absorve-o-trilho.md)
(AT-404):** o trilho do projeto saiu, e a moldura da aba Código passou a
**312px** com a sidebar expandida (264 + 48 do `CodeShell`) e **110px**
recolhida (62 + 48) — sem trilho duplo em nenhum dos dois casos. O colapso
continua só do usuário. A aba ativa que a sidebar marca vem da moldura do
projeto (`publicarAbaAtiva`), não só de `brabo.tab`.

- **Onde:** `apps/web/src/lib/sidebar-state.ts:80-105`
  (`lerProjetoAtivo`/`gravarProjetoAtivo`, `lerAbaAtiva`/`gravarAbaAtiva`, e
  o comentário que registra a remoção), `apps/web/src/routes/Shell.tsx:366-369`
  (só `colapsadoManual` sobrou), `apps/web/src/routes/ProjectCodeTab.tsx`
  (nenhuma chamada de colapso)
- **Teste:** `apps/web/src/lib/sidebar-state.test.ts` (describe "projeto e
  aba ativos"), `apps/web/src/routes/Shell.test.tsx` (describe "Shell —
  colapso da sidebar": a preferência só nasce de clique no botão e é sempre
  gravada). O describe "useAutoCollapseSidebar" foi removido junto com o
  hook.
- **Origem:** PROGRAMA 28, Onda 2, frente B —
  `design_handoff_brabo/CHECKLIST-CONFRONTO.md` seção 1; a metade do
  auto-colapso foi revista pelo
  [ADR 0126](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0126-trilho-vertical-de-navegacao-do-projeto.md)

<a id="rn-202"></a>

### RN-202 — A aba `sessions` continua "Chat", nunca "Chat RAG" {#rn-202}

O handoff de design mais recente do PROGRAMA 28 chama a aba consultiva de
"Chat RAG" (`designs/Brabo Chat.dc.html`), mas o produto não tem essa
funcionalidade: não há pipeline de indexação por projeto, não há índice
vetorial, não há UI de citação de fonte. O ADR 0075 pôs `embed` no contrato de
`LLMProvider` — a operação existe e é PROVADA no Ollama —, mas nada ainda a
CONSOME. A aba `sessions` de hoje é o Chat consultivo comum da
[RN-104](parte-01.md#rn-104): um agente respondendo com o contexto da sessão, sem
produzir backlog, sem RAG nenhum por trás.

Rotular a aba "Chat RAG" hoje anunciaria uma capacidade que não existe — o
mesmo erro que o [ADR 0042](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0042-catalogo-vivo-ciclo-de-vida-do-modelo-e-preco-auditavel.md)
já recusa para modelo de catálogo ("não ativar modelo descoberto
automaticamente"). O rótulo muda no dia em que a funcionalidade chegar, junto
com o dado por trás dele — nunca antes.

- **Onde:** `apps/web/src/routes/project-tabs.ts:144` (entrada `key:
  'sessions'`)
- **Teste:** `apps/web/src/routes/project-tabs.test.tsx` (describe "abas do
  projeto derivam de um registro só", `'RN-202 — a aba \`sessions\` continua
  "Chat", nunca "Chat RAG"'`)
- **ADR:** [0078](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0078-moldura-de-tela-e-o-registro-de-abas-diverge-do-handoff.md)

<a id="rn-203"></a>

### RN-203 — O handoff é referência visual, não teto de quantas abas o produto tem {#rn-203}

O handoff de design lista 7 abas de projeto (Visão geral, Criativo, Código,
Chat RAG, Gastos, Aprovações, Configurações); o registro
(`apps/web/src/routes/project-tabs.ts`) tem 10. As três a mais —
`executores` ([RN-121](parte-01.md#rn-121)), `backlog` ([RN-048](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-048)) e
`insights` (hipóteses do Psicólogo aguardando decisão) — nasceram DEPOIS do
handoff ser desenhado, todas com dado real, contador derivado de consulta e
pelo menos uma RN própria com teste.

O handoff fixa como cada tela deve se PARECER — cores, tipografia,
espaçamento, o desenho da moldura —, e essa parte foi seguida à risca nesta
mesma mudança (header, régua, rolagem, largura do conteúdo). Ele não congela o
inventário de abas no dia em que foi escrito. Apagar as três para "bater" com
o handoff destruiria informação que o produto já sabia mostrar, pelo motivo
errado.

- **Onde:** `apps/web/src/routes/project-tabs.ts:91` (o `REGISTRO`)
- **Teste:** `apps/web/src/routes/project-tabs.test.tsx` (describe "abas do
  projeto derivam de um registro só", `'RN-203 — as 3 abas que o handoff não
  previu continuam no registro'`)
- **ADR:** [0078](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0078-moldura-de-tela-e-o-registro-de-abas-diverge-do-handoff.md)

<a id="rn-210"></a>

### RN-210 — "Recomendado" é uso real e custo, nunca nota calculada {#rn-210}

O bloco "Melhores modelos por capacidade" (Configurações) não tem coluna de
score. O handoff mostra uma nota por capacidade (código 9.4, imagem 9.1…), mas
é dado FICTÍCIO do mock — nenhum provider publica "qualidade de código" e o
produto não mede isso em lugar nenhum. Calcular um número aqui seria o mesmo
"palpite vestido de dado" que o [ADR 0041](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0041-base-openai-compativel-e-contrato-de-llm-providers.md)
proíbe para capability de MODELO, agora sobre qualidade.

Em vez disso, "recomendado"/"alternativa" saem de dois sinais reais, entre os
modelos que a curadoria DESTE workspace marcou para aquela capacidade (`uses`,
[RN-057](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-057)): primeiro os mais usados por agentes DESTE projeto — a
mesma cascata que resolve o binding vigente de cada agente —, custo (do
catálogo, ascendente) como desempate. "O que o time já escolheu" é o sinal
mais honesto disponível sem inventar nota. Capacidade sem nenhum modelo curado
mostra "sem cobertura curada" — nunca esconde a linha, mesmo padrão que a
coluna Origem de `ModelsSection` já usa para o binding pulado.

- **Onde:** `apps/web/src/routes/settings/MelhoresModelosPorCapacidadeSection.tsx`
- **Teste:** `apps/web/src/routes/ProjectSettingsTab.test.tsx`
  (describe "MelhoresModelosPorCapacidadeSection")
- **ADR:** [0077](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0077-ranking-de-modelos-por-capacidade-sem-nota-inventada.md)

<a id="rn-211"></a>

### RN-211 — Gasto por provider na tela é Ranking, não paleta categórica inventada {#rn-211}

O handoff pede barras diárias empilhadas por provider e uma quebra por
provider. A skill de dataviz do repositório manda validar paleta
categórica por script antes de usar, nunca por olho: `validate_palette.js`
reprova toda combinação de 3+ tokens de `design/tokens.css` contra pelo
menos um dos dois temas — `--accent`+`--violet` é o único par que passa
nos dois (vários `--syntax-*` são literalmente o mesmo hex de
`--warning`/`--violet`/`--success`, medido). Com 9 providers (ADR 0043) e
2 cores validadas, ciclar a paleta é o anti-padrão que a própria skill
nomeia ("a 9th series is never a generated hue"), e inventar hex novo
violaria a instrução desta frente. A quebra por provider vira `Ranking` —
a mesma peça de "Por modelo"/"Por projeto"/"Por agente e pessoa", sem
identidade por cor. A série DIÁRIA por provider não é entregue:
`sumGroupedBy` (ADR 0076) agrupa por uma dimensão de cada vez, e não existe
agregação cruzada dia×provider no backend desta onda.

- **Onde:** `apps/web/src/lib/spend.ts` (bloco "Gasto por PROVIDER na
  tela"), `apps/web/src/routes/ProjectSpendTab.tsx` (`GastoDoWorkspace`)
- **Teste:** `apps/web/src/routes/ProjectSpendTab.test.tsx` (describe "a
  audiência do owner" — `'mostra os cinco recortes do workspace,
  incluindo provider'`)
- **ADR:** [0076](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0076-provider-volta-a-ser-dimensao-de-gasto.md)

<a id="rn-212"></a>

### RN-212 — Bloco "por projeto" é o TokenMeter plugado ao orçamento real {#rn-212}

A aba de Gastos ganha um bloco por PROJETO (não por audiência):
`OrcamentoDoProjeto` lê `GET /projects/:id/budget` e planta o resultado
direto no `TokenMeter` existente, que já implementa os limiares 70/90
(`tokenThreshold`) — nenhum componente novo. Três leituras: carregando
(silencioso, evita piscar antes do papel resolver a audiência de baixo),
sem orçamento definido (nota em texto, sem CTA) e erro (silencioso — na
prática quase sempre 403 de quem tem papel de WORKSPACE mas não é
`maintainer` no PROJETO, e mostrar banner de propósito seria alarme falso
para a maioria dos membros, o mesmo padrão já usado pelo `TokenMeter`
compacto de `ProjectPage.tsx`).

- **Onde:** `apps/web/src/routes/ProjectSpendTab.tsx`
  (`OrcamentoDoProjeto`)
- **Teste:** `apps/web/src/routes/ProjectSpendTab.test.tsx` (describe "o
  orçamento do projeto")

<a id="rn-214"></a>

### RN-214 — KPI de economia com modelo local fica de fora por falta de preço contrafactual {#rn-214}

`TokenMeter` já tem `savingsBRL`/`savingsPct` prontos para receber o
número, e permanecem não alimentados de propósito. O card exigiria um
preço CONTRAFACTUAL — quanto a mesma chamada teria custado num modelo
pago — que não existe em lugar nenhum do produto: o catálogo (ADR 0042)
só congela o preço do modelo REALMENTE usado (RN-044), e não há
mapeamento declarado "modelo local X ~ modelo pago Y". Inventá-lo aqui
seria a mesma classe de "nota vestida de dado" que a RN-210 já recusou
para ranking de capacidade. Pendência registrada no backlog para quando
existir um preço contrafactual defensável e versionado.

- **Onde:** `apps/web/src/routes/ProjectSpendTab.tsx` (comentário "KPI de
  economia com modelos locais — CORTE DECLARADO", fim do arquivo)

<a id="rn-215"></a>

### RN-215 — Aba Problemas nasce com estado vazio honesto {#rn-215}

Não há lint nem teste integrado sobre o código do projeto gerido; a aba
Problemas do painel inferior (handoff `design_handoff_brabo`) diz isso
explicitamente em vez de mostrar contagem inventada (o mock do handoff traz
badge "3"). Mesmo padrão já usado pelo Terminal (FASE 25b) e pelo item
"Testes" desabilitado do rail.

- **Onde:** `apps/web/src/routes/code/CodeBottomPanel.tsx`
- **Teste:** `apps/web/src/routes/code/CodeBottomPanel.test.tsx` —
  "Problemas diz honestamente que não há lint/teste integrado, sem
  contagem inventada"

<a id="rn-216"></a>

### RN-216 — Aba Saída nasce com estado vazio honesto {#rn-216}

Não há stream de comando de build/deploy nesta aba — ele dependeria do
terminal interativo (FASE 25b), que não existe. A aba explica isso e lembra
que `git push`/PR/deploy não saem pelo terminal de qualquer forma (RN-106).

- **Onde:** `apps/web/src/routes/code/CodeBottomPanel.tsx`
- **Teste:** `apps/web/src/routes/code/CodeBottomPanel.test.tsx` — "Saída
  diz honestamente que não há stream de comando, sem simular execução"

<a id="rn-217"></a>

### RN-217 — Status bar da aba Código só mostra dado real {#rn-217}

A status bar de 24px (`CodeShell.tsx`) mostra `↑N ↓M` de commits da branch
atual (via `getCodeBranches`, mesma `queryKey` de `CodeBranchPicker` —
dedup, zero requisição extra, RN-090/091) e a linguagem do arquivo ativo
(`linguagemPorCaminho`). Posição do cursor e contagem de erros/testes do
mock do handoff ficaram de fora: `CodeEditor` não expõe seleção/caret
rastreável e não há lint/teste integrado (mesma decisão da RN-215).

- **Onde:** `apps/web/src/routes/code/CodeShell.tsx`
- **Teste:** `apps/web/src/routes/code/CodeShell.test.tsx` — "a status bar
  mostra ↑/↓ real da branch atual" e "sem ahead/behind (branch em dia), a
  status bar não mostra o par vazio"

<a id="rn-218"></a>

### RN-218 — Foco visível nas abas próprias do painel inferior {#rn-218}

As abas de `CodeBottomPanel.tsx` são implementação própria (não o `Tabs` do
design system) e não herdavam o `:focus-visible` calibrado que
`Tabs.module.css` ganhou na Onda 2/frente C. Corrigido com o mesmo padrão de
`Input.module.css` (ADR 0036), incluindo `forced-colors`.

- **Onde:** `apps/web/src/routes/code/CodeBottomPanel.module.css`

<a id="rn-227"></a>

### RN-227 — Selo de status da sessão cobre os 5 estados reais, não os 4 do handoff {#rn-227}

O handoff pede 4 selos (ativa/aguardando/fechada/abortada) para os 5
estados reais da máquina (`created/active/closing/closed/closed_abnormally`).
`closed_abnormally`→abortada e `created`→aguardando são diretos. `closing`
NÃO é fundido com "fechada": ganha selo próprio ("encerrando", tom
`accent`, pulsante), porque em `closing` o desfecho (`closed` ou
`closed_abnormally`) ainda não é conhecido — chamá-la de "fechada"
mentiria sobre isso.

- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx` (`SELO_DO_STATUS`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` — describe
  "ProjectSessionsTab — selo de status (RN-227)"

<a id="rn-228"></a>

### RN-228 — Filtro pill agrupa os 2 estados sem pill própria por TRAJETÓRIA {#rn-228}

Os filtros pill do handoff (todas/ativas/fechadas/abortadas) só cobrem 4
dos 5 estados. `created` (aguardando) entra no pill "Ativas" — ainda não
chegou a lugar nenhum, é "sessão em jogo". `closing` entra no pill
"Fechadas" — já está a caminho de fechar sem erro. O SELO de cada linha
(RN-227) nunca é reescrito pelo filtro; o pill só agrupa.

- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx`
  (`correspondeAoFiltro`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` — describe
  "filtro pill agrupa os 2 estados sem pill própria (RN-228)"

<a id="rn-229"></a>

### RN-229 — KPI "custo do mês" da aba Criativo é o consumo do ATOR, não o total do projeto {#rn-229}

Reaproveita `getMySpend(projectId, 30)` — a MESMA queryKey que
`ProjectSpendTab.tsx#MeuConsumo` usa para a visão do membro (RN-101, ADR
0063), sem agregação nova. NUNCA mostra o total do projeto somando todo
mundo (`porProjeto` em `getWorkspaceSpendReport`), porque esse dado é
owner-only e a aba Criativo é vista por qualquer membro do projeto —
mostrar o total geral vazaria gasto alheio para quem a RN-060/101 não
autoriza a ver.

- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx` (`CriativoKpis`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` — describe
  "KPIs da aba Criativo", casos "caminho feliz" e "CASO DE FALHA"

<a id="rn-230"></a>

### RN-230 — KPI "taxa ideação → commit" é declarado ausente, nunca calculado {#rn-230}

Não existe, em lugar nenhum do produto, vínculo entre uma sessão criativa e
o commit que ela produziu. A aba Criativo mostra "—" com a frase "não
medido: sessão não é vinculada a commit hoje" em vez de inventar um
cálculo — mesma classe de erro que o ADR 0042 já recusa para nota de
modelo.

- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx` (`CriativoKpis`)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx` — "'Taxa
  ideação → commit' é DECLARADA ausente — nunca um número calculado"
