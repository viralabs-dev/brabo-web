---
id: rn-web-parte-03
title: 'Regras de negócio — Web — parte 3 (desde RN-239)'
sidebar_label: 'Web — parte 3 (desde RN-239)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 3 (desde RN-239)

## PROGRAMA 28 — Onda 4, frente E2: virtualização de linha e minimapa na aba Code (RN-239..242)

<a id="rn-239"></a>

### RN-239 — Virtualização de linha: só a janela visível vira nó de DOM {#rn-239}

`CodeEditor.tsx` renderiza só as linhas dentro da janela visível (mais
`OVERSCAN = 20` de margem) como `[data-line-row]`; o resto vira dois
espaçadores que reservam a altura sem existir como nó. A decisão de NÃO
usar `react-window`/`react-virtual`: a altura de linha é FIXA
(`ALTURA_LINHA = 21`, monoespaçado), o que reduz "qual linha está visível"
a uma divisão inteira sobre `scrollTop` — o problema que essas libs
resolvem de verdade é altura VARIÁVEL por item, que não é o caso da aba
Code.

- **Onde:** `apps/web/src/routes/code/CodeEditor.tsx` (linhas 38-96, 45,
  48)
- **Teste:** `apps/web/src/routes/code/CodeEditor.test.tsx` — describe
  "CodeEditor — virtualização", "caminho feliz: arquivo de 5.000 linhas
  renderiza uma janela pequena de nós, não o arquivo inteiro" (`< 150` nós
  `[data-line-row]`) e "rolar para o meio do arquivo troca a janela —
  linha 1 some, linhas do meio aparecem"

<a id="rn-240"></a>

### RN-240 — Sem medição de altura, degrada para janela padrão generosa, nunca renderiza tudo {#rn-240}

Quando `containerHeight` ainda não foi medido (1º render, ou jsdom sem
`ResizeObserver` em teste), a janela cai para `LINHAS_SEM_MEDICAO = 40` —
generosa o bastante para não truncar os arquivos pequenos que os testes
usam, pequena o bastante para nunca virar "renderiza tudo" num arquivo
grande de verdade.

- **Onde:** `apps/web/src/routes/code/CodeEditor.tsx` (linha 57)
- **Teste:** `apps/web/src/routes/code/CodeEditor.test.tsx` — "falha/borda:
  sem medição de altura (jsdom sem ResizeObserver, clientHeight 0),
  degrada para uma janela padrão em vez de não renderizar nada"

<a id="rn-241"></a>

### RN-241 — Minimapa reusa a MESMA tokenização da virtualização — zero segundo passe sobre o arquivo {#rn-241}

`minimap.ts` não tokeniza nada: ele resume a saída que `highlight.ts` já
produziu (`HighlightToken[][]` de `highlightFile`, chamada uma vez só) —
a MESMA que a virtualização usa para colorir as linhas visíveis.
Tokenizar de novo só para o minimapa pagaria o custo de leitura do
arquivo pela segunda vez, e por isso o minimapa só entra depois de a
virtualização estar de pé, nunca antes.

- **Onde:** `apps/web/src/routes/code/minimap.ts` (linhas 1-18, 39)
- **Teste:** `apps/web/src/routes/code/minimap.test.ts`

<a id="rn-242"></a>

### RN-242 — Minimapa é CANVAS, um nó de DOM só, nunca um `<div>` por linha {#rn-242}

O desenho é em `<canvas>` (`desenharMinimapa`), não em elemento por
linha: um minimapa com um nó por linha dobraria de novo a contagem que a
virtualização (RN-239) acabou de cortar. Sem contexto de canvas 2D
disponível (jsdom sem o pacote `canvas`), o overlay clicável continua
funcionando — só o desenho é pulado, nunca a interação.

- **Onde:** `apps/web/src/routes/code/minimap.ts` (linhas 14-16, 91)
- **Teste:** `apps/web/src/routes/code/CodeEditor.test.tsx` — describe
  "CodeEditor — minimapa", "caminho feliz: clicar no minimapa rola o
  editor e troca a janela renderizada" e "falha: sem contexto de canvas
  2D (jsdom sem o pacote `canvas`), o overlay continua clicável e nada
  quebra"

## PROGRAMA 28 — Onda 4, frente H4: os colapsos ad-hoc restantes migram para o `Disclosure` (RN-249..251)

<a id="rn-249"></a>

### RN-249 — Alvo de clique do marco com detalhe sobe de 20px para o piso de 24px do `Disclosure` {#rn-249}

O marco COM detalhe de `AgentTimelineTree` tinha `min-height: 20px` no
cabeçalho clicável — abaixo do WCAG 2.2 AA 2.5.8 (Target Size, mínimo
24px) que um comentário anterior já prometia sem cumprir. A migração
para o `Disclosure` compartilhado corrige isso de graça: o componente
genérico já nasce em 24px, e não é preciso lembrar de setar a régua em
cada novo consumidor.

- **Onde:** `apps/web/src/components/AgentTimelineTree.module.css`
  (linhas 135-155, `.marcoLinha`)
- **Teste:** `apps/web/src/components/AgentTimelineTree.test.tsx`
- **ADR:** nenhum — correção pontual de a11y, mesmo padrão do ADR 0036

<a id="rn-250"></a>

### RN-250 — Faixa de arquivo do diff em `ApprovalCard` NÃO migra para o `Disclosure` — a animação própria é a razão {#rn-250}

A faixa de arquivo do diff em `ApprovalCard` gira o chevron por
`transform: rotate(90deg)` com transição própria
(`.chevron.open`/`ApprovalCard.module.css`); o `Disclosure` genérico
TROCA o ícone (seta direita → seta baixo) sem animação nenhuma. Forçar a
migração apagaria a micro-interação sem ganho — a exclusividade (só um
arquivo aberto por vez) já vem de fora (`expandedFile`), o mesmo que o
`Disclosure` controlado faria. O que faltava, e não era peculiaridade —
é o mesmo defeito que o `Disclosure` existe para fechar —, era
`aria-controls` apontando para uma região nomeada: corrigido diretamente,
sem trocar de componente.

- **Onde:** `apps/web/src/components/ApprovalCard.tsx` (linhas 511-539)
- **Teste:** `apps/web/src/components/ApprovalCard.test.tsx`

<a id="rn-251"></a>

### RN-251 — Cinco call sites migram para o `Disclosure` compartilhado; o componente ganha `testId` como único hook novo {#rn-251}

`ModelCatalogSection` (a referência original que gerou o componente na
FASE 16), `AgentTimelineTree` (ramo + marco), `code/CodeExplorer.tsx`
(pasta da árvore) e `code/CodeShell.tsx` (painel inferior) passam a usar
o `Disclosure` compartilhado — nenhuma das seis implementações ad-hoc que
sobreviveram à FASE 16 fica de fora, exceto a exceção declarada da
RN-250. `testId` é o único prop novo que um consumidor precisou (`data-
testid` no cabeçalho, para os testes existentes continuarem
selecionando o botão certo sem reescrever a suíte inteira). A região
controlada existe no DOM mesmo fechada — só `hidden` e sem os filhos
montados —, porque `aria-controls` apontando para um id que não resolve
é pior que não ter o atributo (leitor de tela anunciaria controle de
algo inexistente); é essa mesma propriedade que permite colapsar listas
caras (o catálogo do OpenRouter tem 338 modelos) sem montar o que
ninguém está vendo.

- **Onde:** `apps/web/src/components/ui/Disclosure.tsx` (linhas 33-71),
  `apps/web/src/components/ModelCatalogSection.tsx`,
  `apps/web/src/components/AgentTimelineTree.tsx`,
  `apps/web/src/routes/code/CodeExplorer.tsx`,
  `apps/web/src/routes/code/CodeShell.tsx`
- **Teste:** `apps/web/src/components/ui/Disclosure.test.tsx`,
  `apps/web/src/routes/code/CodeExplorer.test.tsx`,
  `apps/web/src/routes/code/CodeShell.test.tsx`

## PROGRAMA 28 — Onda 5, frente G3: a tela do Chat RAG (RN-252..254, ADR 0082)

<a id="rn-252"></a>

### RN-252 — A tela do Chat RAG mostra as duas degradações honestas que o backend já declara, nunca as esconde {#rn-252}

`HybridSearchUseCase` já devolve `vectorAvailable: false` quando o provider
de embedding não respondeu (RN-233) e `GetRagCoverageUseCase` já nunca
inclui timestamp de indexação (RN-237) — mas um contrato honesto no
backend não garante uma tela honesta se ela decidir não ler os dois
campos. `ProjectRagTab` mostra um aviso acima dos resultados quando
`vectorAvailable` é `false` (com `vectorUnavailableReason`, quando
existe), e `RagCoveragePanel` só renderiza contagem REAL (`filesIndexed`/
`filesInRepo`, `sessionsIndexed`/`sessionsInProject`) — nenhum texto do
tipo "reindexado há Xmin" nasce nesta tela, porque a resposta não carrega
esse dado e inventá-lo mentiria (mesma régua do ADR 0042 para nota de
modelo).

- **Onde:** `apps/web/src/routes/ProjectRagTab.tsx` (linhas 27-31, 176-182),
  `apps/web/src/components/rag/RagCoveragePanel.tsx` (linhas 27-34)
- **Teste:** `apps/web/src/routes/ProjectRagTab.test.tsx` — "CASO DE FALHA
  (degradação honesta): vectorAvailable false avisa..."; `apps/web/src/components/rag/RagCoveragePanel.test.tsx`
  — "CASO DE FALHA (degradação honesta): nunca escreve..."
- **ADR:** [0082](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0082-chat-rag-aba-de-busca-hibrida.md)

<a id="rn-253"></a>

### RN-253 — Citação de origem `session` navega até o EVENTO exato, reusando o mecanismo do Psicólogo {#rn-253}

`RagCitationCard` não inventa um segundo caminho de navegação: origem
`{ kind: 'session', sessionId, eventId }` chama `useNavigate` para
`/projects/:projectId/sessions/:sessionId` com `search: { highlightEvent:
eventId }` — a MESMA rota e o MESMO parâmetro que os chips de evidência
do Psicólogo já usam (`HypothesisCard.tsx`, Fase 4b) para rolar o fio até
o evento e destacá-lo. Origem `{ kind: 'file' }` mostra caminho e
`headingPath` como texto, sem link: a aba Código não tem hoje deep-link
por caminho, e construir essa navegação está fora do escopo desta
frente.

- **Onde:** `apps/web/src/components/rag/RagCitationCard.tsx` (linhas
  32-38, 49-56)
- **Teste:** `apps/web/src/components/rag/RagCitationCard.test.tsx` —
  "caminho feliz: origem de sessão navega até o evento exato ao clicar"
- **ADR:** [0082](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0082-chat-rag-aba-de-busca-hibrida.md)

<a id="rn-254"></a>

### RN-254 — O botão de reindexar é maintainer/owner na TELA, espelhando a régua da rota {#rn-254}

