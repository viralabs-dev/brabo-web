---
id: rn-web-parte-01
title: 'Regras de negócio — Web — parte 1 (desde RN-039)'
sidebar_label: 'Web — parte 1 (desde RN-039)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 1 (desde RN-039)

## Painel de projetos

As RNs de orçamento, metering e teto de custo moram em
**[Regras de negócio — Custo](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/custo.md)**.

Mesmo motivo da seção de Autenticação abaixo: tamanho, não assunto.
Âncoras `#rn-NNN` inalteradas.

## Cost

<a id="rn-039"></a>

### RN-039 — Dot de status do projeto: risco sempre vence inatividade {#rn-039}

A sidebar do dashboard mostra um dot de saúde por projeto, derivado de três
sinais independentes: orçamento (mesmos limiares 70%/90% do RN-018), task
bloqueada (`tasks.blocked`) e atividade recente (7 dias). Cores: verde =
saudável e ativo; âmbar = orçamento ≥70%; vermelho = orçamento ≥90% **ou**
task bloqueada; cinza = sem atividade nos últimos 7 dias. Quando um sinal
de risco (âmbar/vermelho) e o de inatividade (cinza) se aplicam ao mesmo
tempo, o de risco vence — um projeto estourado e parado ainda é algo a
olhar, não algo a esconder atrás de "sem atividade".

- **Onde:** `apps/web/src/lib/project-status.ts` (`deriveProjectStatus`)
- **Teste:** `apps/web/src/lib/project-status.test.ts`
- **Origem:** fidelidade do dashboard de projetos ao design aprovado

<a id="rn-064"></a>

### RN-064 — Heartbeat não encerra sessão com trabalho pendente {#rn-064}

> **Estendida pela [RN-581](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-581) (AT-072):** um agente
> conversacional esperando o usuário passou a ser o QUINTO sinal, e o único com
> teto (8h, causa `conversation_idle_timeout`); a resposta ganhou
> `aguardandoUsuarioDesde`. O resto desta regra vale como está.

O timeout de heartbeat mede inatividade da **aba**, não do **trabalho**. Antes
de encerrar, o `SessionServer` pergunta à api se sobrou trabalho
(`GET /internal/sessions/:id/pending-work`); havendo, reagenda o timeout e
registra o motivo no log em vez de matar a sessão.

O default são **30 segundos**. Sair da sessão para a aba de Backlog já bastava
para matá-la — e numa execução real isso prendeu um handoff `offered` para o
Arquiteto dentro de uma sessão fechada: épico e quatro histórias prontos, e a
cadeia sem como seguir, porque não existe onde aceitar handoff de sessão morta.

Fechar sessão é sobre o trabalho ter acabado, não sobre quem está olhando.

**A api fora do ar NÃO impede o encerramento**: `{:error, _}` encerra assim
mesmo, com aviso no log. Trocar sessão órfã por sessão imortal seria trocar um
defeito por outro.

"Trabalho pendente" são **três** sinais — o segundo entrou pelo achado V, o
terceiro pelo bug real do Criativo→PO→Arquiteto:

1. **handoff `offered`** — o caso original acima;
2. **`proposed_action` com status `pending`** — alguém está esperando a SUA
   decisão, e um agente pode estar suspenso esperando o desfecho
   ([RN-073](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-073));
3. **agente ATIVADO ainda em turno** — o último `agent.status` de cada ator
   que já falou na sessão é `working` sem um `idle` posterior.

O segundo é o mesmo defeito do primeiro um nível abaixo, e a execução do
`hello-limpo` mostrou o custo: a sessão nasceu 23:34:12, uma ação ficou
`pending` às 23:34:13, e o heartbeat a fechou às **23:34:42 — exatamente os 30s
do timeout**. O dev agent seguiu trabalhando por mais de uma hora numa sessão
que o banco dava por encerrada, e isso envenena toda métrica por sessão:
duração, custo e "quantas terminaram bem" passam a ler um estado que não
descreve o que houve.

O terceiro é a mesma janela, um passo antes de qualquer um dos dois primeiros
existir: `AcceptHandoffUseCase` marca o handoff antigo como `accepted` e ativa
o próximo agente na hora, mas a ativação no engine é `GenServer.cast`
fire-and-forget — responde 201 antes de o agente sequer começar. O PO ativado
pelo handoff do Criativo roda um kickoff de até 12 iterações de LLM usando só
ferramentas `category: :direct` (`create_epic`/`create_story`/`create_task`),
que nunca geram `proposed_action`, e só oferece o handoff seguinte (o sinal 1)
no FIM do turno inteiro. Entre a ativação e esse fim, nem o sinal 1 nem o sinal
2 existiam — só o ping do canal Phoenix a cada 10s segurava a sessão, e
qualquer atraso maior que os 30s do timeout fechava a sessão com o PO ainda
gerando o backlog, quebrando a cadeia de handoff pela raiz: o handoff seguinte
acabava sendo oferecido numa sessão já `closed`, que não aceita mais nada.

`agent.status` (`working`/`idle`) é o que todo agente conversacional
(Criativo/PO/Arquiteto/Dev Lead/Infra) já narra nos limites de turno, e é
PERSISTIDO no event log, não só broadcastado no canal
(`Engine.Sessions.LiveBroadcast.agent_status/4`, [ADR 0021](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0021-fechamento-4a-infra-e-painel.md))
— o mesmo sinal que o painel do time já lê para derivar o roster
(`conversationalStatus` em `apps/web/src/lib/agent-status.ts`). Reaproveitá-lo
aqui não exigiu evento novo nenhum: o terceiro sinal é o último `agent.status`
de CADA ator que já falou na sessão, e é genérico por tipo de evento — cobre
qualquer agente ativado por handoff, não só o PO.