`POST .../rag/reindex` já exige `role:maintainer` (RN-238) — quem
garante é a api. `ProjectRagTab` espelha a régua no CLIENTE pelo mesmo
padrão que `ProjectSettingsTab`/`ProjectApprovalsTab` já usam para outros
gates de `maintainer` (`useCurrentWorkspaceWithRole`, já que não existe
hoje um papel de PROJETO no cliente, só o de workspace que a listagem
devolve): o botão "Reindexar agora" nem aparece para quem não é
`owner`/`maintainer`, em vez de aparecer desabilitado — reindexar dispara
N chamadas ao repositório do projeto e ao provider de embedding (mesma
régua "muda o que o produto gasta sem perguntar" do teto de paralelismo,
RN-083), e um botão visível mas sempre recusado só ensinaria a
ignorar o 403.

- **Onde:** `apps/web/src/routes/ProjectRagTab.tsx` (linhas 43-44, 109)
- **Teste:** `apps/web/src/routes/ProjectRagTab.test.tsx` — "botão de
  reindexar só aparece para maintainer/owner..."; "maintainer vê e pode
  disparar a reindexação"
- **ADR:** [0082](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0082-chat-rag-aba-de-busca-hibrida.md)

<a id="rn-268"></a>

### RN-268 — A aba Terminal mostra o estado REAL do container, nunca finge um terminal que não existe {#rn-268}

O plano original desta frente era o terminal interativo completo, mas a
investigação confirmou que a FASE 25b continua cortada: nenhum serviço monta
`/var/run/docker.sock`, e mesmo depois do ADR 0081 (Onda 4) nada transiciona
`project_containers` em produção. Implementar um terminal que finge executar
comandos — ou que roda no mesmo container do monorepo do Brabo, a dívida que
o ADR 0055 já descreve como política e não isolamento — seria inventar
capacidade, o mesmo erro que os ADRs 0041/0042 já recusam para provider de
LLM e modelo de catálogo.

O que a aba GANHA é honesto: sob o texto explicativo que já existia (FASE
26b), `CodeBottomPanel` busca `GET .../container/lifecycle` (RN-267) só
enquanto a aba Terminal está aberta (`enabled: aba === 'terminal'` — sem
polling em segundo plano, a mesma disciplina de tráfego da RN-107) e mostra
o status com um `Badge` (`provisioning`/`running`/`stopped`/`failed`/
`removed`, em pt-BR), há quanto tempo, e o `failureReason` quando o estado é
`failed`. Projeto nunca provisionado — o caso comum hoje — mostra a frase
"ainda não foi provisionado", nunca um badge inventado.

- **Onde:** `apps/web/src/routes/code/CodeBottomPanel.tsx`,
  `apps/web/src/routes/code/CodeBottomPanel.module.css`,
  `apps/web/src/lib/api-client.ts` (`getContainerLifecycle`),
  `apps/web/src/lib/api-types.ts` (`CicloDeVidaDoContainer`)
- **Teste:** `apps/web/src/routes/code/CodeBottomPanel.test.tsx`
  (describe "Terminal — o estado REAL do ciclo de vida do container")
- **Borda:** o terminal interativo em si NÃO nasce aqui — é FASE 25b, que
  segue cortada e depende da parede física do container (o worktree do
  agente vivendo lá dentro), não desta rota de leitura.
- **ADR:** [0083](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0083-terminal-mostra-estado-real-do-container.md)

## UX Designer — o quinto agente conversacional (RN-285..287, ADR 0087)

<a id="rn-287"></a>

### RN-287 — `uxDesignerActive` no roster, nas DUAS fontes (RN-090) {#rn-287}

Mesmo critério de `infraActive`: handoff `accepted` endereçado a
"ux-designer" na sessão. `apps/web/src/lib/agent-status.ts`
(`rosterFactsFromEvents`/`rosterFromFacts`) ganhou o fato e o empurra
condicionalmente no roster como agente SOLO — sem `pushAreaMembers`
correspondente, porque ele não é área.

A RN-090 exige as DUAS fontes em sincronia (painel do time via event log; o
card do dashboard via `ProjectCardSummary.roster`, computado na api) para que
um agente novo não apareça num lugar e falte no outro. O fato entrou nas
duas: `apps/api/src/infrastructure/persistence/drizzle/projects-summary.repository.ts`
amplia a MESMA consulta de `infraActive` (um `inArray(handoffs.toAgent,
['infra', 'ux-designer'])` no lugar do `eq` único, partido em dois `Set` por
`toAgent`) — nenhuma consulta nova, a contagem de doze consultas constantes
que `projects-summary.repository.spec.ts` prova não cresce.

- **Onde:** `apps/engine/lib/engine/agents/ux_designer_server.ex`,
  `ux_designer_tools.ex`, `ux_designer_supervisor.ex`;
  `apps/engine/lib/engine/harness/agents.ex` (identidade),
  `artifact_schemas.ex` (tipo `prototipo_navegavel`);
  `apps/engine/lib/engine/application.ex`;
  `apps/engine/lib/engine_web/controllers/agent_command_controller.ex`;
  `apps/web/src/lib/agents.ts`, `agent-status.ts`;
  `apps/api/src/application/ports/projects-summary-repository.port.ts`,
  `apps/api/src/infrastructure/persistence/drizzle/projects-summary.repository.ts`
- **Teste:** `apps/engine/test/engine/agents/ux_designer_server_test.exs`,
  `ux_designer_tools_test.exs`; `apps/web/src/lib/agent-status.test.ts`;
  `apps/api/test/infrastructure/persistence/drizzle/projects-summary.repository.spec.ts`
  (describe com os dois `toAgent` na mesma sessão)
- **ADR:** [0087](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0087-ux-designer-agente.md)

---

## Onda 1 do ADR 0104 — `execution_mode` em três valores, workspace verificado pelo runner

<a id="rn-428"></a>

### RN-428 — Carrossel de promoção de histórias sobrevive à janela de eventos {#rn-428}

`promocoesPendentes`/o carrossel de promoção do PO (RN-148) não depende mais
de scan sobre a janela dos últimos 200 eventos de `useSessionEvents`. A fonte
de conteúdo/contagem é `useBacklog` (`Story.proposedReady`, por sessão,
completa e sem janela) — numa sessão longa, `backlog.story_promotion_proposed`
sai da janela enquanto a história continua pendente de verdade, e antes disso
o carrossel encolhia (ou sumia) silenciosamente. Mesma classe de bug que a
RN-180 já corrigiu para `ContextAside`.

Quando a story não está no backlog carregado (query ainda não respondeu),
degrada story a story para o scan de janela de sempre. O ancoramento na
timeline continua vindo do evento dentro da janela quando ele existir; se o
evento que abriu a leva já saiu da janela, o carrossel ancora no TOPO do
trecho visível em vez de sumir — nunca esconder um estado real por causa de
corte de leitura.

- **Onde:** `apps/web/src/routes/SessionPage.tsx` (`useMemo` `timeline`)
- **Teste:** `apps/web/src/routes/SessionPage.carrossel-janela-estourada.test.tsx`
- **ADR:** nenhum — correção de bug, mesma classe já corrigida pela RN-180
- **Origem:** achado por uso real ("o chat falhou em mostrar o carrossel do PO")

---

<a id="rn-431"></a>

### RN-431 — O selo da aba Arquitetura conta pendência de validação, nunca "diagrama não gerado" {#rn-431}

`contagens.arquiteturaPendente` (régua de abas) vem de
`architecture.pendencies.length` (divergência de validação cruzada
história↔módulo), não de `c4Diagram.status === 'sem_diagrama'`. As outras
três contagens da régua (`promocoesPendentes`, `aprovacoesPendentes`,
`hipotesesPendentes`) significam todas "algo espera SUA decisão" — gerar o
diagrama é trabalho do Arquiteto, não fila de decisão do usuário, e
badigar por isso seria ruído.

- **Onde:** `apps/web/src/routes/ProjectPage.tsx`
- **Teste:** `ProjectPage.test.tsx`
- **ADR:** nenhum
- **Origem:** decisão de design tomada ao extrair a aba Arquitetura da
  Visão Geral

---

<a id="rn-432"></a>

### RN-432 — Preferência de idioma vem no payload de login/refresh, nunca numa chamada extra {#rn-432}

> Revisada pela [RN-891](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-891): a coluna aceita também `ru` e `zh-Hans`,
> e o padrão do web passou de `en` para `pt-BR` (ADR 0216).

Fundação de i18n da interface (Onda 6a de um programa maior — a extração em
massa das strings do resto do app é etapa separada, em paralelo). Coluna
`locale` em `users` (`'pt-BR' | 'en'`, default `'pt-BR'` — nunca flipa
silenciosamente quem já tem conta). `EmitirSessaoUseCase` é o ÚNICO ponto
que emite sessão (login, refresh, login social) — `locale` embutido no
corpo de `/auth/login`/`/auth/refresh` a partir dele, sem round-trip
adicional. `GET/PATCH /users/me/preferences` existe como via REDUNDANTE,
pra `AccountPage` reafirmar o valor sem esperar o próximo refresh.

`en` é o idioma DEFAULT do app a partir de agora (`react-i18next`, nova
dependência — mesma régua de "dependência nova precisa de justificativa"
que `mermaid`/`@xterm/xterm` já seguiram); `pt-BR` continua disponível.
`apps/web/src/lib/idioma.ts` (mesmo desenho de `tema.ts`): o SERVIDOR é a
fonte de verdade, `localStorage['brabo.locale']` é só cache pra evitar
flash de idioma errado no primeiro paint. Usuário sem conta ainda usa
`navigator.language` só como sugestão de EXIBIÇÃO, nunca persiste nada
antes de existir conta.

- **Onde:** `apps/api/src/application/use-cases/auth/emitir-sessao.use-case.ts`,
  `apps/api/src/interfaces/http/iam/user-preferences.controller.ts`,
  `apps/web/src/lib/idioma.ts`, `apps/web/src/lib/i18n.ts`,
  `apps/web/src/routes/AccountPage.tsx`
- **Teste:** `apps/web/src/lib/idioma.test.ts`,
  `apps/web/src/routes/AccountPage.test.tsx`,
  `apps/api/test/application/use-cases/auth/*.spec.ts`,
  `apps/api/test/interfaces/route-surface.spec.ts`
- **ADR:** nenhum — extensão aditiva de um choke point já existente, sem
  mudar o formato de sessão pra ninguém que não usa o campo novo
- **Origem:** pedido do dono do produto — interface e docs em inglês por
  padrão, com português preservado

---

## O explorador de pasta do Runner vira três colunas, e a criação de um projeto `runner` deixa de esperar o passo final (RN-436/436)

Duas mudanças pedidas pelo dono do produto depois de testar a criação de um
projeto real: (1) o navegador de pasta existente
(`FolderBrowserModal`) era uma lista simples com breadcrumb, quando a
referência visual que ele mandou (um picker estilo GNOME Files/GTK, de três
colunas) já existia como handoff de design pronto pra adaptar; (2) "Procurar
pasta..." não funcionava na TELA DE CRIAÇÃO do projeto — só depois de
criado — porque o ticket do canal do Runner (ADR 0107) é ancorado a um
`projectId` que, até esta correção, só nascia na confirmação.

<a id="rn-436"></a>

### RN-436 — `FolderBrowserModal` vira um explorador de três colunas: atalhos, lista com um clique seleciona/duplo clique entra, e um painel de detalhes {#rn-436}

O layout de lista única virou três colunas dentro do `Modal size="full"`:
atalhos (Pasta pessoal, que chama `diretorioInicial()`; Raiz, `/`), a lista
central com breadcrumb, e um painel de detalhes à direita. O protocolo
(`FsEntrada`, em `apps/web/src/lib/fs-browser-channel.ts`) só tem
`{ nome, isDir }` — sem tamanho nem data de modificação — e não foi
estendido (mexeria em `apps/engine`/`apps/runner`, fora do escopo desta
entrega); o painel de detalhes só mostra o que dá pra derivar client-side:
nome, tipo, e a contagem de itens quando o item exibido é a pasta JÁ ABERTA
(nunca de uma pasta só selecionada, que exigiria uma chamada extra ao
runner).

Os DOIS gestos que antes estavam fundidos num único clique (que já navegava
pra dentro da pasta) foram separados: um clique agora só SELECIONA (destaca
o item e atualiza o painel de detalhes) e um duplo clique ENTRA. O botão
final ("Usar esta pasta", renomeado de "Selecionar esta pasta" — a chave
`folderBrowserModal.select` de `pt-BR`/`en` mudou junto) usa o item
selecionado quando houver um (`selected.kind === 'dir' ? join(path,
selected.name) : path`) ou a pasta aberta no momento quando não houver
nenhum. A lista deixou de filtrar arquivos — a listagem inteira aparece
agora, com arquivos renderizados como `<div aria-disabled>` em vez de
`<button>`: visualmente apagados e sem gesto nenhum, porque só pasta
continua navegável/selecionável.

- **Onde:** `apps/web/src/components/FolderBrowserModal.tsx`,
  `FolderBrowserModal.module.css`,
  `apps/web/src/locales/{pt-BR,en}/terminal.json`
- **Teste:** `apps/web/src/components/FolderBrowserModal.test.tsx` — clique
  único seleciona sem chamar `listarDiretorio` de novo; duplo clique navega;
  arquivo aparece na lista mas não é alcançável por `getByRole('button')`;
  atalhos "Pasta pessoal"/"Raiz"; e "Usar esta pasta" usa o selecionado
  quando houver, senão a pasta aberta
- **ADR:** nenhum — redesenho de UI sobre um componente que já existia, sem
  mudança de protocolo nem de fronteira de dado (o ADR 0107 continua
  descrevendo o mecanismo por trás)
- **Origem:** pedido do dono do produto, depois de testar a criação de um
  projeto real e achar o navegador de pasta pouco parecido com um
  explorador de arquivos de verdade — referência visual enviada por ele
  (picker de três colunas, estilo GNOME Files/GTK)

<a id="rn-437"></a>

### RN-437 — No modo `runner`, "Procurar pasta..." cria o projeto ANTECIPADAMENTE, e a confirmação final reusa por SNAPSHOT de identidade {#rn-437}

O ADR 0107 já tinha declarado esta lacuna na própria seção de Consequências:
sem projeto ainda, o ticket do canal (RN-429) não tem a quem se ancorar, e
"Procurar pasta..." caía sempre no estado "disponível depois que o projeto
existir" — mesmo no modo `runner`, onde a criação NÃO depende de validar
disco (ADR 0104, item 2). Fechado pelo [ADR 0108](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0108-projeto-runner-nasce-ao-navegar-pasta-no-wizard.md):
`NewProjectWizard.tsx` (`handleProcurarPasta`) chama `createProject` ao
clicar "Procurar pasta..." quando `modoDeWorkspace === 'runner'` — usando o
caminho já digitado, ou um placeholder lexicalmente válido e claramente
provisório (`/workspace-a-confirmar`) quando o campo ainda está vazio, nunca
bloqueando o clique. O modo `mounted` **não muda**: continua com
`projectId={null}` até a confirmação, porque ali a validação de disco roda
na criação e criar cedo com caminho vazio devolveria a recusa da RN-422 num
momento em que o usuário nem pensou em caminho ainda.

Um SNAPSHOT de identidade (`{ name, externalId, adotando }` — nunca
`caminhoLocal`, cujo refino é o PROPÓSITO de navegar) decide quando reusar:
clicar "Procurar pasta..." de novo com a identidade intacta reabre o modal
com o MESMO projeto, sem criar outro; mudar o nome (ou voltar e trocar o
repositório a adotar) invalida o snapshot, e a próxima navegada cria um
projeto novo. `handleConfirm` aplica a mesma régua — reusa o projeto
já criado ao navegar quando o snapshot ainda bate, e só chama `createProject`
quando não há nada pra reusar. `montarPayloadDeCriacao`, função pura extraída
do que antes vivia só dentro de `handleConfirm`, é reaproveitada pelos dois
caminhos.

O pré-requisito do botão é dito ANTES do clique (AT-214): neste modo a lista
vem do agente local, então sem um `brabo-runner` rodando e conectado ao
projeto recém-criado o modal só consegue mostrar a espera e o onboarding. A
tela passou a dizer isso em TEXTO abaixo do campo (`aviso-procurar-runner`,
ADR 0064 — nunca tooltip), com o comando
`brabo-runner --project <id> --dir <pasta>` e a alternativa que não depende
de nada: digitar o caminho no campo, que o runner confirma ao conectar. O
mecanismo (a criação antecipada, o transporte pelo agente local) não mudou.

- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx`
  (`handleProcurarPasta`, `handleConfirm`, `montarPayloadDeCriacao`,
  `snapshotDeIdentidade`/`mesmaIdentidade`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx`, describe
  `navegação de pasta antecipada no modo Runner` — cria o projeto e abre o
  modal com o id real; usa o placeholder quando o campo está vazio; clicar
  de novo sem mudar nada não cria outro; mudar o nome invalida o snapshot e
  cria um projeto diferente; `handleConfirm` reusa em vez de duplicar. O
  teste preexistente "'Procurar pasta...' mostra o estado declarado" (modo
  `mounted`) continua verde, sem alteração — prova que o escopo não vazou
- **ADR:** [0108](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0108-projeto-runner-nasce-ao-navegar-pasta-no-wizard.md)
  — mudança estrutural (QUANDO um projeto passa a existir no fluxo de
  criação), com o efeito colateral aceito de projeto "não provisionado"
  órfão quando o wizard é fechado sem terminar (o MESMO estado que qualquer
  criação interrompida hoje já produz, não uma regressão nova)
- **Origem:** pedido do dono do produto, depois de testar a criação de um
  projeto real no modo Runner e não conseguir navegar pastas antes de
  confirmar — a lacuna que o ADR 0107 já tinha declarado e adiado

<a id="rn-438"></a>

### RN-438 — `fs-browser-channel.ts` tinha o MESMO bug de path duplicado que a RN-433 já tinha corrigido no `terminal-channel.ts` irmão {#rn-438}

Achado ao verificar a RN-437 ponta a ponta no Chrome, contra o engine real:
o modal abria com o `projectId` certo, mas a conexão caía na hora com "A
conexão com o runner caiu — feche e reabra para tentar de novo." em vez de
mostrar `RunnerOnboardingPanel`. `apps/web/src/lib/fs-browser-channel.ts`
concatenava `'/runner/websocket'` a um `engineWsUrl` que a api já devolve
PRONTO (`ws://host:porta/runner`, de `engineWsUrlPublico()`) — o mesmo
`Socket` do `phoenix.js` ainda acrescenta `/websocket` sozinho no
construtor, e o resultado batia no engine como `GET
/runner/runner/websocket/websocket`, que `Phoenix.Router.NoRouteError`
recusa. É EXATAMENTE o item 3 da RN-433, só que no módulo IRMÃO — a
correção de lá nunca tinha sido replicada aqui, e nenhuma suite pegava
porque este módulo não tinha teste nenhum até agora (o próprio docblock
dizia, incorretamente, que `terminal-channel.test.ts` cobria "indiretamente").
Fix: mesma linha da RN-433 — `engineWsUrl.replace(/^http/, 'ws')`, sem
concatenar path nenhum.

Verificado END TO END contra um projeto `runner` real (owner logado,
`teste-navegacao`, criado pela RN-437): antes da correção, o modal caía
direto no erro de conexão; depois, mostra `RunnerOnboardingPanel` com o
comando `brabo-runner --project <id-real> --dir <pasta>` em menos de 2s —
o resultado esperado sem um runner de verdade conectado.

- **Onde:** `apps/web/src/lib/fs-browser-channel.ts`
- **Teste:** `apps/web/src/lib/fs-browser-channel.test.ts` (novo — o
  módulo não tinha teste próprio nenhum até esta correção). Caminho feliz
  confirma `socket.url === engineWsUrl` sem concatenação; mais
  `diretorioInicial`/`listarDiretorio` roundtrip, falha ao buscar ticket, e
  `fechar()` idempotente
- **ADR:** nenhum — restaura o comportamento que o ADR 0103/0107 e a RN-433
  já declaravam como intenção, só que num módulo que a correção anterior não
  alcançou
- **Origem:** achado testando manualmente a RN-437 (criação antecipada de
  projeto `runner`) contra o Chrome e o engine real — a primeira vez que
  `FolderBrowserModal` foi exercitado ponta a ponta contra uma conexão de
  verdade, porque antes desta entrega "Procurar pasta..." nunca alcançava
  um projeto real antes da confirmação

## Pasta local anexada vira o quarto escopo do índice RAG, lido pelo NAVEGADOR (RN-455..457, ADR 0113)

<a id="rn-456"></a>

### RN-456 — Teto agregado REJEITA (400) o upload inteiro; arquivo individual grande/binário só é PULADO {#rn-456}

Diferente de `docs`/`adr` (uma varredura em background, sem ninguém
olhando), anexar uma pasta é um gesto ÚNICO com um seletor de pasta na
tela. `IndexLocalFolderUseCase` recusa (400) o lote inteiro quando a
quantidade de arquivos (`RAG_LOCAL_FILE_COUNT_LIMIT`, 500) ou os bytes
somados (`RAG_LOCAL_TOTAL_BYTES_LIMIT`, 8 MiB) estouram — nunca trunca em
silêncio, porque quem clicou "Anexar" pode escolher uma pasta menor. Um
arquivo individual grande demais (`RAG_LOCAL_FILE_BYTES_LIMIT`, 512 KiB) ou
de extensão não reconhecida (`RAG_LOCAL_ALLOWED_EXTENSIONS`, allowlist) é
só PULADO (`filesSkipped`), nunca derruba o lote — a mesma distinção que
`IndexProjectDocsUseCase` já faz implicitamente ao filtrar só `.md`.
Caminho com `..` ou barra inicial é RECUSADO (400), nunca aceito
silenciosamente, mesma disciplina de nunca confiar em caminho vindo do
cliente (RN-092/095) mesmo quando ele "não deveria" conter isso.
`apps/web/src/lib/rag-local-limits.ts` espelha os mesmos números no
cliente, só como conveniência de UX (resumo antes de enviar) — quem
garante de verdade é o servidor.

- **Onde:** `apps/api/src/domain/rag/rag-search-limits.ts` (`RAG_LOCAL_*`),
  `apps/api/src/application/use-cases/rag/index-local-folder.use-case.ts`
- **Teste:** `apps/api/test/application/use-cases/rag/index-local-folder.use-case.spec.ts`
  (tetos de quantidade e bytes somados rejeitam; arquivo grande/binário é
  pulado; caminho com `..`/barra inicial é recusado)
- **ADR:** [0113](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0113-pasta-local-anexada-via-navegador-vira-chunks-scope-local.md)
- **Origem:** pedido do dono do produto