A versão anterior desta regra dizia, por escrito, que incluir trabalho de agente
"sem um teste que prove a interação seria adivinhar". A execução produziu a
prova, e o teste agora existe.

**O que continua fora:** task `in_progress` sem ação pendente nem handoff nem
turno em aberto. O dev agent tem máquina de estados própria e retém o worktree
por conta dele; o sinal que a api possui e que a execução comprovou é a ação
pendente. Incluir a task exigiria a api ler `dev_agent_states`, que é do
engine — decisão de fronteira, não conserto de passagem. Os dev agents também
não emitem `agent.status` (rodam com máquina de estados própria, não com o
loop conversacional de turno) — o terceiro sinal não os cobre, e não precisa:
a ação pendente já cobre o caminho deles.

- **Onde:** `apps/api/src/application/use-cases/sessions/get-session-pending-work.use-case.ts`,
  `apps/api/src/application/ports/session-event-repository.port.ts`
  (`listByTypeInSession`), `apps/engine/lib/engine/sessions/session_server.ex`
  (`handle_info(:heartbeat_timeout, …)`)
- **Teste:** `apps/engine/test/engine/sessions/session_lifecycle_test.exs`
  (`heartbeat NÃO encerra sessão com trabalho pendente` e o caso oposto) e
  `apps/api/test/application/use-cases/sessions/get-session-pending-work.use-case.spec.ts`
  (os três sinais, a ação já decidida que NÃO segura, o `idle` que libera, o
  isolamento por ator, a genericidade por tipo de agente e o escopo por
  sessão)