<a id="rn-460"></a>

### RN-460 — A faixa de atividade do turno narra em tempo real, e o fio só recebe a resposta no fim {#rn-460}

A tela de Sessão mostra, ACIMA do composer, uma faixa que narra em
linguagem humana o que um agente conversacional (Criativo, PO, Arquiteto,
Dev Lead, UX Designer, Staff) está fazendo DURANTE o turno — referência
visual: a linha de status do Claude Code. O fio só recebe a bolha de
resposta DEPOIS que o turno termina; a regra é do CHAT (canal Phoenix) e
vale só para os seis agentes conversacionais — o chat consultivo sem
agente ativo (SSE, `streamChatMessage`) continua com a bolha de streaming
de sempre, intocada. (Desde a [RN-682](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-682) a tela não chama mais esse
SSE: a consultiva sem agente pede um agente antes de enviar.)

**Mecanismo (engine)**: os seis servers já emitem `tool.call` DURÁVEL no
event log; passam a também fazer `broadcast(state, "tool.call", %{tool:
name, agent: @agent})` — EFÊMERO, sem `args` (nunca payload cru, mesma
régua da RN-096/RN-412) — logo depois, pro canal `session:<id>` entregar
em tempo real. Não há behaviour/macro compartilhado entre os seis
`dispatch_tool` (quatro formas estruturais distintas confirmadas por
leitura completa): a mudança é seis edições adaptadas à forma local de
cada um.

**Mecanismo (web)**: um reducer PURO
(`reduzirAtividadeDoTurno`/`lib/atividade-do-turno.ts`) acumula o texto do
`agent.delta` como "corrente"; ao chegar um `tool.call` do canal, arquiva
o corrente não-vazio como linha de NARRAÇÃO, zera, e SEMPRE adiciona uma
linha de FERRAMENTA com `fraseDaFerramenta(tool)` (dicionário das 19
ferramentas dos seis agentes, `lib/narracao-de-ferramentas.ts`, sem RN
própria — só existe pra servir esta regra) — duas chamadas consecutivas
sem delta entre elas viram duas linhas separadas, nunca uma. Fim de turno
reseta (`finalizarTurnoDoAgente`, ÚNICO ponto de reset). `turnoViaCanal`
é uma flag PRÓPRIA (nunca derivada de `statusAgent`/`streamingAgent`, que
passam por janelas legitimamente `null` no meio de um turno) que decide
se a faixa aparece OU a bolha antiga — nunca as duas.

**Regra de apresentação (histórico)**: `agruparNarracoesDoTurno`, nova
passada pura que roda DEPOIS de `afundarDesfechos` (RN-172) no mesmo
`useMemo` — dentro de um mesmo `turno`+`autor`, `agent.response`
consecutivas viram um `Disclosure` compacto ("Passos do turno · N"),
deixando só a última intacta e fora dele. `turno === 0` (o prólogo
sentinela de `turnoDoSeq`) fica de FORA do agrupamento, de propósito —
não é um turno de verdade, e fixtures antigas empilham `agent.response`
sem fronteira de turno pra testar outro mecanismo (RN-138/RN-177).
Função agnóstica a agente (só lê `turno`/`autor`), `afundarDesfechos` em
si não muda.

- **Onde:** `apps/engine/lib/engine/agents/{po,criativo,arquiteto,
  dev_lead,ux_designer,staff}_server.ex` (broadcast de `tool.call`);
  `apps/web/src/lib/atividade-do-turno.ts` (reducer);
  `apps/web/src/components/TurnActivityStrip.tsx` (componente);
  `apps/web/src/lib/session-channel.ts:54` (`onToolCall`);
  `apps/web/src/routes/session-fio.tsx:48` (`agruparNarracoesDoTurno`),
  `apps/web/src/routes/SessionPage.tsx:191` (`turnoViaCanal`)
- **Teste:** `apps/web/src/lib/atividade-do-turno.test.ts`,
  `apps/web/src/components/TurnActivityStrip.test.tsx`,
  `apps/web/src/lib/session-channel.test.ts`,
  `apps/web/src/routes/SessionPage.ordenacao-e-avisos.test.tsx`
  (`agruparNarracoesDoTurno`), suite de `apps/engine/test/engine/agents/
  *_server_test.exs` (broadcast de `tool.call` sem args crus)
- **Origem:** pedido do dono do produto

## Painel "precisa de você" (RN-467)

<a id="rn-467"></a>

### RN-467 — O painel das cinco filas de decisão NUNCA soma e NUNCA executa: separa por fila e encaminha para a decisão {#rn-467}

O chip "Precisa de você", no topo do projeto, abre um painel com as CINCO
filas de decisão do projeto — aprovações de ação, merges de PR, promoções de
história, pendências de arquitetura e hipóteses do Psicólogo. Duas garantias
o definem, e nenhuma das duas é estética:

**Nunca soma.** Cada fila tem cabeçalho e contagem PRÓPRIA, e não existe
total do projeto em lugar nenhum: nem no painel, nem no chip que o abre — o
chip anuncia PRESENÇA (um ponto, `temAlgoEsperando`, booleano por assinatura)
e nunca quantidade. É a mesma decisão de produto que já mantém os cinco
contadores do trilho separados (ADR 0126): somar apaga QUAL fila está pedindo
atenção, que é justamente a pergunta de quem abre o painel. `montarFilas`
devolve as cinco na ordem de urgência declarada (`ORDEM_DAS_FILAS`) e não
exporta função de total — a ausência é o mecanismo, não um esquecimento.

A única dedupe que existe é por IDENTIDADE, nunca entre filas: a MESMA
`proposed_action` de `git_merge` chega pelos dois hooks (`usePendingActions` é
da sessão e não filtra por tipo; `useProjectPendingActions` é project-wide) e
apareceria duas vezes na mesma lista, sob dois títulos. Fica no grupo mais
específico (`prs`).

**Nunca executa.** As duas filas acionáveis no painel (`aprovacoes`, `prs`)
renderizam o MESMO `ApprovalCard` da aba de Aprovações (uma variante só desde
a AT-322, com o detalhe recolhido),
e os botões chamam os mesmos endpoints de decisão — o painel é um ATALHO para
a decisão, nunca um substituto dela. Isso importa em especial para
`git_merge`: merge em branch protegida é rebaixado a `require_approval`
INCONDICIONALMENTE (`apps/api/src/domain/actions/decide.ts`), teto que nem
`agent_autonomy` nem `permissions.json` levantam, e nada no painel toca nesse
caminho. `onActivateAutoMode` é OMITIDO nos dois cards de propósito: ligar
"auto mode" (RN-153) é mudar POLÍTICA do agente, não decidir a ação que está
na frente — quem quer isso decide na aba de Aprovações, onde o papel de
workspace já é checado. As outras três filas não têm card de decisão fora do
contexto delas e por isso LEVAM à aba onde a decisão mora.

**A pendência de arquitetura não tem data própria** — nenhuma, em campo
nenhum (`ArchitecturePendency`): ela é visão DERIVADA do cruzamento entre
história e `module_map`, recalculada a cada leitura e nunca gravada. O painel
EMPRESTA a data da história relacionada e DIZ que emprestou ("história
atualizada há 18 min", `dataEmprestada`); sem a história no backlog carregado,
mostra "sem data" e ordena o item no FIM da fila. Em nenhum caso um instante
inventado: renderizar "agora" faria a linha mais urgente da tela ser a que
menos se sabe, sem nada denunciando a mentira. Acrescentar coluna e migração
na api resolveria de verdade e é decisão à parte, fora do escopo desta.

- **Onde:** `apps/web/src/lib/precisa-de-voce.ts:108` (`ORDEM_DAS_FILAS`),
  `:117` (`FILAS_ACIONAVEIS`), `:139` (`montarFilas` — a dedupe por
  identidade e o empréstimo de data), `:245` (`temAlgoEsperando`);
  `apps/web/src/components/PainelPrecisaDeVoce.tsx:246-248` (`role="dialog"`,
  `aria-modal`, rótulo) e `:279-284` (grupo por fila, com a contagem dela);
  `apps/web/src/routes/ProjectPage.tsx:120` (monta as filas a partir dos
  cinco hooks que os contadores do trilho já usam)
- **Teste:** `apps/web/src/lib/precisa-de-voce.test.ts` (as cinco filas
  separadas com os itens de cada uma; nada somado e nenhuma função de total;
  o `git_merge` duplicado aparece uma vez, na fila de PRs; ordem por espera
  mais longa; data emprestada marcada, ausente vira `null` e vai para o fim),
  `apps/web/src/components/PainelPrecisaDeVoce.test.tsx` (cinco cabeçalhos com
  a contagem de cada fila; o total não aparece em lugar nenhum; frase própria
  do vazio; `ApprovalCard` decide pela sessão da PRÓPRIA ação; "Modo
  automático" não é oferecido; linha de arquitetura sem data renderiza sem
  quebrar; `Esc`, clique-fora, foco e `aria-expanded`)
- **Origem:** revisão de design do dono do produto (item #3 do canvas de
  melhorias de UI)

## Estado de ambiente na tela (RN-468)

<a id="rn-468"></a>

### RN-468 — Sinal de ambiente diz o que SABE: `workspaceVerifiedAt` é registro de confirmação, nunca garantia de que o runner está vivo {#rn-468}

O produto mostra estado de ambiente em dois lugares, e o recorte de cada um é
a regra: a tela de **login** mostra só o que é verdade SEM identidade, e a
**Visão geral do projeto** mostra o que só é verdade COM ela.

**Pré-login, o recorte é imposto pelo escopo do dado, não por escolha
estética.** Sobram os dois `/health` — públicos nos dois serviços de propósito
(`@Public()` na api; "Sem auth de propósito" no `router.ex`), os mesmos que
`StatusPage` já consome sem sessão. Presença de runner é chaveada por
`{user_id, project_id}` (`runner_device_keys`) e a lista de modelos é
`projects/:projectId/models` com papel `viewer`: antes do login não existe
nenhum dos dois sujeitos, então a tela **declara a ausência** ("Runner e
modelos locais dependem da sua conta e de um projeto") em vez de omiti-la —
omitir faria a plataforma parecer não ter o que ela tem. Os dois `/health`
mantêm os TRÊS estados separados (RN-088 aplicada a um sinal de ambiente):
`verificando…` não é `sem resposta`, e nenhum dos dois é `respondendo`. A
sonda tem TETO (6s): uma api que aceita a conexão e nunca responde deixaria a
linha em "verificando…" para sempre, o que é honesto por meio segundo e
mentira por omissão depois de dez.

**E o formulário nunca espera pela sonda.** O estado é local ao bloco, que é
IRMÃO do card — api fora do ar muda um texto e não atrasa nem esconde um pixel
do login. Isso importa exatamente no momento em que a api cai, que é quando
alguém mais precisa que a tela ao menos ABRA.

**Pós-login, a regra é sobre o que o dado NÃO afirma.** O sinal de runner sai
de `projects.workspace_verified_at` — o carimbo que `ConfirmProjectWorkspaceUseCase`
grava quando um runner conecta e confirma a pasta (RN-423), e o MESMO campo
que o engine usa como portão (`TerminalExecutor` recusa comando em projeto
`runner` com o campo nulo). Ele **não é batimento**, por duas razões
independentes: não há processo sendo observado, e **reconectar reportando o
mesmo caminho não regrava o carimbo** (decisão explícita do caso de uso), de
modo que nem a data é "a última vez que o runner apareceu". A tela diz "pasta
confirmada em `<data>`" com a ressalva do que isso não é, e **nunca** "de pé",
"online" nem bolinha verde — o tom é `neutro`, e verde ali leria como uma
garantia de liveness que o dado não sustenta. Quem sabe do AGORA é o socket
do terminal, na aba Código (`TerminalPanel`/`RunnerOnboardingPanel`), e a
ressalva aponta para lá. Mesma disciplina que a RN-467 usou ao tomar
emprestado o `updatedAt` da história.

A linha do runner só existe em projeto no modo `runner`: nos outros dois o
campo é nulo por definição (a conversão de modo o zera, RN-450) e uma linha
"nunca confirmada" ali seria uma ausência inventada.

- **Onde:** `apps/web/src/components/SinaisDoAmbiente.tsx:72` (`useSaude` — a
  sonda com teto e o `.catch` da rejeição de conexão), `:133`
  (`SinaisDoAmbiente`, o bloco pré-login);
  `apps/web/src/components/AmbienteDoProjeto.tsx:92` (`AmbienteDoProjeto`),
  `:102` (linha do runner, só no modo `runner`, com tom `neutro` e ressalva);
  `apps/web/src/routes/AuthLayout.tsx:46` (`colunaDeIdentidade` — nada focável
  ali, ou a primeira parada de `Tab` deixa de ser o campo de e-mail);
  `apps/api/src/application/use-cases/iam/confirm-project-workspace.use-case.ts:93`
  (o carimbo NÃO é regravado quando o caminho não muda — a razão de a data não
  ser recência)
- **Teste:** `apps/web/src/components/SinaisDoAmbiente.test.tsx` (os três
  estados distintos; rejeição de conexão vira "sem resposta" e não silêncio;
  resposta não-OK idem; teto da sonda pendurada; nenhum elemento focável; a
  ausência de runner/modelos é declarada),
  `apps/web/src/components/AmbienteDoProjeto.test.tsx` (sem linha de runner
  fora do modo `runner`; confirmado exige a ressalva e o bloco não contém
  `de pé|online|conectado agora`; nunca confirmado ensina o caminho; contagem
  de modelos locais no singular, no plural e no zero; chaves de consulta
  reusadas), `apps/web/src/routes/LoginPage.ambiente.test.tsx` (o formulário
  renderiza e submete com a sonda rejeitando E com a sonda pendurada; um `<h1>`
  só; a versão continua com uma fonte)
- **Origem:** revisão de design do dono do produto (item #6 do canvas de
  melhorias de UI)

<a id="rn-469"></a>

### RN-469 — Salvar uma seção são N chamadas, e a tela nunca afirma o desfecho que não obteve {#rn-469}

Nas seções de Configurações cujas linhas são um ajuste ESCALAR por chave
(`Paralelismo por área` e `Teto de gasto por área`, as duas por `agent_areas`),
o botão de salvar é UM, da seção, e não um por linha. Salvar dispara **uma
chamada por linha suja** — `PUT .../areas/:key/max-parallel` e
`.../budget` são endpoints por ÁREA, não existe endpoint transacional para "grave
estes N tetos", e este produto **não inventou um**. A consequência é que o
desfecho de um clique pode ser parcial, e a regra é sobre o que a tela pode
dizer então.

**As chamadas são em SÉRIE, na ordem da tela, e uma falha não interrompe as
seguintes.** Em série porque o relatório de falha nomeia linhas e precisa sair
na ordem em que a pessoa as vê. Sem interromper porque quem clicou pediu as N:
abortar na primeira recusa deixaria linhas sem tentativa nenhuma, e a tela não
teria como distinguir "a api recusou" de "nem chegou a tentar".

**O desfecho é por LINHA, e é ele que a UI mostra.** Só o rascunho que a api
CONFIRMOU é descartado; o que falhou permanece no campo, com o que a pessoa
digitou, e a seção continua marcada como não salva por exatamente essas linhas
— clicar Salvar de novo tenta só elas. Os três desfechos são distintos e nenhum
se disfarça de outro: todas passaram → sucesso; **nenhuma** passou → a mensagem
que a API deu, nunca uma contagem; **algumas** passaram → aviso que diz quantas
de quantas e **nomeia** as que ficaram. "Salvo" e "não salvo" seriam as duas
mentira no terceiro caso, e é ele que esta RN existe para proteger.

**A seção declara QUANTAS linhas estão pendentes antes do clique.** Um botão
por seção diz "Salvar" igual com uma linha suja e com cinco; a contagem
("2 alterações não salvas nesta seção") é a contrapartida de ter trocado N
botões por um. Sujo é comparação por **valor interpretado**, não por texto:
`20` e `20.0` são o mesmo teto, e comparar string mandaria uma chamada que a
api trata como no-op. Rascunho inválido conta como sujo e **substitui** a
contagem pela mensagem que explica o bloqueio — dois números sobre o mesmo
conjunto seriam ruído, e quem tem valor inválido precisa do que trava o botão.

**Onde a regra NÃO vale, e por quê.** Seção cujo controle é escolha de valor
NOMEADO (`Promoção de história`, `Modelos por agente` (com a caixa da área do lead, RN-912),
papel em `Membros`) salva no `onChange`, sem botão, e continua assim: a
confirmação existe para campo DIGITADO, onde salvar a cada tecla mandaria `1` a
caminho de `12`. O que essa frase mede é de quem é o valor: ela vale para o
controle que grava o PRÓPRIO valor, e não alcança um seletor cujo valor é o
ARGUMENTO de uma ação sobre outras linhas — ver
[RN-476](#rn-476), que é a exceção e diz por quê. E `Credenciais` mantém botão por linha apesar de também ter
`drafts` por chave: a credencial é write-only (ADR 0050) e nunca volta do
servidor, então não há valor com que comparar para decidir "sujo"; o botão da
linha alterna entre "Salvar" e "Trocar" conforme aquele provider já tenha
chave; e ele divide o card com "Testar" e "Remover", que são irredutivelmente
da linha.

- **Onde:** `apps/web/src/routes/settings/secao-salvavel.helpers.ts:64`
  (`useSecaoSalvavel` — o laço em série, o desfecho por linha e os três toasts),
  `:89` (sujo por valor interpretado), `apps/web/src/routes/settings/secao-salvavel.tsx:66` (`MarcaDeNaoSalvo` — a contagem,
  e o inválido substituindo-a),
  `apps/web/src/routes/settings/ParallelismSection.tsx:31`,
  `apps/web/src/routes/settings/BudgetSection.tsx:37` (os dois consumidores),
  `apps/web/src/routes/settings/CredentialsSection.tsx:57` (por que esta seção
  ficou de fora)
- **Teste:** `apps/web/src/routes/settings/secao-salvavel.test.tsx` (a contagem
  de linhas sujas; voltar ao valor do servidor limpa a marca; inválido
  substitui a contagem e trava o botão; um clique persiste todas as linhas
  sujas; número e `null` na mesma leva; falha parcial diz quantas de quantas e
  nomeia a que ficou; a seção continua marcada pelas que falharam; o segundo
  clique tenta só elas; uma falha não interrompe as seguintes; nenhuma passando
  mostra a mensagem da API e não a contagem)
- **Origem:** revisão de design do dono do produto (item #7 do canvas de
  melhorias de UI — "salvar por seção em vez de por linha")

<a id="rn-470"></a>

### RN-470 — A origem do modelo distingue binding próprio de herança do Criativo, e nenhum vazio da cascata usa o mesmo símbolo de outro {#rn-470}

`origin: 'agent'` na resposta da api significa **duas coisas diferentes**, e a
api está certa em não separá-las: o agente tem uma linha de escopo `agent` em
`model_bindings`, **ou** a cascata pousou em `workspace` e
[`herdarModeloDeStart`](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102) trocou o valor pelo modelo do Criativo — quem
lê "de onde veio" precisa ver que veio de um AGENTE, não de um escopo que não
existe no banco. Quem tem de separá-las é a **tela**, e até aqui ela não
separava: a coluna Origem imprimia o enum cru, e num projeto com 3 linhas de
`agent` no banco os 12 agentes mostravam a mesma palavra `agent`.

**A origem é uma CADEIA, não uma palavra.** `workspace › projeto › área ›
agente` com quatro estados por nó, e os quatro existem porque dizem coisas
diferentes: **vigente** (é daqui que sai o modelo em uso — o único nó em
`Badge`), **definido** (este nível tem valor próprio, mas um mais específico
venceu), **vazio** (nenhum valor aqui) e **pulado** (tinha valor e a cascata o
descartou por `unavailable`/`sem_tool_calling`, [RN-043](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-043)). Colapsar
`definido` em `vazio` devolveria o problema do enum cru um nível abaixo.

**Na herança, o nó `agente` fica VAZIO e um nó extra nomeia o Criativo.** O
nível que a cascata alcançou (`workspace`) aparece como `definido` e **não**
como vigente: o modelo do workspace não é o que vale, e marcá-lo vigente
afirmaria o modelo errado. O nó do Criativo é o único que não é escopo do
banco, de propósito — ele nomeia o passo pós-cascata. A mesma cadeia vale para
a seção de ÁREA, onde `origin: 'agent'` **só** pode ser esse passo: a consulta
de área não põe escopo de agente na cascata.

**A derivação é do CLIENTE, e o que ela não consegue provar continua
acionável.** Nenhum endpoint novo: a tela já busca os quatro níveis. `agent` é
herança quando nenhum nível acima do workspace tinha valor UTILIZÁVEL (o que
foi pulado não segura a descida) e o modelo é o mesmo do Criativo resolvido.
Sobra um caso indistinguível: agente com linha própria apontando para o mesmo
modelo do Criativo, sem padrão de área nem de projeto. Por isso "voltar a
herdar" continua aparecendo em toda origem `agent` — a ação segue disponível
justamente no caso que a cadeia não prova, e nele ela ainda muda o futuro
(sem a linha, o agente passa a acompanhar o Criativo).

**A outra metade dessa escolha: o 404 tem desfecho próprio.** Manter o botão em
toda origem `agent` significa oferecê-lo TAMBÉM onde não há linha para apagar —
e ali `ClearModelBindingUseCase` responde **404**, corretamente ("apaguei o que
não existia" e "apaguei" não são a mesma resposta; colapsá-las esconderia um
`agentSlug` errado). Para quem clicou, porém, esse 404 não é falha: o estado
pedido — o agente herda — **já é verdade**, e chamá-lo de erro seria a tela
contradizendo o que ela sabe. Então ele não passa por `mensagemDaApi` como as
demais recusas, por dois motivos: a frase da api é pt-BR cravada no código e o
idioma default do web é `en`, e este endpoint tem **uma** causa de 404 (papel
insuficiente é 403 no `RolesGuard`, `scope_id` malformado não é 404) — o cliente
SABE o que este 404 significa e pode dizer na língua de quem lê. Qualquer outro
status continua sendo falha de verdade, com a frase da api e tom `danger`. Nos
**dois** desfechos a linha é relida: se a api diz que não havia binding, quem
está velha é a tela.

**E o desfecho próprio é do ENDPOINT, não da tela.** A outra ação da mesma
linha — trocar o modelo pelo `ModelPicker` da coluna MODELO VIGENTE — recusa
por sete caminhos, e **nenhum status identifica um deles sozinho**
(`SetModelBindingUseCase`): 400 para `scope_id` malformado ou `modelId`
reprovado no DTO, 403 para papel abaixo de `developer`, **404 para duas causas
indistinguíveis** ("Modelo não encontrado" e "Projeto não encontrado") e 422
para três ([RN-040](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-040) sem tool calling; [RN-043](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-043) desativado no
workspace ou sumido do provider). Ali o cliente NÃO pode nomear o 404 —
escolher uma das duas frases seria a tela afirmando o que não sabe —, então
toda recusa segue a gramática normal, com a frase da api e tom `danger`. As
duas funções são vizinhas e tratam o mesmo status de formas opostas de
propósito: o que autoriza o desfecho próprio é a causa ÚNICA, não a tela.

**Na recusa, a coluna MODELO VIGENTE continua exibindo o binding confirmado.**
O `ModelPicker` não guarda a escolha em estado local (`selected` sai do prop
`selectedModelId`, que vem da query), então uma recusa não deixa na tela um
modelo que a api se recusou a gravar — e a linha só é relida no sucesso, já que
na recusa nada mudou no banco. É a mesma disciplina desta RN aplicada ao
tempo: a tela não afirma um estado que não existe, nem por traço, nem por enum,
nem por otimismo.

**Vazio tem texto próprio, e vazios diferentes têm textos diferentes.** Os três
`—` da tela diziam três coisas com o mesmo símbolo e agora dizem cada uma a
sua: `sem modelo em nenhum nível` (nenhum nível tem binding para o agente),
`sem gasto ainda` (o agente não registrou consumo — diferente de `US$ 0,00`,
que é ter rodado de graça) e `sem padrão em nenhum nível` (a área e os dois
níveis acima dela estão vazios). Mesma disciplina da
[RN-180](parte-02.md#rn-180): a tela não afirma com um traço o que não
consegue nomear.

- **Onde:** `apps/web/src/routes/settings/cascata.helpers.ts:14` (`montarCadeia` — os
  quatro estados e o nó do Criativo), `:73` (`herdouDoCriativo` — a dedução e
  seu limite), `apps/web/src/routes/settings/cascata.tsx:196` (`CadeiaDeCascata`),
  `apps/web/src/routes/settings/ModelsSection.tsx:154` (`cadeiaDoAgente`),
  `:321` (`handleModelChange` — por que aqui o 404 NÃO tem desfecho próprio, e
  por que a linha só relê no sucesso), `:403` (`handleClearAgentBinding` — os
  três desfechos, e por que o 404 tem o dele), `:359` (coluna Origem), `:429`
  (`não há nível abaixo`), `:448` (`sem gasto ainda`),
  `apps/web/src/components/ModelPicker.tsx:95` (`selected` sai do prop — o
  picker não guarda a escolha, e é por isso que a recusa não deixa valor
  fantasma na tela),
  `apps/api/src/application/use-cases/llm/set-model-binding.use-case.ts:38`
  (as duas causas de 404 deste endpoint — este arquivo NÃO mudou),
  `apps/api/src/interfaces/http/shared/llm-binding-error.filter.ts:39`
  (400/422 das recusas de curadoria — este arquivo NÃO mudou),
  `apps/web/src/routes/settings/ModelsSection.tsx` (a cadeia do agente, que já
  desenha o nó da área),
  `apps/api/src/application/use-cases/llm/clear-model-binding.use-case.ts:25`
  (o 404 que a api levanta — este arquivo NÃO mudou),
  `apps/api/src/domain/llm/binding-resolver.ts:140` (o `origin: 'agent'` que a
  api devolve, e o comentário que explica por que ele está certo — este
  arquivo NÃO mudou)
- **Teste:** `apps/web/src/routes/settings/cascata.test.tsx` (binding próprio
  termina no nó `agente`; herança deixa `agente` vazio e nomeia o Criativo;
  o workspace nunca aparece vigente na herança; a seção de área idem; a
  distinção sobrevive ao `en`; nível descartado vira nó riscado e o badge
  concorrente sumiu; os três vazios com três textos; `montarCadeia` e
  `herdouDoCriativo` como funções puras, incluindo o caso do padrão de área
  DESCARTADO, que não segura a descida),
  `apps/web/src/routes/settings/voltar-a-herdar.test.tsx` (os três desfechos do
  clique: apagou e relê; 404 não é erro, não repassa a frase pt-BR da api nem
  em `en`, e relê porque a tela é que estava velha; outro status vai por
  `mensagemDaApi` e não relê),
  `apps/web/src/routes/settings/troca-de-modelo.test.tsx` (a outra ação da
  mesma linha: grava e relê; 422 do modelo `unavailable` — o alcançável, já
  que o picker mostra o indisponível marcado — vai por `mensagemDaApi` e não
  relê; a coluna MODELO VIGENTE segue no modelo antigo, nunca no recusado; e o
  404 NÃO ganha desfecho próprio, que é o contraste com a função irmã)
- **Origem:** revisão de design do dono do produto (item #9 do canvas de
  melhorias de UI — "cascata de modelo como cadeia visível")

## A seção de Membros respeita o papel, e o papel é o EFETIVO do projeto (RN-471)

<a id="rn-471"></a>

### RN-471 — Papel na seção de Membros: `maintainer`, e derivado da linha do projeto sobre a do workspace {#rn-471}

`MembersSection` não checava papel nenhum. As TRÊS ações da seção — convidar,
trocar o papel de alguém e remover — apareciam ativas para todo mundo, `viewer`
incluído, e a api recusava com 403. Duas delas nem chegavam a dizer isso:
`handleRoleChange` e `handleRemove` não tinham `try/catch` e eram chamadas de um
`onChange`/`onClick`, então toda recusa virava `unhandled promise rejection` —
silêncio na tela e ruído no console, a mesma classe de defeito que a
[RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102) fechou na tabela de modelos. Remover um
membro em silêncio é o pior dos três: é ação consequente e sem volta pela tela,
porque repor exige o UUID que a linha removida levava junto.

**O mínimo é `maintainer`, e é do ENDPOINT.** Os três caminhos pedem o mesmo
(`projects.controller.ts`), e `GET` pede `viewer` — por isso quem não edita
continua vendo a tabela inteira:

| ação | endpoint | papel |
|---|---|---|
| convidar | `POST :projectId/members` | `maintainer` |
| trocar papel | `POST :projectId/members` (upsert) | `maintainer` |
| remover | `DELETE :projectId/members/:userId` | `maintainer` |
| ver a tabela | `GET :projectId/members` | `viewer` |

Copiar o gate da seção de modelos (`developer`, e correto lá) ofereceria aqui os
três controles a quem a api recusa. É a SEGUNDA seção seguida cujo mínimo difere
da vizinha: a régua continua sendo o endpoint, nunca a tela ao lado.

**O papel é o EFETIVO do PROJETO — e isto FECHA a lacuna que a RN-102 declarou,
não a repete.** Lá a tela lê o papel de WORKSPACE enquanto quem autoriza é
`ResolveEffectiveRoleUseCase.forProject`, e fechar isso exigiria uma consulta de
papel por projeto que o web não tem. É a MESMA lacuna aqui, vista do outro lado:
esta seção JÁ faz essa consulta. `listProjectMembers` é `findMemberRole` para
todo mundo de uma vez, e `userIdDaSessao()` (o `sub` do access token) diz qual
linha é a de quem olha. A composição é literalmente a do caso de uso —
`projectRole ?? workspaceRole` —, não uma segunda fonte de papel inventada só
nesta tela. Enquanto a lista não chegou o papel é AUSENTE, não o de workspace:
sem ela não há como saber se existe linha própria, e errar para o lado de
desabilitar se conserta recarregando.

**A sobreposição vale nos DOIS sentidos, e QUATRO lugares diziam o contrário.**
`forProject` devolve a linha de `project_members` quando ela existe, sem comparar
com o workspace. Então definir `viewer` aqui rebaixa mesmo — até um `owner` de
workspace, que depois só é restaurado por quem tenha `maintainer`. O código nunca
fez o contrário, e o próprio `resolve-effective-role.use-case.spec.ts` fixa isso
("papel de projeto sobrepõe o de workspace"). Onde a promessa falsa estava:

| lugar | o que dizia | situação |
|---|---|---|
| descrição de `POST :projectId/members` | "the EFFECTIVE role is the higher of this one and what the person already has in the workspace"; "associating someone as `viewer` here doesn't downgrade a workspace `owner`" | **não corrigida** — é mudança de api |
| descrição de `AddMemberDto.role` | a mesma frase do "higher of" | **não corrigida** — é mudança de api |
| resumo de `GET :projectId/members` | "with their effective role"; "includes whoever inherits access from the workspace" | **não corrigida** — é mudança de api |
| `apps/web/src/lib/roles.ts:3` | "Papel efetivo nunca é rebaixado" | **corrigida aqui** |

As três da api ficam declaradas e não são tocadas de passagem: as descrições
propagam para `api-types.generated.ts`. A do web é PIOR que as outras três e por
isso foi corrigida junto — as da api ao menos moram numa descrição de OpenAPI,
enquanto essa estava no módulo que `roleAtLeast` e `ROLE_ORDER` exportam, ou
seja, no código que a próxima pessoa desta família de correções vai abrir e
editar, lendo a regra errada antes de qualquer outra coisa. A hierarquia linear
declarada na mesma linha continua válida — é a ordem que `roleAtLeast` compara, e
não mudou. A tela, por sua vez, DIZ o que vale, em vez de deixar o `Select` ser
lido como sugestão inofensiva.

**Some o CONTROLE, nunca a INFORMAÇÃO** (ADR 0064). Quem não tem `maintainer`
continua lendo o papel de cada membro no próprio `Select` apagado — é a
informação central da tabela, e trocá-la por texto esconderia o estado junto com
a ação. O motivo é dito UMA vez, em texto, na legenda: `title` em elemento
`disabled` não abre no Chromium, e uma linha por membro repetiria um fato sobre
QUEM OLHA em cima de cada pessoa da lista.

**A tabela é um RECORTE, e declara
([RN-180](parte-02.md#rn-180)).** `listMembers` é um
`innerJoin` em `project_members`: quem alcança o projeto só pelo workspace não
aparece em linha nenhuma, embora o resumo do `GET` prometa "includes whoever
inherits access from the workspace". Esse dado NÃO está ao alcance do cliente —
nenhuma consulta do web lista membros de workspace com papel —, então a legenda
diz que a lista omite, em vez de deixá-la ser lida como "todo mundo que tem
acesso". É a lacuna que sobra, e ela é declarada, não tratada.

**Nada disto é fronteira de segurança:** quem recusa continua sendo o
`RolesGuard`.

**Convidar mantém a dica fixa, e é decisão.** As outras duas ações usam
`mensagemDaApi` porque o `userId` delas veio da lista e existe — o que sobra é
403 e rede, e a frase da api é a informação mais útil que há. No convite o
`userId` é DIGITADO, e o erro alcançável é apontar para um usuário inexistente:
um UUID bem formado passa pelo `@IsUUID()`, estoura a FK
`project_members.user_id → users.id`, nenhum dos filtros globais trata isso e o
Nest responde o 500 padrão. `mensagemDaApi` devolveria "Internal server error",
pior que a dica — o `padrao` dela só vale para erro que não é `ApiError`.
Uniformizar a forma pioraria o conteúdo no caminho mais provável da caixa.

- **Onde:** `apps/api/src/interfaces/http/iam/projects.controller.ts:121`,
  `:135`, `:147` (os três papéis — estas linhas NÃO mudaram),
  `apps/api/src/application/use-cases/iam/resolve-effective-role.use-case.ts:14`
  (`projectRole ?? workspaceRole`, a sobreposição nos dois sentidos),
  `apps/api/src/infrastructure/persistence/drizzle/project.repository.ts:194`
  (`listMembers` — o `innerJoin` que faz a tabela ser recorte),
  `apps/web/src/routes/settings/MembersSection.tsx:62` (o papel efetivo e por
  que `maintainer`), `:109` (por que convidar não usa `mensagemDaApi`), `:142` e
  `:162` (os dois `try/catch` que faltavam),
  `apps/web/src/lib/roles.ts:49` (`roleAtLeast`), `:3` (o comentário de
  `ROLE_ORDER`, que afirmava "papel efetivo nunca é rebaixado" — o quarto lugar
  da tabela acima, e o único corrigido)
- **Teste:** `apps/web/src/routes/settings/papel-na-secao-de-membros.test.tsx`
  (`viewer` e `developer` não editam e o clique não chega na api; `maintainer` e
  `owner` editam e o POST/DELETE chegam; papel ausente é inerte; o papel da
  linha sobrevive ao controle apagado; o PAR que prova a sobreposição nos dois
  sentidos — `viewer` de workspace com linha `maintainer` EDITA, `owner` de
  workspace com linha `viewer` NÃO edita; as duas recusas viram toast com a
  frase da api; a tela não passa a exibir o papel que a api negou; e convidar
  mantendo a dica fixa contra um 500)
- **Origem:** revisão da #443 — a lacuna que ela declarou, vista da seção que
  tem os dados para fechá-la
- **Adendo (aditivo, o texto acima não mudou):** as três descrições de OpenAPI
  que a tabela marca como "não corrigida" FORAM corrigidas depois, pela
  [RN-472](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-472) / [ADR 0127](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0127-tetos-de-rebaixamento-em-project-members.md),
  na mesma mudança que pôs os dois tetos de rebaixamento na api. Não reabra
  essa linha da tabela.

---

## A pasta vem primeiro, e o binário não é bloqueio (RN-473/474)

<a id="rn-473"></a>

### RN-473 — A configuração do runner pelo navegador começa pela PASTA, e a falha do binário nunca descarta o que já foi configurado {#rn-473}

> **Revisada pela [RN-687](parte-05.md#rn-687) ([ADR 0203](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0203-aposenta-o-fluxo-do-runner-pelo-navegador.md), 01/10):**
> o fluxo que esta RN ordena SAIU — `runner-bootstrap.ts` e o teste dele foram
> removidos com o fluxo do navegador. O que sobrevive dela é a régua do passo
> humano dito ANTES, que o painel aplica ao comando do instalador.

O fluxo da [RN-464](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-464)..[466](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-466) rodava na ordem `chave → registro
→ binário → pasta` (`configurarPastaAutomaticamente`,
`apps/web/src/lib/runner-bootstrap.ts`). Os quatro passos não têm o mesmo risco:
o download do binário é o ÚNICO que depende de uma release publicada no GitHub
(`RunnerReleasesController`, proxy de `releases/latest`), e com a release
corrente sem asset para plataforma nenhuma ele devolve **502**. A exceção subia
antes de `showDirectoryPicker`, então **o seletor de pastas nunca chegava a
abrir** — o botão parecia inerte e a pasta ficava inalcançável, com a
configuração inteira perdida por causa do passo mais frágil.

A ordem passa a ser `pasta → config → chave → registro → chave privada →
binário`, e o último passo é **best-effort**:

| passo | falha derruba o fluxo? | por quê |
|---|---|---|
| 1. `showDirectoryPicker` | **sim** | sem pasta não há onde gravar nada. Cancelar (`AbortError`/`NotAllowedError`) NÃO é falha — volta ao estado inicial, sem alerta |
| 2. `brabo-runner.config.json` | **sim** | é metade do par que a [RN-466](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-466) lê |
| 3. par Ed25519 + `registerRunnerDeviceKey` + `…device-key.jwk.json` | **sim** | privada em disco sem contraparte no servidor não autentica; por isso o registro vem ANTES da gravação, e as duas são adjacentes |
| 4. binário | **não** | devolve `falhaDoBinario` preenchido; a pessoa fica sem o agente local e a instrução final diz isso e aponta a issue em `https://github.com/viralabs-dev/brabo-runner/issues` (o runner sai só como binário, AT-774) |

O caminho alternativo funciona **sem flag nenhuma** exatamente porque os passos
2 e 3 já rodaram: o CLI lê os dois arquivos do `cwd` (RN-466). É um dos TRÊS
caminhos de distribuição que o `CLAUDE.md` declara, e o único que não depende
nem da release nem de um checkout do monorepo. O `baixarKitManual` (fora do
Chromium) segue a mesma régua invertendo a ordem dos dois downloads: o **kit**
sai primeiro, o binário por último.

**O passo do terminal é humano, e a tela nunca finge o contrário.** Uma página
web não executa binário na máquina de ninguém, e a File System Access API não
preserva o bit de execução — daí o `chmod +x` continuar no comando. O que o
produto faz é encolher esse passo a UMA linha copiável em um clique; nenhum
texto de UI diz "instalação automática".

**E ele é anunciado ANTES do clique, não só depois.** A frase que explica o
passo existia desde o início, mas era renderizada apenas no estado de SUCESSO —
depois de a pessoa escolher a pasta, esperar o registro da chave e o download
do binário. Quem clica num botão chamado "Configurar pasta automaticamente" e
só então descobre que ainda precisa abrir um terminal foi surpreendido, mesmo
sem nenhuma frase ter mentido: anunciar no fim é o mais tarde possível para
ainda não ser fingimento. Agora há um aviso no estado inicial, ao lado do
botão, e o do fim CONTINUA — as duas dizem coisas diferentes (uma avisa que o
passo virá, a outra explica por que ele existe). O rótulo do botão **não**
mudou: ele fala da PASTA, que é de fato configurada automaticamente, e trocá-lo
descreveria pior o que ele faz.

**O comando final diz em que pasta rodar, quando dá para afirmar qual é.** A
instrução dizia "dentro da pasta escolhida, rode: …" sem nunca dizer onde essa
pasta fica — a File System Access API expõe só o basename (`dirHandle.name`),
nunca o caminho absoluto. O caminho existe do outro lado: é o
`projects.workspace_path` que a pessoa digitou ao criar o projeto. Quando o
basename dele bate com a pasta escolhida, a instrução ganha um prefixo
`cd <caminho> && `; quando NÃO bate, sai sem prefixo — nada obriga a pessoa a
escolher no seletor a mesma pasta que digitou, e um `cd` para o lugar errado
seria a tela afirmando o que não sabe. O basename é o máximo que se prova
daqui, e o caso raro em que ele coincide para pastas diferentes falha ALTO
(`cd` não acha o caminho, ou `./brabo-runner` não está lá), nunca em silêncio —
que é a régua que decide se uma heurística pode entrar. O kit manual (fallback
fora do Chromium) **não** recebe o prefixo, e não é esquecimento: lá os
arquivos caem na pasta de downloads, e `cd` mandaria para onde eles ainda não
estão.

**Lacuna declarada:** fechar a aba entre o passo 3 e o fim deixa uma chave de
dispositivo **órfã** no projeto. Ela é inerte — a privada correspondente só
existiu na memória daquela aba, e sem ela a chave não autentica nada — mas hoje
é invisível: `RunnerDeviceKeysController` tem `POST` e `DELETE`, e nenhuma rota
de LISTAGEM, então não há tela onde revogá-la. Refazer o fluxo registra uma
chave nova, que funciona. Uma listagem é trabalho direto sobre o `DELETE` que já
existe, quando for pedido.

- **Onde:** `apps/web/src/lib/runner-bootstrap.ts`
  (`configurarPastaAutomaticamente`, `baixarKitManual`, `COMANDO_VIA_NPM`),
  `apps/web/src/components/RunnerOnboardingPanel.tsx`
  (`ehCancelamentoDoSeletor`, o bloco de desfecho)
- **Teste:** `apps/web/src/lib/runner-bootstrap.test.ts` (a ordem dos quatro
  passos afirmada como lista; binário 502 e falha de GRAVAÇÃO do binário
  gravando os outros dois arquivos e devolvendo o comando alternativo;
  cancelamento do seletor sem registrar chave nem baixar nada; o kit saindo
  mesmo com o binário em 502),
  `apps/web/src/components/RunnerOnboardingPanel.test.tsx` (a pasta é anunciada
  com o motivo da falha ao lado; cancelar não vira alerta)
- **ADR:** [0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)
  — esta RN revisa a ORDEM do fluxo que ele estabeleceu, não o mecanismo
- **Origem:** pedido do dono do produto

<a id="rn-474"></a>

### RN-474 — Depois da instrução, a tela ESPERA o runner: três estados, teto, e o caminho que vale é o que o runner reportou {#rn-474}

Configurar a pasta e mostrar o comando deixava a pessoa sem saber se tinha dado
certo. O quarto passo é uma espera que resolve sozinha
(`apps/web/src/components/EsperaDoRunner.tsx`), montada pelo
`RunnerOnboardingPanel` assim que a configuração termina — nos dois caminhos
(pasta gravada e kit baixado).

**O mecanismo é o que já existia.** O sinal é `project.workspaceVerifiedAt`, o
carimbo que `ConfirmProjectWorkspaceUseCase` grava quando o runner conecta
([RN-423](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-423)) e que o engine usa como PORTÃO (`terminal_executor.ex`
recusa executar em projeto `runner` com `workspace_verified_at` nulo) — a
definição do próprio produto de "este projeto tem runner". É o mesmo dado que
`AmbienteDoProjeto` já lê ([RN-468](#rn-468)), na mesma chave de cache
`['project', id]` que a página inteira mantém. A alternativa considerada foi
sondar `connectFsBrowserChannel` (cujo erro `'Nenhum runner conectado'` o
`FolderBrowserModal` detecta): ela sabe do AGORA, que é mais forte, mas o canal
grava `erroDeConexao` de forma permanente por instância, então cada sondagem
custaria ticket + socket NOVOS — dezenas ao longo da espera — e ela ainda não
responderia a segunda metade do que a tela deve dizer: QUAL caminho o runner
reportou.

**Confirmado é o carimbo MUDAR, nunca "existir".** A espera tira uma linha de
base no primeiro `GET` e compara contra ela. Sem isso, um projeto já confirmado
antes seria anunciado como recém-conectado no instante em que a tela abrisse.

**Os três estados não colapsam, e nenhum é eterno** ([RN-088](parte-01.md#rn-088),
[RN-468](#rn-468)):

| estado | o que a tela diz |
|---|---|
| `esperando` | "procurando o runner", com o teto DECLARADO ("paramos depois de 3 minutos") |
| `confirmado` | a data do carimbo E o `workspacePath` que o runner reportou, dizendo que ele substitui o que foi digitado — a tela não compete com quem roda no host de verdade |
| `semResposta` | o teto estourou, e a tela declara o que NÃO sabe: reconectar com uma pasta já confirmada não regrava o carimbo, então ausência aqui não é prova de ausência, e quem sabe do agora é a aba Código. Um botão recomeça a busca sem refazer a configuração |

- **Onde:** `apps/web/src/components/EsperaDoRunner.tsx` (`INTERVALO_MS`,
  `TETO_MS`, a linha de base em `base`),
  `apps/web/src/components/RunnerOnboardingPanel.tsx` (quem a monta)
- **Teste:** `apps/web/src/components/EsperaDoRunner.test.tsx` (os três
  estados, um a um, cada um afirmando que os outros dois NÃO estão na tela; o
  carimbo preexistente que não conta como conexão nova; o teto estourando com
  temporizador falso e o botão que recomeça)
- **ADR:** [0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)
- **Origem:** pedido do dono do produto

## O `kid` é o vínculo, e a recusa tem nome (RN-475)

<a id="rn-475"></a>

### RN-475 — A JWK privada gravada pelo navegador carrega o `kid` do registro; e o CLI distingue "não há chave" de "há chave e ela não serve" {#rn-475}

> **Revisada pela [RN-687](parte-05.md#rn-687) ([ADR 0203](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0203-aposenta-o-fluxo-do-runner-pelo-navegador.md), 01/10):**
> a metade do NAVEGADOR saiu com o fluxo (e o e2e que a provava num Chromium);
> o `kid` carimbado continua valendo para a chave criada no terminal
> (`device-key finish --id`, RN-551), e a metade do CLI — ausente × recusada —
> continua inteira.

O modo automático do [ADR 0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)
([RN-464](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-464)..[466](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-466)) **nunca autenticou nenhuma vez** desde que
nasceu. As duas metades desta RN são o defeito e o que o escondeu.

**O `kid` não é decoração — é o único vínculo entre os dois lados.** O `id` que
`POST projects/:projectId/runner-device-keys` devolve identifica o registro
`runner_device_keys` que guarda a chave PÚBLICA. Ele precisa chegar ao disco
DENTRO da JWK privada, no campo `kid` (RFC 7517), porque é assim que a cadeia
inteira o carrega: `lerChaveDeDispositivo` só REPASSA `jwk.kid` (nunca inventa
nem deriva um id),
`assinarTicketComChaveDeDispositivo` o põe no header protegido do JWT de
ticket, e o `PatAuthGuard` usa exatamente esse `kid` para achar a pública e
verificar a assinatura ([RN-465](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-465)).

O navegador **descartava o retorno** de `registerRunnerDeviceKey` nos DOIS
caminhos (`configurarPastaAutomaticamente` e `baixarKitManual`), e
`crypto.subtle.exportKey` exporta a JWK CRUA, sem `kid` nenhum. O produtor
gravava um arquivo que o consumidor recusa **sempre** — e o defeito era
invisível dos dois lados: cada função estava certa sozinha. A prova está no
banco: as chaves registradas pelo fluxo tinham `last_used_at` nulo, todas.

A correção é estrutural, não uma linha: o passo 3 da [RN-473](#rn-473) (exportar
a pública, registrar, exportar a privada) vira UMA função
(`registrarChaveEExportarPrivada`), com o `id` fluindo dentro dela. Descartá-lo
de novo passa a exigir apagar código, não esquecer uma atribuição. O `kid` vai
só na PRIVADA: a pública não o leva, porque é o registro dela que o produz.

**A recusa tem nome.** `lerChaveDeDispositivo` devolve `null` sem lançar — de
propósito, e isso não muda: a ausência dos arquivos é o caminho NORMAL de quem
roda com `--project`/`--dir`/`--token`. Mas `null` respondia a duas perguntas
diferentes, e o CLI imprimia o MESMO bloco de `uso()` — que fala de flags e não
menciona o arquivo — tanto para "você não configurou nada" quanto para "sua
pasta está configurada e a chave não serve". Uma pessoa com
`brabo-runner.config.json` perfeito era mandada investigar justamente o lado
que estava certo.

| estado | quem responde | saída do CLI |
|---|---|---|
| `ausente` | caminho normal | o bloco de `uso()`, inalterado |
| `json-invalido` | recusa | `explicacaoDaChaveRecusada` — nomeia o arquivo, o motivo, e as duas saídas (regravar a pasta pelo navegador, ou `--token` enquanto isso) |
| `sem-kid` | recusa | idem, nomeando o campo que falta e para que ele serve |
| `valida` | segue o fluxo | — |

`estadoDaChaveDeDispositivo` e `explicacaoDaChaveRecusada` vivem em
`device-key.ts` porque falam do ARQUIVO; o que FAZER com a recusa (sair, com
qual código, com ou sem o bloco de uso) continua sendo do `index.ts`, como o
docblock do módulo já dizia. O tipo de `explicacaoDaChaveRecusada` exclui
`ausente` e `valida`: não existe explicação para o caso normal nem para o
sucesso, e um texto vago cobrindo os quatro estados seria o mesmo defeito de
novo.

**O que deixou passar:** o teste do web afirmava que o arquivo tinha sido
ABERTO (`getFileHandle` chamado com o nome certo), nunca o que havia DENTRO
dele. Um teste que prova a criação de um arquivo sem provar seu conteúdo deixa
gravar qualquer coisa. O dublê passou a amarrar nome → conteúdo, e as duas
asserções antigas ganharam a metade que faltava.

- **Onde:** `apps/web/src/lib/runner-bootstrap.ts`
  (`registrarChaveEExportarPrivada`, `exportarJwkPrivada`),
  `apps/runner/src/device-key.ts` (`estadoDaChaveDeDispositivo`,
  `explicacaoDaChaveRecusada`, `EstadoDaChaveLocal`),
  `apps/runner/src/index.ts` (o ramo de credencial em `lerArgumentos`)
- **Teste:** `apps/web/src/lib/runner-bootstrap.test.ts` (o `kid` gravado É o
  `id` devolvido, provado com um id diferente do padrão; os dois caminhos —
  pasta e kit manual; a pública SEM `kid`; a chave útil sobrevivendo ao binário
  em 502), `apps/runner/src/device-key.spec.ts` (os quatro estados, um a um;
  ausente ≠ sem-kid enquanto `lerChaveDeDispositivo` colapsa os dois em `null`;
  as duas frases de recusa diferentes entre si),
  `apps/runner/src/index.spec.ts` (o CLI DE VERDADE, em processo separado: a
  pasta sem chave cai no bloco de uso, a pasta com chave sem `kid` cai na
  recusa nomeada, e as duas saídas não são iguais — o defeito era elas serem)
- **ADR:** [0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)
  — esta RN não revisa o mecanismo dele, fecha o contrato que ele deixou
  implícito entre as duas pontas
- **Origem:** uso real do fluxo contra o ambiente local pelo dono do produto

## Estado de ambiente na tela (RN-468)

<a id="rn-476"></a>

### RN-476 — Aplicar um modelo a TODOS os agentes: um valor, N chamadas, e um botão apesar do valor ser nomeado {#rn-476}

A tabela `Modelos por agente` tem uma linha por agente e um seletor em cada
uma. Escolher o mesmo modelo para os 17 era percorrer as 17 linhas, e o custo
disso não é o tempo: é que ninguém confere 17 dropdowns e a tela não tem como
dizer se sobrou um para trás. A seção ganha uma barra ACIMA da tabela — um
seletor e um botão — que aplica UM modelo a todos os agentes de uma vez.

**A ação grava no nível do AGENTE, nas 17 linhas — não no projeto.** As duas
leituras de "um modelo para todos" existem e produzem estados diferentes:
gravar no projeto e apagar os bindings de agente e de área faria os 17
HERDAREM, e é o idioma da própria cascata. Não foi o escolhido, por dois preços
concretos: `PUT projects/:id/model-binding` e os endpoints de área exigem
`maintainer`, enquanto o binding de agente exige `developer` — a mesma pessoa
que pode trocar linha a linha passaria a não poder fazê-lo de uma vez —, e o
binding de projeto é também o default da SESSÃO, que a
[RN-040](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-040) deixa livre de propósito. A escolha
tem preço declarado: as 17 linhas passam a divergir, com origem `agent` na
coluna Origem, e voltar a herdar continua sendo linha a linha.

**Há botão, apesar de o valor ser NOMEADO.** A régua da
[RN-469](#rn-469) diz que escolha de valor nomeado salva no `onChange`, e ela
continua valendo para o seletor de CADA LINHA, que grava o próprio valor. O
seletor da barra não é configuração de nada: ele é o argumento da ação ao lado.
Aplicar no `onChange` faria um clique exploratório num dropdown reescrever 17
linhas que a pessoa não estava editando, e desfazer isso são 17 cliques. O
botão NOMEIA quantas linhas vai alcançar, porque esse número é a consequência.

**O desfecho segue a RN-469 inteira, e é a razão de a barra não inventar
nada.** Uma chamada por agente, em SÉRIE, na ordem da tela, sem abortar na
primeira recusa — abortar deixaria 16 linhas sem tentativa e a tela não
distinguiria "recusou" de "nem tentou". Os três desfechos não se disfarçam:
todas passaram → sucesso nomeando o modelo; **nenhuma** passou → a mensagem da
api, nunca uma contagem; **algumas** passaram → aviso com quantas de quantas,
nomeando as que ficaram pelo NOME do agente, que é o que a pessoa lê na
primeira coluna. Só as linhas que a api CONFIRMOU são relidas: invalidar as 17
apagaria da tela a diferença que o relatório parcial acabou de contar.

**O gate é o do ENDPOINT, e o endpoint é o mesmo dos controles de linha.**
`developer`, por `PUT projects/:projectId/agent-bindings/:agentSlug` — não o
`maintainer` da seção vizinha de área ([RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)).
O botão fica inerte para quem não alcança, e o motivo é dito UMA vez, em TEXTO,
na legenda da seção, junto com as outras duas ações que ficam inertes: `title`
em elemento `disabled` não abre no Chromium (ADR 0064). O filtro "aptos para
agentes" do seletor abre MARCADO, como no picker de linha e pelo mesmo motivo
([RN-040](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-040)) — com mais força aqui, porque um
modelo chat-only escolhido na barra não produziria um 422, e sim 17, e o
relatório parcial contaria a mesma recusa dezessete vezes.

- **Onde:** `apps/web/src/routes/settings/aplicar-a-todos.tsx:66`
  (`useAplicacaoEmLote` — o laço em série e os três desfechos),
  `apps/web/src/routes/settings/ModelsSection.tsx` (a barra, o estado local do
  modelo escolhido e a invalidação só das linhas confirmadas)
- **Teste:** `apps/web/src/routes/settings/aplicar-a-todos.test.tsx` (grava o
  mesmo modelo em todos os agentes, na ordem da tela; nenhuma passando mostra a
  mensagem da api e NÃO a contagem, e ainda assim tenta todas; falha parcial diz
  quantas de quantas e nomeia a que ficou; papel abaixo de `developer` deixa o
  botão inerte e o motivo continua em texto)
- **Origem:** pedido do dono do produto ao configurar um ambiente zerado com um
  provider só — todos os agentes precisavam do mesmo modelo

---