- **Origem:** execução real da FASE 13b; achado V, Fase H do
  [backlog](https://github.com/viralabs-dev/brabo/blob/dev/docs/explanation/backlog.md); bug real do encadeamento
  Criativo→PO→Arquiteto

<a id="rn-088"></a>

### RN-088 — Falha de carregamento é dita na tela; 429 não se retenta {#rn-088}

Toda tela que carrega dado da api distingue três estados, e nunca dois:
**carregando** (esqueleto), **erro** (a mensagem que a api mandou, com o
`trace_id` e um botão de tentar de novo) e **vazio** (o texto de lista vazia).
`if (!dado) return null` colapsa os três, e o desfecho observado foi o pior
possível: com a api limitando por `429`, a área principal de `/projects/:id`
ficava **completamente em branco** — sem mensagem, sem erro, sem esqueleto — e
o motivo existia só no console. No dashboard era pior que branco: `!projects`
também era verdadeiro no erro, então a tela convidava a criar o **primeiro**
projeto de um workspace que podia ter vinte.

É a [RN-059](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-059) do outro lado do fio: falha nunca vira resposta vazia.
Quem falha, diz.

A frase é a **da api**, extraída por `mensagemDaApi` — a mesma função que o
caminho de mutação já usava nos toasts. Um texto genérico nosso não sabe a
diferença entre "limite de requisições excedido, tente em instantes" (espere) e
"acesso negado" (não adianta esperar).

O outro lado da mesma regra é não responder ao limite com mais tráfego. **4xx
não se retenta**: `429` é literalmente o servidor mandando parar, e `401` já
foi renovado uma vez dentro de `request()`. E **poll para quando a query erra**
— volta no foco da janela, na remontagem ou no botão. Antes eram três
retentativas por falha somadas a ~25 polls de 3 a 5 segundos que não sabiam
parar: uma sessão real acumulou **1128 erros 429** contra um limite de 300
requisições por minuto por usuário (`RateLimitGuard`), e o laço impedia a
janela deslizante de se refazer. 5xx e falha de rede continuam com as três
tentativas, onde repetir é a reação certa.

- **Onde:** `apps/web/src/lib/query-policy.ts` (`deveRetentar`,
  `pollQueParaNoErro`), `apps/web/src/components/ErroDeCarregamento.tsx`,
  `apps/web/src/routes/ProjectPage.tsx`, `apps/web/src/routes/Dashboard.tsx`,
  `apps/web/src/routes/Shell.tsx`, `apps/web/src/main.tsx`
- **Teste:** `apps/web/src/lib/query-policy.test.ts`;
  `apps/web/src/routes/ProjectPage.test.tsx` (429 vira mensagem com a frase da
  api; 403 mostra o motivo do 403; carregando não é erro);
  `apps/web/src/routes/Dashboard.test.tsx` (erro na lista não vira "nenhum
  projeto ainda"); `apps/web/src/routes/Shell.test.tsx` (a sidebar diz em vez
  de ficar vazia)
- **Origem:** navegação real em `/projects/:id` com 1128 erros 429 no console

<a id="rn-089"></a>

### RN-089 — Projeto de nome repetido se desempata na barra lateral {#rn-089}

Nome de projeto **não é único** — nada no domínio impede. Quando dois ou mais
projetos da lista têm o mesmo nome, cada um deles mostra na sidebar o id
abreviado e a data de criação (`#a1b2c3d4 · 07/08 14:32`), os dois já presentes
no payload do projeto. Quem tem nome único não mostra nada: a legenda em toda
linha seria ruído no lugar com menos espaço da tela.

Origem concreta: uma execução de validação criou vinte projetos chamados
`validacao-real`, e as vinte linhas da sidebar eram visualmente idênticas.

- **Onde:** `apps/web/src/lib/project-label.ts` (`nomesRepetidos`,
  `desempateDoProjeto`), `apps/web/src/routes/Shell.tsx`
- **Teste:** `apps/web/src/routes/Shell.test.tsx` (nome repetido ganha
  desempate, nome único não)
- **Origem:** navegação real com a sidebar cheia de projetos de validação

## Session

<a id="rn-098"></a>

### RN-098 — O nome da sessão soma à hashtag, nunca a substitui {#rn-098}

A sessão pode receber um nome amigável (`sessions.name`, opcional), na
criação ou depois, por `PATCH /projects/:projectId/sessions/:sessionId`. O
rótulo mostrado na tela é **composto**: `<nome> · #<8 primeiros caracteres do
id>`. Sem nome, ele degrada para a **hashtag sozinha**.

A hashtag nunca some, e o motivo é operacional: é ela que se cola numa URL,
num comando ou numa conversa, e um nome escolhido por uma pessoa **não é
único** — duas sessões chamadas "Checkout" são normais. Nome em branco (ou só
espaços) conta como **ausência**, tanto na criação quanto ao renomear:
gravar `''` transformaria o rótulo em `" · #a1b2c3d4"`, pior que a hashtag
sozinha. `null` no corpo do `PATCH` é o jeito de **desfazer**.

Renomear **não** é evento de sessão. O log de eventos é o que a sessão
viveu, e o nome é um rótulo de navegação, trocado quantas vezes se
quiser — N eventos de renomeação empurrariam justamente o que importa para
fora da cauda de 200 eventos.

- **Onde:** `apps/web/src/lib/session-label.ts:61` (`rotuloDaSessao`),
  `apps/api/src/application/ports/session-repository.port.ts:52` (`rename`).
  Alcançável tanto de dentro da sessão
  (`apps/web/src/routes/SessionPage.tsx:439`, `handleRename`) quanto da
  lista do projeto, sem precisar abrir a sessão antes
  (`apps/web/src/routes/ProjectSessionsTab.tsx:101`, `handleRenomear`) — as
  duas telas chamam o mesmo `renameSession` e o mesmo `rotuloDaSessao`.
- **Teste:** `apps/web/src/lib/session-label.test.ts`,
  `apps/api/test/application/use-cases/sessions/session-kind-e-nome.spec.ts`,
  `apps/web/src/routes/ProjectSessionsTab.test.tsx`
- **Origem:** [ADR 0061](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0061-tipo-da-sessao-na-criacao.md)

## Painel de projetos

<a id="rn-099"></a>

### RN-099 — Atividades pagina o passado sem repolar o que não muda {#rn-099}

A coluna de **Atividade** da Visão geral mostra uma **janela** de 100 eventos
ancorada na **cauda** da sessão, e desce no passado de página em página. Cada
página usa o `afterSeq`/`nextCursor` que
`GET /projects/:p/sessions/:s/events` **já** devolve: nenhuma rota nova,
nenhum parâmetro novo.

**Duas perguntas, duas queries.** `useSessionEvents` responde "como está
agora" — os últimos 200 em poll — e alimenta o painel do time, a linha do
tempo em árvore, a seção de execução e a aba de Aprovações. Nenhuma delas
pagina. A de Atividades responde "o que aconteceu", e era a única que fazia
essa pergunta com a resposta da outra: 200 itens de uma vez, sem começo nem
fim, e ainda assim sem alcançar o início de uma sessão longa.

**A âncora é a cauda, não o começo da sessão.** O endpoint pagina para
FRENTE, e não existe `beforeSeq` — inventar um seria contrato novo. Mas abrir
o feed no evento nº 1 de uma sessão de milhares entrega a tela errada: quem
abre Atividades quer o que acabou de acontecer. Então a primeira página é a
mesma leitura `latest` que a tela já faz, com a **mesma `queryKey`** (o React
Query serve as duas com UMA busca), e cada clique desce uma janela fixa com
`afterSeq`.

**O que a paginação não pode custar.** Uma requisição por ciclo de poll — a
mesma de antes, e a economia da [RN-090](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-090)/[RN-091](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-091) não
regride. Três peças garantem isso:

- a cauda é a query que a tela já tinha, compartilhada por `queryKey`;
- o primeiro clique **não** vira requisição: a leitura `latest` traz 200 e a
  janela mostra 100, então revelar o que já se pagou vem antes de pedir de
  novo;
- página antiga é uma janela **fechada** de `seq` sobre eventos **imutáveis**
  (nunca há UPDATE em tabela de evento): `staleTime: Infinity` e
  **nenhum** `refetchInterval`. Um poll ali seria pagar N requisições para
  receber N respostas idênticas.

**A contagem é honesta sobre o que ela sabe.** Os filtros por agente e por
tipo rodam sobre a **página carregada**, não sobre a sessão — então a UI diz
`N de M carregados`, e não "N resultados". Levar o filtro ao servidor daria o
total verdadeiro e mexeria no repositório de eventos; não é desta fase, e
dizer o total errado seria pior que dizer menos.

Os três estados da [RN-088](#rn-088) valem aqui: **erro antes de vazio** — a
coluna dizia "nenhuma atividade" quando a api tinha recusado.

- **Onde:** `apps/web/src/lib/hooks.ts` (`useSessionEventHistory`,
  `EVENTOS_POR_PAGINA`), `apps/web/src/components/ActivityFeed.tsx`,
  `apps/web/src/routes/ProjectOverviewTab.tsx`,
  `apps/api/src/infrastructure/persistence/drizzle/session-event.repository.ts`
  (`listPaginated`, já existente)
- **Teste:** `apps/web/src/lib/session-history.test.tsx` (abre na cauda; o
  primeiro clique não custa requisição; o seguinte pagina com `afterSeq`
  contíguo; o laço termina no começo da sessão; montado junto com o estado
  atual a cauda é UMA busca; página antiga não repolla);
  `apps/web/src/components/ActivityFeed.test.tsx` (o "N de M carregados"
  acompanha o filtro; sem as props de paginação nada muda)
- **Origem:** pedido do usuário na primeira navegação real — "Atividades na
  aba Visão Geral deve ser paginada, para não ficar infinita"

## Session

<a id="rn-104"></a>

### RN-104 — A aba deriva do tipo gravado, e cria nesse tipo {#rn-104}

O projeto tem **duas** abas de sessão — **Criativo** e **Chat** — e cada
uma é um `kind`: lista as sessões cujo `sessions.kind` é o seu, e o
CTA dela cria nesse `kind`, **sem perguntar de novo**. Não há terceira
aba listando as duas juntas.

O tipo já era imutável ([RN-097](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-097)), e é isso que o torna
uma coordenada de navegação legítima em vez de um filtro salvo: uma sessão nunca
troca de aba. A aba lê o campo **gravado** — não deriva o
tipo de evento nenhum, pelo mesmo motivo da RN-097: `execution.activated`
classifica ESTADO de execução, e uma aba que olhasse para ele mudaria
sozinha.

Duas consequências que a regra fixa, e que não são detalhe de tela:

- **A escolha do tipo sai do formulário.** Ela morava num `fieldset` de
  radio buttons, e agora acontece no momento em que a pessoa clica na aba.
  Manter os dois ofereceria a chance de criar uma sessão que contradiz
  o lugar onde se está. O que sobra no formulário é o **nome**,
  que segue opcional ([RN-098](#rn-098)).
- **Uma ação, um lugar de cada vez.** "Iniciar ideação" continua existindo — é
  o que traz o agente Criativo para a sessão, e dali em diante a
  chave do dono começa a ser gasta ([RN-058](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-058)); ninguém entra sozinho.
  O que mudou é onde ela mora: **dentro do convite** enquanto o convite está
  na tela, e na topbar quando não está. O convite APONTAVA para a
  topbar ("use Iniciar ideação, no topo da tela"), que é a
  versão literal do problema que originou a [RN-097](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-097) — a
  ação num lugar e a explicação em outro. A topbar não pode
  simplesmente perder o botão: dá para digitar numa sessão criativa
  sem nunca ter chamado o agente Criativo, e aí o convite sai
  de cena.

As três telas honram os três estados da [RN-088](#rn-088), com **erro
antes de vazio**: a lista filtrada fica vazia nos dois casos, e dizer "nenhuma
ideação ainda" depois de um 429 seria mentir sobre o que aconteceu.

A chave de deep link do Chat continua `sessions`, não `chat`. É isso que faz um
link antigo salvo com `?tab=sessions` abrir o Chat **com a aba marcada na
barra de abas** — resolver a chave antiga como alias só no painel deixaria
a barra de abas sem seleção nenhuma, porque `Tabs` compara `active`
com `key`, e quem escreve `active` recebe a chave crua do
`validateSearch`.

- **Onde:** `apps/web/src/routes/project-tabs.ts:95` (as duas entradas),
  `apps/web/src/routes/ProjectSessionsTab.tsx:114` (o filtro pelo `kind`
  gravado) e `:98` (o CTA criando no `kind` da aba),
  `apps/web/src/routes/SessionPage.tsx:715` (`conviteVisivel`, a única
  pergunta que a topbar e o convite compartilham)
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.test.tsx`,
  `apps/web/src/routes/project-tabs.test.tsx`,
  `apps/web/src/routes/SessionPage.sessao.test.tsx`
- **Caso de borda:** projeto sem sessão daquele tipo mostra o estado vazio
  DAQUELE TIPO, mesmo quando tem sessões do outro tipo — é
  informação, não erro.
- **Origem:** [ADR 0061](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0061-tipo-da-sessao-na-criacao.md)

<a id="rn-107"></a>

### RN-107 — A aba Code tem um QUARTO estado: bloqueada por decisão pendente {#rn-107}

Os três estados da [RN-088](#rn-088) (carregando/erro/vazio) não descrevem
`sem_decisao` ([RN-105](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-105)): não é carregando (a api já respondeu), não é
erro (ela respondeu CERTO) e não é vazio (não falta dado — falta uma DECISÃO,
que é outra coisa). Tratar `sem_decisao` como "vazio" mostraria um editor sem
arquivos, convidando a pensar que o repositório está vazio; tratar como "erro"
faria a tela sugerir "tentar de novo" para algo que só o Arquiteto resolve.

A aba pergunta o estado do container ANTES de tentar ler código
(`GET /projects/:id/container`), em vez de esperar a primeira árvore ou
arquivo devolver 409 — a mesma checagem que a api já faz no funil de
`ReadProjectCodeUseCase` (RN-105), só que perguntada primeiro, para o quarto
estado nascer como mensagem própria e não como o rodapé de um erro genérico.
Enquanto bloqueada, a tela reconsulta sozinha a cada 15s — depois de decidida
a imagem não muda sem ação humana nova, e ficar reconsultando um estado
estável seria a mesma família de tráfego desnecessário da PÓS-FASE 15.

A apresentação do quarto estado foi EXTRAÍDA para `ContainerImageGateNotice`
(`apps/web/src/components/ContainerImageGate.tsx`) — achado de uso: a aba PRs
(`apps/web/src/routes/code/PrListAndDiff.tsx`, consumida por
`ProjectPrsTab.tsx` e por `CodeDiffPanel.tsx`) chama `getCodePullRequests`/
`getCodeDiff`, que passam pelo MESMO funil (RN-105) e podem devolver o MESMO
409 — mas, ao contrário desta aba, sem perguntar antes. Ela mostrava esse 409
no banner de erro genérico com "Tentar de novo", a afordância errada para um
estado que só o Arquiteto resolve. `isContainerImageGateError`
(`apps/web/src/lib/api-client.ts`) identifica a causa pelo `status === 409`
— única causa de `ConflictException` em `ReadProjectCodeUseCase.alvo` — e
`PrListAndDiff` troca o banner por `ContainerImageGateNotice` quando ela bate,
sem pré-checagem própria (reage ao 409 da query que já ia rodar).

- **Onde:** `apps/web/src/routes/ProjectCodeTab.tsx`,
  `apps/web/src/routes/ProjectCodeTab.module.css`,
  `apps/web/src/components/ContainerImageGate.tsx` (apresentação
  compartilhada), `apps/web/src/routes/code/PrListAndDiff.tsx` (consumidor
  reativo ao 409), `apps/web/src/lib/api-client.ts`
  (`isContainerImageGateError`)
- **Teste:** `apps/web/src/routes/ProjectCodeTab.test.tsx` ("o gate"),
  `apps/web/src/routes/code/CodeDiffPanel.test.tsx`,
  `apps/web/src/routes/ProjectPrsTab.test.tsx` ("o gate do container não é
  erro genérico")
- **Borda:** a checagem no front NÃO substitui a da api — é conveniência de
  UX. Se a api mudar de estado entre a consulta do gate e a leitura de
  verdade, a rota de leitura ainda recusa com 409 (RN-105); o front só evita
  o caso comum de mostrar o editor vazio por um instante. A aba PRs não faz
  pré-checagem: ela descobre o bloqueio quando a query já falhou, porque não
  há árvore/arquivo nenhum ali para o instante "vazio" que a pré-checagem da
  aba Code evita.
- **Origem:** [ADR 0065](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0065-container-por-projeto-a-fronteira-deixa-de-ser-politica.md)

<a id="rn-108"></a>

### RN-108 — O socket da sessão exige um ticket opaco de uso único, não o JWT reaproveitado {#rn-108}

`EngineWeb.SessionSocket.connect/3` recusava a conexão inteira só com o
`session_id` (UUID) precisando existir no Registry — quem descobrisse o UUID
entrava no canal `session:<id>` e recebia todos os broadcasts ao vivo da
sessão. Fechar isso era limitação deliberada documentada no próprio módulo
desde a Fase 3.

`POST /projects/:projectId/sessions/:sessionId/socket-ticket` (`scope:
"heartbeat"|"terminal"`) emite um ticket opaco (32 bytes de CSPRNG,
`TokenFactory`), TTL de **30 segundos**, uso único. `scope: "heartbeat"` exige
papel `viewer`; `scope: "terminal"` exige `developer` — o mesmo papel mínimo
de `MIN_ROLE_FOR_ACTION_TYPE.terminal` em `domain/actions/decide.ts` (hoje
nenhum caminho pede `terminal` de verdade; o valor nasce certo para a FASE 25,
o terminal interativo). A api persiste só o HASH (SHA-256 **puro**, não
`hashDeToken`/HMAC — o engine não tem o pepper da api, e um token de 256 bits
de CSPRNG não precisa de pepper contra dicionário, mesmo raciocínio que o
próprio `hashDeToken` já registra), nunca o token bruto.

O consumo é do ENGINE, que lê `session_socket_tickets` direto (mesmo padrão de
`Engine.Outbox.Event` sobre `outbox_events` — nunca changeset/insert, só a
escrita estreita que o uso único exige) em DUAS etapas:
`SocketTicket.validar/1` (peek, sem marcar nada — chamado por `connect/3`,
que ainda não sabe qual `session_id` vai ser pedido) e
`SocketTicket.consumir/2` (`UPDATE` condicional exigindo o `session_id` do
tópico bater com o da linha — chamado por `SessionChannel.join/3`, que
também confere o `project_id` do ticket contra o da sessão, defesa em
profundidade contra ticket de um projeto abrindo canal de outro). Sem ticket,
ou com um inválido: a conexão inteira é recusada (`{:error, %{reason:
"unauthorized"}}`), não só o join do canal.

O web (`session-channel.ts`) busca um ticket NOVO antes de TODA
`socket.connect()` — inclusive em reconexão automática, que existe. O
reconnect nativo do `Phoenix.Socket` reusaria o mesmo `params` da construção
(o ticket velho, já expirado ou consumido), então ele é neutralizado
(`reconnectAfterMs` que praticamente nunca dispara) e a reconexão passa a ser
inteiramente manual, com busca de ticket fresco a cada tentativa.

Essa neutralização vale para TODO cliente do socket, e não só para o do web —
inclusive o socket `/runner`, cujo ticket (`POST .../runner-ticket`) é do
mesmo calibre. Ela falhou em DOIS dos quatro construtores de `Socket` do
repositório, e o custo foi medido em execução real: `apps/runner/src/
channel.ts` construía o socket sem a opção — enquanto o docblock do módulo
AFIRMAVA que o reconnect era "por isso neutralizado" — e o auto-reconnect
repetia o mesmo ticket já consumido a cada **~5,13s** (o teto do backoff
interno do phoenix.js), rendendo **61 `REFUSED CONNECTION TO
EngineWeb.RunnerSocket`** em poucas horas. Somado à política PRÓPRIA do
runner (`index.ts`, essa correta), o resultado foram **530 requisições num
minuto** contra o teto de 300 do `RATE_LIMIT_USER` — e como o limite é por
USUÁRIO, o 429 aparecia no NAVEGADOR do dono da conta. Duas consequências, e
a segunda é pior que o 429: enquanto está nesse laço o runner NÃO está
conectado, então `RunnerReadiness` (RN-507) recusa e o projeto parece "sem
agente local". `apps/web/src/lib/fs-browser-channel.ts` tinha a MESMA linha
de defeito (mesmo ticket de uso único, e sem política própria de reconexão —
o `onClose` dele manda "feche e reabra") e foi corrigido junto.

O que impede a terceira instância é MECANISMO, não comentário: no runner as
opções do `Socket` viraram um tipo com `reconnectAfterMs` OBRIGATÓRIO
(`OpcoesDoSocket` em `channel.ts`), e os dois lados ganharam teste que assere
a OPÇÃO PASSADA ao construtor — um teste que só verifique "conecta" passava
com o defeito de pé, e passou. Junto, `conectarERodar` (`index.ts`) passou a
DESCARTAR explicitamente a conexão caída (`conexao.desconectar()`): sem isso
o `Socket` da rodada anterior sobrevivia à criação do próximo, e cada queda
deixava mais um objeto vivo tentando com o ticket morto.

- **Onde:** `apps/api/src/db/schema/sessions.ts` (`sessionSocketTickets`),
  `apps/api/src/domain/sessions/socket-ticket-scope.ts`,
  `apps/api/src/application/use-cases/sessions/create-socket-ticket.use-case.ts`,
  `apps/api/src/interfaces/http/sessions/sessions.controller.ts` (rota
  `socket-ticket`), `apps/engine/lib/engine/sessions/socket_ticket.ex`,
  `apps/engine/lib/engine_web/channels/session_socket.ex`,
  `apps/engine/lib/engine_web/channels/session_channel.ex`,
  `apps/web/src/lib/session-channel.ts`,
  `apps/web/src/lib/fs-browser-channel.ts`,
  `apps/runner/src/channel.ts` (`OpcoesDoSocket`,
  `NUNCA_RECONECTAR_SOZINHO_MS`), `apps/runner/src/index.ts`
  (`conectarERodar`, o descarte da conexão caída)
- **Teste:**
  `apps/api/test/application/use-cases/sessions/create-socket-ticket.use-case.spec.ts`,
  `apps/api/test/domain/sessions/socket-ticket-scope.spec.ts`,
  `apps/api/test/infrastructure/persistence/session-socket-ticket.repository.spec.ts`,
  `apps/engine/test/engine/sessions/socket_ticket_test.exs` (reuso falha,
  session_id errado falha, corrida concorrente só um vence),
  `apps/engine/test/engine_web/channels/session_socket_test.exs` (sem ticket
  a conexão é recusada),
  `apps/engine/test/engine_web/channels/session_channel_test.exs` (ticket de
  outro projeto: join falha), `apps/web/src/lib/session-channel.test.ts`,
  `apps/runner/src/channel.spec.ts` ("neutraliza o auto-reconnect do
  Phoenix.Socket — ticket de uso único nunca é repetido"; assere a OPÇÃO
  passada ao construtor, e reprova sem ela),
  `apps/web/src/lib/fs-browser-channel.test.ts` (o mesmo, no transporte via
  runner do navegador de pastas)
- **Borda:** o ticket NÃO é o JWT reaproveitado — TTL curto, uso único, escopo
  fechado, e nasce de uma rota própria que já checa papel efetivo, não de
  decodificar o access token existente.
- **Origem:** sem ADR — extração/hardening pontual, não mudança estrutural.

<a id="rn-113"></a>

### RN-113 — Blame no editor é anotação SOB DEMANDA — um toggle, nunca embutida na leitura do arquivo {#rn-113}

A UI que consome a fundação da [RN-110](https://github.com/viralabs-dev/brabo-contracts/blob/dev/packages/docs/business-rules/contracts.md#rn-110) entra aqui: o editor da aba
Code (`CodeEditor.tsx`) só chama `getCodeBlame` quando o usuário liga o toggle
"Blame" — nunca junto da leitura de arquivo, que já dispara sozinha ao abrir
uma aba. O motivo é o mesmo dos orçamentos de leitura composta (ADR 0060):
blame é uma SEGUNDA chamada ao provider por arquivo aberto, e um arquivo perto
do teto (`GIT_BLAME_LINE_LIMIT`, 2000 linhas) já é caro o bastante para não
pagá-lo de graça em toda navegação. `truncated` (que a RN-110 já expõe) vira
aviso visível, no mesmo padrão do aviso de `fileQuery.data.truncated`.

Linhas consecutivas do MESMO commit mostram autor e sha curto só na PRIMEIRA
linha do bloco — repetir o mesmo texto em cada linha de um bloco de dezenas
de linhas seria ruído, não anotação; a linha só some do texto, nunca some da
anotação (o `title` do elemento continua com data completa e resumo do
commit em qualquer linha do bloco).

- **Onde:** `apps/web/src/routes/code/CodeEditor.tsx`,
  `apps/web/src/routes/code/CodeEditor.module.css`
- **Teste:** `apps/web/src/routes/code/CodeEditor.test.tsx`
- **Origem:** onda de UI da FASE 26b (blame — dropdown rico de branches e
  lista de PRs são UI de outros dois agentes, sem risco de colisão)

## Painel de projetos

<a id="rn-118"></a>

### RN-118 — A árvore do time expõe detalhe de execução por marco, e abre os "5 últimos" {#rn-118}

`AgentTimelineTree`/`timeline-tree.ts` (FASE 14b) já agrupava o event log por
agente, mas com três lacunas: o critério de abrir um ramo era só
ativo/parado (sem relação com quantos agentes existiam), o contador do
cabeçalho era o TOTAL de marcos (nunca "o que é novo"), e `tool.call`/
`tool.result`/`agent.response` viravam marco mostrando só o nome da
ferramenta — `args`, `result` e `iteration`, que o event log já grava,
nunca chegavam na tela.

**Abertura padrão** passa a ser "os 5 agentes de atividade mais recente
(maior `seq` do último marco)", com ativo mantendo prioridade sobre
recência — não se soma: como `montarArvore` já ordena ativos primeiro e,
dentro de cada grupo, do mais recente pro mais antigo, os dois critérios
colapsam numa fatia só (`ramosAbertosPorPadrao`, os primeiros
`max(nº de ativos, 5)` ramos). Mais de 5 ativos: todos abrem, sem corte.

**Contador de novidade** por agente usa o MESMO mecanismo do sino
(`read-state.ts`, `localStorage`), granular por `projectId:agentId` em vez
de só `projectId` — não existia "último visto" nessa granularidade antes.
Ramo colapsado com marco de `seq` maior que o último visto daquele agente
mostra a contagem de NOVIDADE no lugar do total; abrir o ramo (automático
ou manual) marca como visto até o `seq` mais recente.

**Detalhe expansível** é por MARCO, não por ramo — só `tool.call`,
`tool.result` e `agent.response` (`EVENTOS_EXPANSIVEIS`) viram botão
individual, porque só eles carregam payload que vale expandir. O
agrupamento visual por ITERAÇÃO usa `iteration` do payload de
`agent.response` quando existe (ToolLoop — `tool.call`/`tool.result`
herdam a iteração da resposta que os despachou, porque no ToolLoop eles
são emitidos DEPOIS dela); agentes fora do ToolLoop (PO, Criativo, sem
`iteration` no payload) ganham um contador PRÓPRIO por agente, incrementado
a cada resposta — inferência por proximidade de `seq`, não um campo novo no
event log.

- **Onde:** `apps/web/src/lib/timeline-tree.ts` (`Marco.iteracao`,
  `Marco.eventType`, `Marco.payload`, `ramosAbertosPorPadrao`,
  `marcoExpansivel`), `apps/web/src/components/AgentTimelineTree.tsx`,
  `apps/web/src/lib/read-state.ts` (`getAgentLastSeenSeq`/
  `setAgentLastSeenSeq`)
- **Teste:** `apps/web/src/lib/timeline-tree.test.ts` (agrupamento por
  iteração real e inferida, `ramosAbertosPorPadrao` com ativo/recência/sem
  corte), `apps/web/src/components/AgentTimelineTree.test.tsx` (abertura
  padrão, contador de novidade aparecendo/sumindo, marco expandindo com
  args/resultado/iteração)
- **Origem:** pedido do usuário — lacunas confirmadas por investigação no
  componente existente da FASE 14b; sem ADR, mesma semântica de "não visto"
  do sino, só granularidade nova

---

## Session

<a id="rn-119"></a>

### RN-119 — O agente ATIVO da sessão é o do `agent.activated` mais recente — nunca uma cadeia fixa {#rn-119}

`SessionPage` decide duas coisas a partir do MESMO agente: para quem vai a
mensagem do composer, e de qual agente a topbar resolve o modelo mostrado
(a cascata completa sessão→agente→área→projeto→workspace, a mesma que o
`RunLlmTurnUseCase` usa para de fato rodar o turno). As duas perguntas
tinham respostas DIFERENTES antes desta regra: o roteamento usava uma cadeia
fixa de precedência (architect > po > creative, baseada em EXISTÊNCIA
histórica — "já ativou uma vez", que nunca "desligava"), e o modelo mostrado
nem sabia quem estava ativo — a rota de vínculo de modelo não recebia agente
nenhum e sempre caía no fallback fixo do agente Criativo
(`herdarModeloDeStart`), mesmo depois de um handoff para o PO, o Arquiteto ou o Dev
Lead.

A definição única: o agente ATIVO é o do `agent.activated` mais
RECENTE (por `seq`), entre os agentes conversacionais do fluxo do chat
(Criativo, PO, Arquiteto, Dev Lead). **O Infra Lead fica de fora**:
`agent_command_controller.ex` (engine) só tem rota `message` para
po/dev-lead/arquiteto (mais o Criativo, como fallback implícito da última
cláusula) — o Infra nunca teve `message` ligado, só `start`. Mandar mensagem
para "infra" hoje cairia em silêncio no agente Criativo; tratá-lo
como agente ativo do composer reabriria essa armadilha em vez de fechar
uma.

> **Superada em parte pela [RN-631](parte-05.md#rn-631) (AT-251):** "vence o `agent.activated`
> mais recente" era ele mesmo um destinatário padrão implícito, e invisível.
> O destinatário do composer agora é ESCOLHIDO pela pessoa (um seletor "Para"
> listando os agentes que já estão na sessão) e o modelo da topbar
> segue esse destinatário. O que sobrevive desta regra é a metade do
> modelo: a rota de vínculo recebe o agente, nunca cai em fallback calado.

- **Onde:** `apps/web/src/lib/session-destinatario.ts:290`
  (`useDestinatarioDoChat`, desde a RN-631),
  `apps/web/src/lib/api-client.ts:1192` (`getSessionModelBinding`, o
  `agentId`), `apps/api/src/interfaces/http/llm/model-bindings.controller.ts:166`
  (`getSessionBinding`, `@Query('agentId')`)
- **Teste:** `apps/web/src/routes/SessionPage.destinatario-do-chat.test.tsx`
  (antes `SessionPage.agente-mais-recente.test.tsx`),
  `apps/web/src/routes/SessionPage.modelo-do-agente-ativo.test.tsx`,
  `apps/api/test/application/use-cases/llm/resolve-model-binding.use-case.spec.ts`
- **Caso de borda:** o Infra Lead não participa do roteamento do composer nem
  da definição de "agente ativo" — ele é proativo (Fase 4), não
  conversacional pelo composer.

<a id="rn-120"></a>

### RN-120 — O poll de eventos da sessão pausa durante um turno em andamento {#rn-120}

`useSessionEvents` buscava eventos a cada poucos segundos SEM saber de um
turno em andamento. Se o poll caía DURANTE um turno (comum — turnos costumam
durar mais que o intervalo), ele trazia `chat.message`/`agent.response` já
persistidos, que renderizavam JUNTO com o estado
otimista/de streaming ainda na tela: a mesma mensagem, duas vezes.

A correção pausa só o TIMER (`refetchInterval`) enquanto `streaming` é
`true` — a query continua `enabled`, então a invalidação explícita que
já dispara no fim do turno (`finalizarTurnoDoAgente`) segue
buscando dados frescos na hora certa. `pausarPoll` é parâmetro
OPCIONAL, padrão `false`: os outros consumidores do hook (Overview, Code,
Provisioning, AdoptionPlan) não têm turno conversacional em andamento e
ficam como estavam.

- **Onde:** `apps/web/src/lib/hooks.ts:221` (`useSessionEvents`),
  `apps/web/src/routes/SessionPage.tsx:269` (`eventsQuery`)
- **Teste:** `apps/web/src/lib/hooks.pausar-poll.test.tsx`
- **Caso de borda:** pausar o timer não é desabilitar a query — a invalidação
  explícita segue funcionando, e a correção depende dela para nunca perder dado.

## Painel de projetos

<a id="rn-121"></a>

### RN-121 — Dev agent e QA são "executores": aba própria, fora do "Time de agentes" {#rn-121}

O grid "Time de agentes" e a "Linha do tempo do time" da Visão geral
misturavam Criativo/PO/Arquiteto/Infra com dev-`<módulo>` e QA (lead +
`qa-automacao`/`qa-performance-seguranca`) — sete, oito agentes na mesma
grade, sem distinguir quem CRIA/DECIDE de quem IMPLEMENTA/VERIFICA. A aba
**Executores** isola os dois últimos, com a MESMA renderização da Visão
geral (`AgentCard`, o grid de área — extraído para `AgentTeamGrid.tsx` — e
`AgentTimelineTree`), nunca um card reinventado.

**A regra de separação é uma função só**, `isExecutorGroup`/
`isExecutorAgentId` (`lib/agent-status.ts`): `dev-lead`/`dev-<qualquer
módulo>` e a área `qa` inteira (lead + subespecialidades) são executor;
o resto não é. As DUAS telas filtram o MESMO `groupRosterByArea` com essa
função — a Visão geral com `!isExecutorGroup`, Executores com
`isExecutorGroup` — então um agente não pode aparecer nos dois nem sumir
dos dois: é sempre exatamente um lado.

**A árvore não duplica**: cada aba filtra os EVENTOS antes de passar para
`AgentTimelineTree` (por `actor.id` pertencer ou não ao conjunto de
executores), então o ramo de um dev agent aparece só em Executores, nunca
também na Visão geral. A coluna de Atividade (`ActivityFeed`, RN-099/100)
NÃO foi filtrada — ela responde "o que aconteceu" na sessão inteira,
dev/QA inclusive, e o filtro por agente do próprio componente já lista
todo mundo que falou; só o grid e a árvore de "quem está fazendo o quê"
mudam de lugar.

- **Onde:** `apps/web/src/lib/agent-status.ts` (`isExecutorGroup`,
  `isExecutorAgentId`, `autonomyActionTypeFor` — movido de
  `ProjectOverviewTab.tsx`), `apps/web/src/components/AgentTeamGrid.tsx`
  (extraído do grid que já existia), `apps/web/src/routes/
  ProjectExecutorsTab.tsx`, `apps/web/src/routes/ProjectOverviewTab.tsx`,
  `apps/web/src/routes/project-tabs.ts` (`key: 'executores'`, `ordem: 12`
  — logo depois da Visão geral, antes de Criativo/Chat/Code)
- **Teste:** `apps/web/src/lib/agent-status.test.ts` (`isExecutorAgentId`/
  `isExecutorGroup` — dev-`<módulo>`, `dev-lead`, área `qa` inteira são
  executor; criativo/po/arquiteto/infra/secops não são);
  `apps/web/src/routes/ProjectExecutorsTab.test.tsx` (mostra só dev/QA,
  estado vazio sem os dois, contagem do cabeçalho);
  `apps/web/src/routes/ProjectOverviewTab.test.tsx` (dev-backend/QA somem
  do grid, o resto do time continua); `apps/web/src/routes/
  project-tabs.test.tsx` (a aba nova entra na varredura genérica do
  registro — régua, painel, deep-link, ordem única)
- **Borda:** SecOps NÃO é executor — ele entra na roster pelo MESMO
  `pr.gate_changed` que traz QA (Fase 4a, `rosterFactsFromEvents`), mas
  fica na Visão geral. `dev-lead` está na lista de executores por
  completude (RN-087 o descreve como conversacional), embora hoje nenhum
  caminho o instancie na roster da sessão (a delegação Dev Lead →
  `dev-<módulo>` segue fora de escopo, ADR 0053 item 5).
- **Origem:** pedido do usuário — "Executores" própria pra dev agent e QA,
  fora do grid misturado da Visão geral.

---

## Session

<a id="rn-123"></a>

### RN-123 — Sessão criativa sem agente Criativo ativo: a primeira mensagem TAMBÉM o ativa {#rn-123}

Numa sessão `kind: 'criativa'` ([RN-097](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-097)) ainda sem `agent.activated`,
mandar a primeira mensagem pelo composer ativa antes o agente
Criativo (esperando a ativação terminar) e só então entrega aquela
mensagem a ele pelo caminho real (`sendAgentMessage` — histórico, prompt de
sistema, ferramenta `emit_artifact`). Antes desta regra, quem digitava sem
clicar em "Iniciar ideação" caía num chat SSE genérico, sem histórico e sem
regras de negócio: NÃO era o agente Criativo de verdade, e a conversa
não registrava nada no domínio.

O clique em "Iniciar ideação" continua existindo ([RN-104](#rn-104)) — ainda é
o que dispara a ativação quando a pessoa prefere o gesto explícito, e
é a partir dele que a chave do dono ([RN-058](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-058)) começa a ser gasta em
qualquer dos dois caminhos. O que mudou é que a PRIMEIRA MENSAGEM agora também
conta como esse gesto: ninguém deveria precisar de um clique à parte antes de falar
com quem a tela já o convidou a falar.

- **Onde:** `apps/web/src/routes/SessionPage.tsx:690` (`handleSend`)
- **Teste:** `apps/web/src/routes/SessionPage.ideacao-automatica.test.tsx`
- **Caso de borda:** sessão `consultiva` não tem agente Criativo — a regra
  não se aplica, e o caminho SSE genérico segue sendo o certo para ela.
