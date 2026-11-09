---
id: rn-web-parte-04
title: 'Regras de negócio — Web — parte 4 (desde RN-491)'
sidebar_label: 'Web — parte 4 (desde RN-491)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 4 (desde RN-491)

## A busca do RAG deixa rastro, e o rastro congela os pesos (RN-479..481)

<a id="rn-491"></a>

### RN-491 — A Infra elege entre as candidatas do Arquiteto, e a eleição vira uma NOVA versão de `artifact.project_image` {#rn-491}

`propose_container_start` fecha a metade que a RN-487 deixou declarada em
aberto: a Infra elege UMA das `imagemCandidata` do roteamento vigente do
Arquiteto (`artifact.module_routing`) e propõe subir o container REAL do
projeto. A eleição só tem efeito porque `ExecuteContainerStartUseCase` REUSA
`DecidirImagemDoProjetoUseCase` para emitir uma nova versão de
`artifact.project_image` com `decidedBy: 'infra-lead'` — sem isso a eleição
seria auditável e INERTE: o broker compõe o container lendo `GET
.../container-spec`, que lê `artifact.project_image` (RN-105), nunca
`artifact.module_routing`.

**A imagem eleita precisa estar na lista de candidatas, sempre — validado
ANTES de tocar no artefato.** Fora da lista, a ação falha nomeando a imagem
recusada e listando as candidatas válidas, e nem `DecidirImagemDoProjetoUseCase`
nem o broker chegam a ser chamados: a Infra elege, nunca inventa.

**Novo `container_start` (`maintainer`, mesmo calibre de `open_infra_pr`/
`parallelize`), deliberadamente FORA do bloco de tetos absolutos de
`decide.ts`** — mesmo raciocínio já registrado ali para
`propose_execution_plan`/`assess_implementability`: é a PRIMEIRA vez que este
container sobe de verdade para esta eleição, não uma ultrapassagem de um teto
já autorizado. Diferente de `open_infra_pr`, esta ação NÃO é seedada em
`INFRA_AUTONOMY_SEEDS` — o Infra Lead nunca aplica nada com `open_infra_pr`
(só propõe uma PR que um humano ainda mergeia), mas subir um container é
efeito externo real, então fica `require_approval` por padrão, decidido caso a
caso pelo `ApprovalCard`. Um `maintainer` PODE configurar auto-aprovação
depois, e por isso `ProposeActionUseCase` também executa no caminho
`auto_approved`, mesma lição do comentário sobre `parallelize` nesse arquivo
("sem isto a ação nascia, era aprovada — e nada subia").

**Revisado pela [RN-671](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-671) (ADR 0190, 01/10):** `container_start` passa
a ser SEMEADO `auto_approve` no aceite do handoff da Infra, e o servidor do
Infra Lead propõe a primeira subida sozinho quando há roteamento. O resto desta
regra — a lista de candidatas, `maintainer`, fora dos tetos absolutos — segue.

**Depois do broker confirmar, a transição de ciclo de vida segue a máquina de
estados do ADR 0081, nunca reprovisiona à toa.** Sem linha ainda, ou linha em
`failed`/`removed`: `provisioning` (a que lê a imagem recém-decidida e
congela `imageVersion`) e só então `running`. Linha em `stopped`: direto para
`running` — a máquina de estados nem permite `stopped -> provisioning`, e
reprovisionar reemitiria uma imagem que já está gravada na linha. Linha já
`provisioning`/`running`: completa a transição pendente ou não faz nada,
apoiado no `start` idempotente do broker (`jaEstavaDePe`).

**Revisa a RN-485.** "Nada dispara subida... o único chamador que existe hoje
faz LEITURA" deixa de ser verdade: `container_start` é o primeiro chamador
real de `ContainerBrokerPort.start`, das cinco operações que o ADR 0128/0130
declarou. `RegistrarTransicaoDeContainerUseCase` ganha o primeiro chamador
fora de teste também. Continua valendo que NADA dispara sozinho — é sempre uma
`proposed_action`, decidida por um humano ou por política explícita.

**Dev agents NÃO passam a trabalhar dentro do container que sobe aqui.** Essa
etapa é uma PR posterior, declarada em aberto no CLAUDE.md — a frase que a
tela de aprovação mostra (`apps/web/src/lib/aprovacoes.ts`) para de propósito
antes de prometer isso.

- **Onde:** `apps/api/src/application/use-cases/actions/execute-container-start.use-case.ts`,
  `apps/api/src/domain/actions/decide.ts` (`ACTION_TYPES`,
  `MIN_ROLE_FOR_ACTION_TYPE`), `apps/api/src/domain/containers/container-start-execution-result.ts`,
  `apps/api/src/application/use-cases/actions/approve-action.use-case.ts`,
  `apps/api/src/application/use-cases/actions/propose-action.use-case.ts`,
  `apps/api/src/application/use-cases/execution/get-infra-context.use-case.ts`
  (`moduleRouting`, primeiro consumidor HTTP de `GetModuleRoutingUseCase`),
  `apps/web/src/lib/aprovacoes.ts`,
  `apps/engine/lib/engine/infra/tools/propose_container_start.ex`,
  `apps/engine/lib/engine/infra/infra_lead_server.ex`
- **Teste:**
  `apps/api/test/application/use-cases/actions/execute-container-start.use-case.spec.ts`
  (caminho feliz elegendo candidata; imagem fora das candidatas recusa sem
  chamar `DecidirImagemDoProjetoUseCase` nem o broker; `BrokerRecusouError`/
  `BrokerIndisponivelError` viram `failed`, nunca propagam; `stopped` pula
  direto para `running`),
  `apps/api/test/domain/actions/decide.spec.ts` (`container_start` exige
  `maintainer`; CONSEGUE chegar a `auto_approve` quando configurado — ao
  contrário de `parallelize`/merge protegido/`instruction_patch`),
  `apps/api/test/application/use-cases/execution/get-infra-context.use-case.spec.ts`
  (`moduleRouting` presente e ausente),
  `apps/web/src/lib/aprovacoes.test.ts` (frase não promete dev agent dentro
  do container),
  `apps/engine/test/engine/infra/infra_lead_server_test.exs`
- **ADR:** [0130](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0130-broker-de-container.md), [0133](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0133-infra-elege-imagem-do-roteamento.md)
- **Origem:** plano do dono do produto, Parte 1 / PR 1.5

<a id="rn-499"></a>

### RN-499 — O handoff da Infra tem card acionável PRÓPRIO, fora do fio — sem alargar `AGENTES_DE_CHAT` {#rn-499}

`OfferInfraHandoffUseCase` oferece o handoff pro Infra Lead
(`offer-infra-handoff.use-case.ts:43`), e até aqui **tela nenhuma podia
aceitá-lo**. `offeredHandoff` (`SessionPage.tsx`) restringe o card do fio a
`AGENTES_DE_CHAT` ([RN-136](parte-02.md#rn-136)), que não inclui `infra`, e
`acceptHandoff` (`api-client.ts`) tinha **um único consumidor** — esse card,
atrás desse filtro. O comentário do próprio código registrava a consequência
como aceita: *"como Infra nunca é aceito por AQUI … na prática, nunca"*.

O efeito não era cosmético: o handoff ficava `offered` para sempre, o Infra
Lead nunca era ativado, `propose_container_start` nunca era chamado
([RN-491](#rn-491)) e **nenhum projeto de nenhum modo chegava a ter container
de pé**. A cadeia "Infra aceita → propõe `container_start` → aprovado →
`running`" era inalcançável por qualquer caminho de tela.

**O filtro NÃO foi alargado, e isso é a regra.** `AGENTES_DE_CHAT` está certo
em excluir `infra`: o `agent_command_controller.ex` do engine não tem cláusula
de `message` pro Infra Lead, e a última cláusula (sem guarda) trataria
`"infra"` como se fosse o Criativo — pôr `infra` na lista faria a tela
oferecer um fio de conversa que não existe e o composer mandar mensagem pro
agente errado. (Desde a [RN-584](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-584) o engine recusa com nome em vez de
entregar ao Criativo; o filtro continua certo pelo mesmo motivo.) Aceitar a Infra é uma ação **propositiva**, não conversacional.

O card acionável mora, então, **fora do fio**: na faixa fixa entre a área que
rola e o composer, a mesma que hospeda o handoff manual
([RN-440](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-440)) e que já se declara o lugar das ações de handoff que "não
são conversa, são redirecionamento". Três consequências que a escolha compra:
o `handoff.offered` da Infra **continua narrado** no fio como divisor mudo
(nada muda na timeline); nenhum handoff conversacional muda de forma; e o
botão não some quando a oferta sai da janela de 200 eventos numa sessão longa
— o card do fio dependeria do evento estar visível, este não depende.

O card **diz a consequência do clique**, porque ela não é óbvia: aceitar ativa
o Infra Lead, que assume o provisionamento e vai **propor** a subida do
container; a proposta ainda passa pelo pipeline de aprovação de sempre
(`container_start`, `maintainer`, nunca auto-aprovável por seed —
[RN-491](#rn-491)). Aceitar não sobe container nenhum.

Fechamento: o mesmo `activeFor(h.toAgent)` do card do fio — handoff já aceito,
ou Infra já ativa nesta sessão por qualquer outro caminho, não reabre convite.
E o clique chama o **mesmo** `handleAcceptHandoff`, sem segundo caminho de
aceite.

- **Onde:** `apps/web/src/routes/SessionPage.tsx`
  (`handoffDaInfraOferecido`, e o bloco `styles.infraHandoffRow` acima do
  `manualHandoffRow`)
- **Teste:** `apps/web/src/routes/SessionPage.handoff-da-infra.test.tsx` —
  card aparece e aceita com os ids certos; some com a Infra já ativa; some em
  sessão não-ativa; o divisor mudo do fio continua lá sem botão de fio; e a
  **não-regressão** de [RN-136](parte-02.md#rn-136): Infra (mais antigo) + Dev Lead (mais
  novo) pendentes mostram os DOIS cards, cada um aceitando o próprio handoff
- **Origem:** exploração do plano "Nome e local na mesma tela, e container
  antes dos dev agents" (D0) — o bloqueador que tornava o requisito "dev agent
  só depois do container de pé" equivalente a "dev agent nunca começa"

## O navegador de pastas servido pela api (RN-504)

<a id="rn-504"></a>

### RN-504 — O navegador de pastas é escopado à base de projetos e NUNCA sai dela {#rn-504}

`GET /workspaces/:workspaceId/project-folders` lista as **subpastas** de um
caminho, e existe porque o assistente de criação de projeto perde, de uma vez,
os DOIS mecanismos de "procurar pasta" que tinha: `FolderBrowserModal` navegava
pelo **websocket do runner** (`fs_list_dir`/`fs_home_dir`) e o
`RunnerOnboardingPanel` usava `showDirectoryPicker`, que devolve um handle do
navegador e nunca um caminho absoluto. Sem runner, o navegador não tem como
listar filesystem nenhum — e é caminho absoluto que `projects.workspace_path`
guarda.

**A contenção é UMA, e é dura.** `path` é opcional e omitido quer dizer a base
(`baseDeProjetos()`); todo `path` fornecido tem que satisfazer
`dentroDaBaseDeProjetos` (RN-500), que reusa `dentroDoEscopo` — a mesma função
do escopo de terminal do ADR 0055 — e por isso pega a armadilha de prefixo:
`/home/voce/brabo2` **não** está dentro de `/home/voce/brabo`, embora a string
comece igual. `..` e `.` são **recusados** em vez de resolvidos, pela mesma
razão de `caminhoDeWorkspaceLocalValido`: resolver aceitaria que o caminho lido
não é o caminho pedido.

**Sair da base é 400, e não 403.** 403 diria "você não tem permissão para ver
isto" e sugeriria que outro papel veria — não é o caso. Não existe papel nenhum
que navegue fora da base, porque fora da base não é uma área mais privilegiada,
é uma área que esta rota simplesmente não endereça. O pedido está MALFORMADO.

**Os tetos são contrato, não detalhe de implementação:** só diretório em
`entries`; no máximo **500**, ordenados **antes** do corte (senão "as 500
primeiras" seria a ordem que o filesystem devolveu, que muda entre máquinas);
sem recursão; entradas começadas com `.` fora; e symlink **reportado, nunca
descido** — `readdirSync(withFileTypes)` tem semântica de `lstat`, então um
link apontando para fora da base não é porta de saída. **O que fica de fora é
CONTADO** (`arquivos`, `simbolicos`, `truncado`): sem isso uma pasta cheia de
código voltaria como lista vazia e a tela diria "pasta vazia", afirmando sobre
o que não leu (RN-180).

**Não há POST.** Criar pasta é da materialização do workspace montado, no
momento em que o container sobe — nunca do seletor.

**O mínimo é `maintainer`**, o mesmo de `POST .../projects` e de
`.../projects-base`, e pelo mesmo raciocínio um passo adiante: `projects-base`
revela UM caminho da máquina do operador, esta rota revela a TOPOLOGIA abaixo
dele. Herdar o `viewer` das rotas vizinhas por elas serem vizinhas é o defeito
que a RN-102 nomeia — o mínimo é do ENDPOINT, nunca da seção. `workspaceId` não
entra no cálculo: a base é da INSTALAÇÃO, e ele está na rota porque é o que dá
escopo ao `RolesGuard`.

**No cliente**, o transporte vira uma das DUAS implementações da interface
`FsBrowser` (`apps/web/src/lib/fs-browser.ts`): `criarFsBrowserViaApi` (nova) e
`connectFsBrowserChannel` (o canal do runner, re-tipada). `FolderBrowserModal`
escolhe por `origem: { tipo: 'api'; workspaceId } | { tipo: 'runner'; projectId }`
— união discriminada, e não duas props opcionais, porque "nenhuma das duas" e
"as duas" seriam estados representáveis que o componente teria de tratar em
runtime. O transporte via runner fica **sem chamador no web** a partir daqui, e
continua no repositório por decisão declarada do dono do produto (o runner sai
da interface, o binário segue sendo refinado); o protocolo em
`apps/runner/src/channel.ts` não é tocado de qualquer forma.

- **Onde:** `apps/api/src/infrastructure/filesystem/project-folders-browser.ts`
  (`listarPastasDeProjeto`, `TETO_DE_ENTRADAS`, `PastaForaDaBaseError`,
  `PastaNaoLegivelError`);
  `apps/api/src/interfaces/http/iam/workspaces.controller.ts`
  (`listProjectFolders`); `apps/web/src/lib/fs-browser.ts`;
  `apps/web/src/components/FolderBrowserModal.tsx`
- **Teste:**
  `apps/api/test/infrastructure/filesystem/project-folders-browser.spec.ts`,
  `apps/api/test/interfaces/http/iam/workspaces-project-folders.controller.spec.ts`,
  `apps/web/src/lib/fs-browser.test.ts`,
  `apps/web/src/components/FolderBrowserModal.test.tsx`
- **ADR:** [0141](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0141-base-unica-dos-projetos-montados.md) (a base que
  esta rota escopa)
- **Origem:** plano do dono do produto, PR 4

## A base decide o que a criação de projeto oferece (RN-513)

<a id="rn-513"></a>

### RN-513 — Com base consentida, `mounted` é o pré-selecionado com `<base>/<slug>` sugerido; sem base, ou sem saber, ele não é oferecido {#rn-513}

> **Revisada pela [RN-573](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-573) (ADR 0161):** a pré-seleção de `mounted`
> passou a exigir TAMBÉM o broker de container confirmado. Com base e sem
> broker (a instalação por Release), `runner` é o pré-selecionado e
> `container`/`mounted` ficam inertes com o motivo em texto; com o broker
> desconhecido, `container` segue selecionado. O resto desta regra vale como
> está.

Duas metades desta regra **já eram regra** e nunca tinham chegado ao cliente.
"Não oferecer o modo sem base" é a [RN-500](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-500); "sugerir `<base>/<slug>`"
é a [RN-501](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-501), e o ADR 0142 adiou a validação de disco justamente para
que o assistente pudesse propor uma pasta que **ainda não existe**. Até aqui,
`GET /workspaces/:workspaceId/projects-base` não tinha **chamador nenhum** no
web, e o card "Pasta montada" era oferecido incondicionalmente — numa
instalação sem `BRABO_PROJECTS_BASE`, escolher o modo terminava numa recusa
400 da api depois de a pessoa ter escolhido, digitado o caminho e chegado ao
fim do assistente.

O que é **novo** é a **pré-seleção**: com base configurada, `mounted` nasce
selecionado. Ela revisa o default do ADR 0072 (onde `container` é "a normal" e
o modo local é escape hatch) e o revisa **só para a instalação local**, onde a
base foi consentida por um humano no host ([RN-511](https://github.com/viralabs-dev/brabo-infra/blob/dev/deploy/docs/business-rules/infra.md#rn-511)). O enum
`project_execution_mode` não muda, nenhum modo novo nasce, e a conversão de
modo (ADR 0111) não é tocada.

**A consulta nasce com o assistente, não com o passo.** O passo "Onde o código
vai morar" é o quinto; um `useQuery` montado só ali faria o card aparecer
piscando depois que a pessoa já estivesse olhando a tela.

**Desconhecido não vira oferta.** Enquanto a resposta não chegou, e também
quando a consulta **falha** (403, rede, api fora), o card não aparece e
`container` segue selecionado. Falha não é permissão para oferecer um modo
cuja pré-condição não se conseguiu confirmar: é a mesma régua da
[RN-088](parte-01.md#rn-088)/[RN-468](parte-03.md#rn-468) — o produto não colapsa "não sei" com "não
tem" — e a dos ADRs 0041/0042, onde capability só é declarada quando
**provada**.

**A pré-seleção nunca sobrescreve escolha humana.** A base chega por rede,
sempre DEPOIS do primeiro render. A tela guarda a escolha do usuário separada
do modo vigente (`modoDeWorkspaceEscolhido` × `modoDeWorkspace`), e a
pré-seleção só vale enquanto ninguém tocou nos cards — trocar o modo debaixo da
mão de quem já clicou é defeito, não conveniência.

**A sugestão nunca clobbera o que foi digitado.** `<base>/<slug>` entra em dois
casos e só neles: campo vazio com nada sugerido ainda, ou campo contendo
exatamente a sugestão anterior desta tela (o nome mudou no passo de detalhes, e
a sugestão acompanha). Qualquer outra coisa — inclusive o campo vazio **depois**
de o usuário ter apagado a sugestão — fica como está. Slug vazio (a adoção, onde
o nome vem do provider) não vira segmento inventado: o campo continua vazio, e
`canAdvanceFromWorkspace` segura o passo. O campo é **editável** o tempo todo; a
pré-seleção não relaxou nenhuma régua de avanço.

**E o aviso do modo parou de mentir.** O texto anterior era anterior ao ADR
0141: dizia que o caminho era livre e que só funcionaria se o usuário o
montasse. Hoje são **dois estados, e são os dois que o backend tem** — sob a
base, nota neutra (a criação passa, e a pasta nem precisa existir: a Infra a
cria ao subir o container, [RN-501](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-501)); fora da base, aviso dizendo que
a api **recusa a criação** (400, em `resolverWorkspacePath`) e **nomeando** a
base, em vez de mandar procurar a variável. Campo vazio não é "fora da base":
não há caminho para a api recusar ainda, e alarmar antes de a pessoa digitar
seria a tela afirmando sobre o que não tem. A comparação é por **segmento**,
nunca `startsWith` cru — `/base-outra` não está dentro de `/base` —, espelhando
`dentroDoEscopo` da api.

- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx:220` (a consulta),
  `:238` (`podeOferecerMounted`/`baseDeProjetos`), `:283` (o modo vigente),
  `:333` (`caminhoForaDaBase`), `:360` (a sugestão);
  `apps/web/src/lib/wizard.ts:143` (`caminhoSugeridoNaBase`) e `:171`
  (`caminhoDentroDaBase`) — as funções puras;
  `apps/web/src/lib/api-client.ts:305` (`getProjectsBase`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx`
  (`describe('NewProjectWizard — a base de projetos decide o que é
  oferecido')` — base presente, base `null`, consulta recusada com 403, a
  escolha humana antes de a base chegar, e os dois estados do aviso);
  `apps/web/src/lib/wizard.test.ts` (`describe('caminhoSugeridoNaBase')` e
  `describe('caminhoDentroDaBase')`)
- **ADR:** [0146](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0146-base-consentida-no-bootstrap.md), ponto 4
- **Origem:** FASE 28, sessão 3

---

## O picker do modo Runner volta a ler o disco de QUEM ESCOLHE (RN-533)

<a id="rn-533"></a>

### RN-533 — Em modo `runner` o navegador de pastas pergunta ao agente local, e a tela diz de quem é o disco {#rn-533}

O assistente de criação tinha **um** navegador de pastas para **dois** modos que
leem discos **diferentes**. A [RN-504](#rn-504) apontou os dois para a api —
certo para `mounted`, cuja pasta mora sob `BRABO_PROJECTS_BASE`, no SERVIDOR — e
declarou o preço por escrito: *"para `runner` a lista deixa de ser o disco da
máquina do usuário e passa a ser a base"*. Aquilo foi aceito porque *"o modo
`runner` sai da criação de projeto no PR seguinte"*, o que **não aconteceu**: o
modo continua sendo oferecido, e a direção do
[ADR 0151](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0151-base-consentida-no-runner.md) (ponto 7) é a oposta. Enquanto
durou, escolher `runner` e clicar "Procurar pasta…" navegava um disco que não é
o daquele projeto — e **nada na tela dizia isso**, então o erro só apareceria
pelo CONTEÚDO da lista.

**O MODO decide o transporte, e são duas perguntas diferentes.** `mounted`
segue byte a byte pela api (`GET workspaces/:workspaceId/project-folders`,
escopado duro à base — RN-504 intacta); `runner` volta a `fs_list_dir`, que
sempre existiu dos dois lados e cujo transporte no web nunca saiu do
repositório. Não é um transporte sobrando que ganhou uso: é a pergunta "o que há
na SUA máquina?", que a api não tem como responder, voltando a ser feita a quem
tem como.

**A âncora do modo `runner` é a criação ANTECIPADA da [RN-437](parte-03.md#rn-437).** O
ticket do canal é escopado a um `projectId` real, então o clique cria o projeto
antes de abrir o modal — o propósito original daquela regra, que a RN-504 tinha
deixado sem consumidor. E falhar essa criação **não abre o modal em transporte
nenhum**: cair na api mostraria a base do SERVIDOR sob o rótulo de "sua
máquina", exatamente o defeito que esta regra fecha.

**Sem agente local conectado, o modo continua oferecido — e quem declara é o
PICKER, não o passo de modo.** A [RN-513](#rn-513) esconde `mounted` quando a
base é desconhecida ou ausente, e está certa: ali a api TEM sinal
(`GET .../projects-base`), e sem base a criação termina em 400 no fim do
assistente, sem conserto na tela. Aqui nenhuma das duas coisas vale. Não existe
sinal de presença de runner na api — a [RN-521](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-521) já declara isso por
escrito —, então esconder o modo ou apagar o botão seria decidir "não tem" a
partir de "não sei", o colapso que a [RN-088](parte-01.md#rn-088)/[RN-468](parte-03.md#rn-468)
proíbem; e o modo **não está quebrado** sem runner, porque o caminho é
confirmado depois, pelo CLI ([RN-423](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-423)) — o que falta é só a
NAVEGAÇÃO. Então a declaração vai para o único lugar que de fato pergunta: o
picker, no instante em que pergunta.

**O motivo é DISCRIMINADO, e os dois desfechos não colapsam.**
`MotivoDeFalhaDoAgente` é `sem-agente` (o engine AFIRMA que não há runner
conectado — um fato do servidor) ou `sem-resposta` (teto da requisição, socket
caído, ticket recusado — ignorância, e dita como ignorância na tela). Antes
desta regra quem decidia era `erro?.includes('Nenhum runner conectado')` no
COMPONENTE — uma tela casando substring de uma frase em pt-BR que mora num
`.ex` do engine, exatamente o que a [RN-532](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-532) recusa por escrito do
outro lado (*"o texto é para um humano ler, o motivo é para o outro lado
DECIDIR"*). O casamento sobrou em **um** lugar, o módulo que é dono do
protocolo do canal, e a degradação é nomeada: frase reescrita no engine cai em
`sem-resposta` — o estado "não sei" —, nunca em "há agente". O transporte de
api **nunca** preenche `motivo`, e isso é decisão: recusa da api é recusa da
api, tem mensagem própria que ENSINA e não há agente local a instalar para
consertá-la.

**A espera é a da [RN-474](parte-03.md#rn-474), REUSADA e não reescrita.** Os dois motivos
levam à `EsperaDoRunner` — mesmos três estados (`esperando`/`confirmado`/
`semResposta`, que nunca colapsam), mesmo TETO de 3 minutos, mesma redação,
mesmo sinal (`workspaceVerifiedAt` MUDANDO, nunca "existindo"). Ela ganhou uma
callback opcional porque aqui a confirmação tem CONSEQUÊNCIA: a listagem que
falhou é refeita sozinha, em vez de a pessoa ter de descobrir que precisa
clicar em algo. A callback dispara UMA vez por instância — sem o `ref`, cada
rodada da sonda a redispararia e o chamador entraria em laço — e ela **não
afirma "está de pé agora"** (`workspaceVerifiedAt` nunca disse isso, RN-468):
por isso quem a recebe REPETE o pedido, e se o agente já caiu de novo a tela
volta ao mesmo estado, honesta das duas vezes. Espera é UMA por tela:
`RunnerOnboardingPanel` ganhou `mostrarEspera`, `false` só onde quem o monta já
mostra a sua — duas seriam duas sondas, dois tetos e, no pior caso, duas frases
discordando sobre o mesmo carimbo.

**E o picker diz de QUEM é o disco, nas DUAS origens.** O único sinal antes
disso era o rótulo de um atalho ("Base de projetos" × "Pasta pessoal"), que
nomeia um lugar e não uma máquina. A frase da api não é decoração de simetria:
sem ela a do runner leria como aviso excepcional, quando é informação que as
duas devem.

- **Onde:** `apps/web/src/lib/fs-browser.ts:60`
  (`MotivoDeFalhaDoAgente`, e por que só o transporte do runner o preenche);
  `apps/web/src/lib/fs-browser-channel.ts:66`
  (`FRASE_DO_ENGINE_SEM_RUNNER`, o único casamento por substring que sobrou) e
  `:68` (`motivoDaMensagem`); `apps/web/src/components/FolderBrowserModal.tsx:227`
  (`agenteNaoRespondeu`, a decisão pelo motivo) e a linha de origem nas duas
  origens; `apps/web/src/components/EsperaDoRunner.tsx:91` (`onConfirmado`) e
  `:136` (o `ref` que a dispara uma vez);
  `apps/web/src/components/RunnerOnboardingPanel.tsx:131` (`mostrarEspera`);
  `apps/web/src/routes/NewProjectWizard.tsx:304` (`origemDoNavegador`, o
  transporte escolhido pelo modo, `undefined` quando não há projeto a ancorar)
- **Teste:** `apps/web/src/components/FolderBrowserModal.test.tsx` (a lista
  declarando o disco da máquina do usuário; `sem-agente` caindo no painel de
  onboarding; a decisão pelo MOTIVO e não pelo texto, com uma redação que
  ninguém prometeu manter; `sem-resposta` com a ressalva de que isso não prova
  ausência, UMA espera só e o teto anunciado; a listagem refeita sozinha quando
  o carimbo muda); `apps/web/src/routes/NewProjectWizard.test.tsx` (o modo
  decidindo o transporte nos dois sentidos; a criação antecipada ancorando o
  canal; a criação que FALHA não abrindo navegador nenhum)
- **ADR:** [0151](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0151-base-consentida-no-runner.md) ponto 7
- **Origem:** FASE 29, sessão 9. Fica declarado e NÃO feito: o picker **não**
  dispara `workspace_create` — escolher uma pasta é escolher, e criar é outra
  coisa. `Engine.Runners.PastaDoProjeto.criar/3` (RN-532) segue sem chamador, e
  ligá-lo exigiria uma rota HTTP nova na api, fora do escopo desta sessão. O
  conserto definitivo do casamento por substring — o engine mandar um código ao
  lado do texto, como o runner já faz com os cinco `motivo` da RN-532 — também
  é do lado do engine, e fica declarado no código

---

## Criar projeto não provisiona repositório (RN-541)

<a id="rn-541"></a>

### RN-541 — Criar um projeto NÃO cria repositório git; o bootstrap é adiado até o handoff do Arquiteto {#rn-541}

Criar um projeto e provisionar o git eram, na prática, o mesmo gesto — e o que
os unia era uma TELA. `ProvisioningPage` dispara `provisionRepository` no efeito
de montagem e é o **único** chamador dele no web; o assistente navegava para lá
ao confirmar, então todo projeto nascia com repositório e Gitflow completos, sem
que ninguém tivesse pedido.

O dono do produto quer o contrário: o que se gera por ora segue **sem git**, e o
repositório só nasce quando o desenvolvimento começa de verdade — o momento em
que o **Arquiteto passa o handoff ao Dev Lead**.

**O mecanismo do adiamento é não navegar para aquela tela.** Ao criar, o
assistente vai direto para a página do PROJETO. Nada mais precisou ser desligado:
como o disparo mora no `useEffect` de uma rota que deixou de ser visitada, deixar
de visitá-la É o adiamento. A rota continua existindo e continua alcançável — o
Dashboard leva a ela quando o provisionamento **falhou** e precisa ser retomado.

**Provider e credencial saem da criação, e ficam na adoção.** Sem repositório
para criar agora, perguntar "onde hospedar" seria colher uma decisão que a tela
não usa, e o passo de credencial cobraria um PAT para um repositório que ninguém
vai criar. Adotar é o oposto por construção — aponta para um repositório que já
existe, e sem provider não há o que apontar. O assistente passa a ter **três**
passos ao criar e quatro ou cinco ao adotar.

**A tela de Confirmar deixa de prometer o Gitflow.** Ela anunciava "N passos de
Gitflow" ao criar, contando `BOOTSTRAP_STEPS`; isso passaria a ser mentira no
instante em que o bootstrap deixou de rodar ali. Passa a dizer QUANDO o
repositório nasce, em vez de afirmar que já está nascendo.

**Consequência declarada:** entre a criação e o handoff, o projeto existe sem
repositório. Nada quebra — `GET .../repository` responde `null` e não 404, a
página do projeto já tem o estado "repositório não provisionado" e a seção de
Repositório em Configurações simplesmente não aparece —, mas todo caminho que
precise de working tree falha NOMEADO até lá (`remoto_de_trabalho` devolve
`:not_found`, e `open_adr_pr` recusa com "Projeto sem repositório provisionado").
Isso deixa de ser borda e passa a ser o estado normal do começo de um projeto.

**O gatilho é a próxima entrega**, e sem ele um projeto criado hoje ficaria sem
repositório para sempre: o aceite do handoff Arquiteto → Dev Lead passa a
provisionar `local`, o único provider que não pede credencial.
Desde a [RN-582](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-582), esse gatilho é o aceite do handoff **ao Arquiteto**
(o do Dev Lead ficou como segunda porta), e ativar a execução sem repositório é
recusado.

O aviso "no plano gratuito do GitHub, repositório privado não aceita proteção de
branch" saiu da tela junto — não por ter deixado de ser verdade, mas por ter
ficado **inalcançável**: a condição era `provider === 'github'`, e ao criar não
há mais provider escolhido.

- **Onde:** `apps/web/src/routes/NewProjectWizard.tsx:379` (`stepKeys`, agora
  dependente de `adotando`), `:540` (a guarda de `provider` restrita à adoção) e
  `:590` (a navegação para `/projects/$projectId`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx`, `describe('NewProjectWizard — o git é adiado')`
  — "criar não passa mais pela página de provisionamento — vai direto ao
  projeto", "criar tem TRÊS passos: provider e credencial saíram", "adotar
  mantém provider e credencial" e "a tela de Confirmar não promete mais o
  Gitflow agora"
- **Origem:** pedido do dono do produto — *"o que for gerado por hora segue sem
  git; git mesmo só será iniciado após iniciar desenvolvimento em projetos
  novos, neste momento que deve rodar o bootstrap"*

---

## A tela reconhece um agente local de MÁQUINA já pareado (RN-548, FASE 30)

<a id="rn-548"></a>

### RN-548 — Com chave de MÁQUINA ativa, o painel do runner para de mandar parear e passa a dizer o que falta — sem nunca afirmar que o agente está de pé {#rn-548}

Sessão 7 da [FASE 30](https://github.com/viralabs-dev/brabo/blob/dev/docs/explanation/fase-30-runner-por-maquina.md), decidida pelo
[ADR 0154](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0154-chave-de-dispositivo-de-maquina.md). É a metade de WEB da
identidade de máquina: a [RN-543](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-543) fez a listagem de chaves marcar a
ESPÉCIE (`projeto` | `maquina`) *"para que uma chave de máquina não ficasse
invisível em toda tela"*, e ficou sem consumidor. Esta RN é o consumidor.

**O defeito, medido.** `RunnerOnboardingPanel` é o painel que os TRÊS pontos de
onboarding montam (`TerminalPanel`, `FolderBrowserModal` e o passo `workspace`
do `NewProjectWizard`), e ele tinha uma pergunta só: *"configure a pasta"*.
Com a chave de máquina do ADR 0154, essa pergunta passa a estar errada no caso
mais comum — a máquina já foi pareada, o que falta é o agente estar rodando.
Mandar a pessoa repetir o pareamento que a máquina já tem é o painel
respondendo à pergunta errada, com um fluxo que termina no terminal dela.

**Sete estados, e nenhum vira o outro
([RN-088](parte-01.md#rn-088)/[RN-470](parte-03.md#rn-470)).** `semPapel`
(não perguntamos),
`verificando` (perguntamos e não voltou), `naoSei` (a pergunta falhou),
`semChaveDeMaquina` (voltou e não há), `revogada` (houve e foi revogada),
`pareadaNuncaUsada` (há chave ativa que agente nenhum usou — a ÓRFÃ da
[RN-519](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-519) renascida na espécie nova) e `pareada`. **"Não sei" nunca
vira "não tem"**, e os dois vazios têm textos diferentes porque o gesto é
diferente: um pede parear, o outro explica por que o agente parou de conectar.
A falha é derivada de `isError` e não de haver `status` — erro de rede não tem
status, e derivá-la do status deixaria um `fetch` recusado girando em
"verificando…" para sempre, que é mentira por omissão depois de dez segundos.
`semChaveDeMaquina` é o único que renderiza NADA, e de propósito: o painel
inteiro já É a resposta para "nenhuma máquina pareada".

**Reconhecer NÃO é dizer que o agente está de pé, e a régua é a de sempre.**
`workspaceVerifiedAt` é registro de uma confirmação e não batimento
([RN-468](parte-03.md#rn-468)); chave registrada é a mesma coisa um passo antes — ela
prova que a máquina foi pareada um dia, nunca que há processo vivo agora. Uma
tela que confundisse as duas seria PIOR que a de hoje, porque a de hoje ao
menos não mente. Por isso o tom do alerta é `accent` e nunca `success` (verde
leria como "está de pé" — a mesma aritmética que `AmbienteDoProjeto` faz na
linha do runner), a ressalva é dita em texto ao lado, e quem responde pelo
AGORA continua sendo a `EsperaDoRunner` ([RN-474](parte-03.md#rn-474)), REUSADA e não
reescrita: reconhecida a máquina, o que falta é o agente CONECTAR, que é
exatamente a pergunta dela.

**E há um segundo limite, que o dado impõe e nenhuma redação apaga: a lista é
da CONTA, não deste navegador.** `runner_device_keys` não sabe de que máquina o
navegador está falando, então o mais forte que a tela pode afirmar é *"sua
conta tem uma máquina pareada"* — nunca *"esta máquina está pareada"*. É por
isso que o fluxo do navegador
([ADR 0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md)) **não é
removido**: ele muda de LUGAR, para um `<details>` cujo rótulo nomeia o único
caso em que ainda é a resposta ("estou em outra máquina"). Aposentá-lo é o
`BRB-031`, decisão do mantenedor, e não consequência desta entrega.

**A ESPÉCIE aparece, e o que aparece é o CUSTO dela.** O painel não lista
chaves nem oferece revogação — isso é a tela que o web nunca ganhou, a metade
aberta da RN-519, e é frente própria. O que
ele diz é o que a espécie significa para quem lê: uma chave de máquina atende
TODOS os projetos do dono em modo `runner`, e revogá-la derruba o agente local
em todos eles ([RN-520](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-520), cujo alcance `{projeto, usuário}` não muda
aqui). Sem essa frase, a marca da RN-543 seria decoração.

**O papel é o do ENDPOINT, e a api é a autoridade.** O mínimo sai de
`roleAtLeast` ([RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)) contra `developer`, o
que `RunnerDeviceKeysController` exige nas três rotas — a tela deixa de
perguntar o que a api negaria, e diz por quê UMA vez em TEXTO (`title` em
elemento `disabled` não abre no Chromium). Isso **não é fronteira de
segurança**: quem recusa é o `RolesGuard`. O 403 de verdade cai no MESMO
estado, e não é redundância — o papel lido é o de WORKSPACE e quem autoriza é
o EFETIVO do projeto ([RN-471](parte-03.md#rn-471)), uma SOBREPOSIÇÃO nos dois sentidos:
o proxy evita a pergunta obviamente perdida, a api corrige o proxy.

**Onde aparece, e por que não é igual nos três montadores.** O reconhecimento é
por PROJETO, porque a rota é `GET /projects/:projectId/runner-device-keys` —
existe em `TerminalPanel` e `FolderBrowserModal`, que sempre têm projeto, e no
`NewProjectWizard` só DEPOIS da criação antecipada ([RN-437](parte-03.md#rn-437)). Sem
`projectId` não há a quem perguntar e o painel fica byte a byte como era. A
diferença não é escolha de desenho: é a forma do endpoint.

- **Código:** `apps/web/src/lib/agente-de-maquina.ts` (a derivação inteira —
  `reconhecerAgenteDeMaquina`, `podeLerChavesDeDispositivo`,
  `maquinaJaPareada`), `apps/web/src/components/RunnerOnboardingPanel.tsx:173`
  (as duas consultas e o `ReconhecimentoDeMaquina`),
  `apps/web/src/components/RunnerOnboardingPanel.module.css`
  (`.reconhecimento`, `.gesto`), `apps/web/src/lib/api-client.ts:442`
  (`listRunnerDeviceKeys`), `apps/web/src/lib/api-types.ts:807`
  (`RunnerDeviceKeyListItem`, `RunnerDeviceKeyEspecie`),
  `apps/web/src/locales/{en,pt-BR}/terminal.json` (`agenteDeMaquina.*`)
- **Teste:** `apps/web/src/lib/agente-de-maquina.test.ts` — o caminho feliz
  (ativa e usada, com o uso MAIS RECENTE entre N) e os sete estados sem
  colapso, inclusive a falha SEM status e a chave de PROJETO que NÃO conta;
  `apps/web/src/components/RunnerOnboardingPanel.test.tsx` — o painel
  anunciando o pareamento com o gesto do serviço e o fluxo do ADR 0118
  recolhido e ainda alcançável, as duas ressalvas ("não é agente rodando",
  "é da sua CONTA") mais a do alcance, a chave REVOGADA voltando a mandar
  parear, a consulta falhada dizendo que não sabe, o papel abaixo de
  `developer` sem chamar a rota, e o wizard sem `projectId` sem a quem
  perguntar
- **Lacuna DECLARADA, FECHADA depois pela [RN-552](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-552):** quando esta RN
  fechou, ninguém CRIAVA chave de máquina (era o `install.sh`, ADR 0155 ponto
  4, sessão 6), então esta tela só era exercitável com uma chave registrada à
  mão — a mesma metade que as RN-543 e RN-544 já declaravam. O comando que o painel oferece é
  `brabo-runner service status --project <id>`, a forma que existe HOJE; a
  forma por máquina chega com a unit da sessão 4 — **FECHADO depois
  (AT-106)**: reconhecida a chave de MÁQUINA, o painel oferece
  `brabo-runner service status --machine` (a unit de máquina da
  [RN-545](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-545)), e o bloco da chave de PROJETO segue oferecendo
  `--project <id>`; as duas espécies ativas mostram cada uma o seu. O comando
  continua sendo para a pessoa PERGUNTAR — a tela não afirma a resposta
  (chaves `agenteDeMaquina.comandoDeServico` e
  `chaveDeProjeto.comandoDeServico`, testes em `RunnerOnboardingPanel.test.tsx`
  nos dois ramos e no par). Uma chave de PROJETO ativa
  NÃO muda o painel: é o defeito irmão, um escopo abaixo, e fechá-lo é decisão
  à parte — **FECHADO depois (AT-107)**: o painel reconhece chave de PROJETO
  ativa DESTE projeto (`reconhecerChaveDeProjeto`, `lib/agente-de-maquina.ts`,
  mesma listagem e mesma `queryKey`, nenhuma rota nova), com o mesmo
  vocabulário — tom `accent`, chave registrada não é agente de pé, o gatilho é
  conferir o serviço — e o custo da ESPÉCIE dito: revogar derruba o agente
  NESTE projeto, não em todos. Chave de outro projeto e revogada não contam, e
  o `<details>` do ADR 0118 continua alcançável. E o web continua sem TELA onde listar ou revogar chave de
  dispositivo (a metade aberta da [RN-519](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-519)) — esta entrega consome a
  listagem e não a constrói. **FECHADA depois pela [RN-561](#rn-561)**, que a
  constrói: a seção de Configurações reusa `podeLerChavesDeDispositivo` daqui
  e a MESMA `queryKey`, e por isso revogar por lá invalida o reconhecimento
  deste painel
- **ADR:** [0154](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0154-chave-de-dispositivo-de-maquina.md)
- **Origem:** FASE 30, sessão 7 —
  [o recorte da fase](https://github.com/viralabs-dev/brabo/blob/dev/docs/explanation/fase-30-runner-por-maquina.md)

---

## A conversão de modo deixa de ser um salto no escuro (RN-559, RN-560)

<a id="rn-559"></a>

### RN-559 — A conversão para `mounted` abre o MESMO navegador de pastas do wizard; o ramo `runner` continua digitado, e a tela diz por quê {#rn-559}

`ExecutionModeSection` era o **único dos cinco lugares** do produto em que se
escolhe uma pasta e se digitava o caminho **no escuro** — os outros quatro já
abriam o `FolderBrowserModal` desde a [RN-473](parte-03.md#rn-473)/[RN-504](#rn-504). A
lacuna estava declarada no `CLAUDE.md` e o motivo declarado era do **outro
ramo**: onboardar um runner ANTES de a conversão salvar registra chave num
projeto que ainda não é `runner`, e `ConfirmProjectWorkspaceUseCase` recusa com
400. Nada disso vale para `mounted`, e é isso que esta regra fecha.

**Mesmo componente, mesmo transporte, nenhuma régua nova.** O ramo `mounted`
monta o `FolderBrowserModal` com `origem: { tipo: 'api', workspaceId }` — a
mesma união discriminada que `NewProjectWizard` usa para esse modo
([RN-533](#rn-533)), porque a pasta mora dentro da base do SERVIDOR
([ADR 0141](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0141-base-unica-dos-projetos-montados.md)) e é o servidor quem a
enxerga. Não nasce navegador novo nem endpoint novo, e o navegador **não
garante** caminho válido: quem valida continua sendo
`validarExecutionModeEWorkspacePath` e o CHECK do banco.

**O ramo `runner` NÃO ganha navegador, e isso é decisão, não esquecimento.** O
transporte dele (`{ tipo: 'runner', projectId }`) exige um runner conectado a
ESTE projeto, e um projeto que ainda não é `runner` não tem nenhum — a espera
terminaria num erro com cara de bug. A ordem *"converte, depois onboarda"* segue
sendo decisão de produto à parte. O que muda é a tela passar a **dizer** isso em
texto em vez de só não oferecer botão nenhum, que é a régua do
[ADR 0064](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0064-escopo-de-area-na-cascata-e-o-binding-de-agente-global.md): tira-se o
controle, nunca a informação.

**A base é um estado de QUATRO valores, e eles não colapsam.** A rota
`GET workspaces/:workspaceId/projects-base` ([RN-500](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-500)) pode estar em
voo, ter falhado, ter respondido `null` ou ter respondido um caminho — e cada
um desses tem texto PRÓPRIO, pela régua da [RN-088](parte-01.md#rn-088)/[RN-468](parte-03.md#rn-468):
*"não sei"* nunca vira *"não tem"*. O botão fica na tela apagado nos três
primeiros, com o motivo dito em TEXTO logo abaixo, e não por `title` (que em
elemento `disabled` não abre no Chromium).

| estado da base | o botão | o que a tela diz |
|---|---|---|
| em voo | apagado | "consultando a base de projetos desta instalação" |
| a consulta falhou | apagado | não deu para SABER se ela existe; recarregue |
| respondeu `null` | apagado | esta instalação não declarou base |
| respondeu um caminho | vivo | a base, NOMEADA, e que é nela que o navegador abre |

O modo `mounted` **não sai do seletor** quando a base falta, e essa é a
diferença deliberada em relação ao wizard ([RN-513](#rn-513)): um projeto que
JÁ é `mounted` não pode ver o próprio modo sumir do controle por causa de uma
consulta em voo. O que some é o NAVEGADOR, não a conversão.

**O mínimo é o do ENDPOINT.** `PUT projects/:projectId/execution-mode` e
`GET workspaces/:workspaceId/projects-base` pedem os dois `maintainer`, lido por
`roleAtLeast` sobre a `ROLE_ORDER` e nunca por uma lista de papéis à mão
([RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)) — a seção fazia
`role === 'owner' || role === 'maintainer'`, que acerta por acidente enquanto o
mínimo é alto. Quem não alcança o mínimo não dispara a consulta da base: ela
terminaria num 403 certo, e o *"não sei"* que ela produziria seria sobre a
autorização, não sobre a base.

O valor escolhido no navegador é tratado como valor DIGITADO: ele preenche o
campo e só vai à api quando alguém confirma no botão da seção. Esta seção **não
vira autosave** ([RN-469](parte-03.md#rn-469)).

- **Código:** `apps/web/src/routes/settings/ExecutionModeSection.tsx:68` (os
  quatro estados da base, como união), `:211` (o mínimo por `roleAtLeast`),
  `:220` (a consulta que não sai para quem não alcança `maintainer`), `:260` (a
  derivação dos quatro), `:280` (o que o navegador exige para existir), `:414`
  (o botão, apagado e não escondido), `:423` (o texto do ramo `runner`), `:475`
  (o `FolderBrowserModal` com `origem: { tipo: 'api', workspaceId }`);
  `apps/web/src/locales/pt-BR/settings.json:231` e
  `apps/web/src/locales/en/settings.json:231` (`executionMode.path.*`, os cinco
  textos nos dois idiomas)
- **Teste:** `apps/web/src/routes/settings/conversao-de-modo.test.tsx` — o
  caminho feliz (abrir o navegador, escolher `loja`, o campo preencher e a
  conversão enviar o que foi ESCOLHIDO, só depois do botão), a consulta da base
  FALHANDO (botão inerte, texto próprio, o modal não montando nem à força, e o
  campo continuando editável), a base AUSENTE com texto DIFERENTE do de falha e
  do de carregamento, o ramo `runner` sem botão e com o motivo em texto, e o
  papel abaixo de `maintainer` (controles apagados, valor vigente ainda
  visível, consulta da base não disparada)
- **Lacuna DECLARADA:** o ramo `runner` desta seção **continua digitado no
  escuro** — a lacuna do `CLAUDE.md` encolheu para ele e não fechou. Fechá-la
  exige decidir a ordem "converte, depois onboarda", que é decisão de produto à
  parte e segue sem dono. *Atualização:* a ordem foi decidida e medida na
  [RN-612](#rn-612) — o ramo `runner` ganha o onboarding DEPOIS de salvar, e o
  navegador segue fora por outro motivo, dito lá
- **ADR:** [0111](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0111-conversao-de-execution-mode-de-projeto-existente.md),
  [0141](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0141-base-unica-dos-projetos-montados.md)
- **Origem:** AT-049 (EP-021/HS-033)

<a id="rn-560"></a>

### RN-560 — O aviso da conversão diz o que ela recusa, o que ela leva e o que ela NÃO leva — nomeando o caminho antigo {#rn-560}

O aviso fixo da seção afirmava *"isto migra a pasta de trabalho do agente"*, nos
dois idiomas. `ConvertProjectExecutionModeUseCase` **não tem uma linha que copie
ou mova conteúdo de pasta**: ele move o `permissions.json` (a POLÍTICA, com
allow/deny/ask intactos — [RN-448](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-448)), zera `workspaceVerifiedAt`
([RN-450](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-450)) e `mirrorPath` ([RN-515](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-515)), desprovisiona o
container ao SAIR de `container` ([RN-449](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-449)) e grava o novo
`workspacePath`. `materializarWorkspaceMontado` apenas CRIA a pasta nova
([RN-501](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-501)). O que estiver na pasta antiga — **trabalho não commitado
incluído** — fica lá, órfão.

O órfão já era lacuna declarada no `CLAUDE.md` desde a
[RN-447](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-447)..[450](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-450). O que esta regra fecha não é o órfão: é a
tela afirmando o CONTRÁRIO do que o servidor faz. Isto é correção de afirmação,
não feature — migrar conteúdo entre modos segue fora, sem dono.

**Três fatos, e não um parágrafo**, porque respondem perguntas diferentes:

1. **o que a conversão RECUSA** — dev agent trabalhando ou travado agora vira
   409, e a frase da api é a que aparece no toast (o texto que já existia e
   continua valendo);
2. **o que ela LEVA** — a política do projeto muda de escopo com o conteúdo
   intacto;
3. **o que ela NÃO leva** — o conteúdo da pasta, trabalho não commitado
   incluído, **nomeando o caminho antigo**.

**O aviso NOMEIA o caminho** porque *"fica no disco antigo"* sem dizer QUAL
disco manda a pessoa procurar. O valor está a uma linha de distância
(`project.workspacePath`) e **some da tela** no instante em que a conversão
salva. Quando não há caminho a nomear — o projeto é `container`, e a pasta
antiga é um volume do SERVIDOR — a frase é OUTRA, apontando a pasta gerenciada:
uma variante com `{{caminho}}` vazio diria *"o que estiver em "*, que é a tela
recusando nomear o que sabe. É o caso em que a pessoa tem MENOS como adivinhar.

**Ele não promete detecção.** Perguntar ao disco *"há trabalho não commitado?"*
é I/O por modo e impossível de responder para `runner` do lado da api: a pasta
mora numa máquina que o servidor não enxerga. Não se mede, não se afirma
(ADRs [0041](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0041-base-openai-compativel-e-contrato-de-llm-providers.md)/[0042](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0042-catalogo-vivo-ciclo-de-vida-do-modelo-e-preco-auditavel.md)).
E ele não bloqueia nada: a conversão continua sendo a mesma chamada, com as
mesmas recusas.

O tom do `Alert` passou de `accent` para `warning`, porque o terceiro fato é uma
PERDA de alcance e não uma informação neutra. Segue sem `role="alert"`: é texto
que já estava na tela quando ela abriu, e uma live region assertiva ali viraria
interrupção sem causa.

- **Código:** `apps/web/src/routes/settings/ExecutionModeSection.tsx:333` (os
  três fatos, um por linha), `:337` (a variante que nomeia o caminho antigo × a
  da pasta gerenciada);
  `apps/web/src/locales/pt-BR/settings.json:220` e
  `apps/web/src/locales/en/settings.json:220` (`executionMode.warning.*`, os
  quatro textos nos dois idiomas — `en` é o idioma default do app
  ([RN-425](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-425)), e um aviso honesto só em português é a mesma mentira com
  sotaque)
- **Teste:** `apps/web/src/routes/settings/conversao-de-modo.test.tsx` — o
  caminho feliz (o aviso contendo o caminho antigo E as palavras "trabalho não
  commitado"), a variante sem caminho antigo (projeto `container` apontando a
  pasta gerenciada, e a variante com caminho NÃO renderizada), e a prova
  negativa nos DOIS bundles de idioma: a promessa de migração não sobrevive em
  nenhum deles, e as quatro chaves existem em ambos
- **As consequências CONDICIONAIS (AT-144).** A pergunta que esta regra deixou
  em aberto — listar TODAS as consequências ou só a que enganava — foi decidida
  pelo mantenedor: **só as que valem para ESTE projeto**. O aviso acrescenta,
  depois dos três fatos, uma linha por consequência que se aplica, e NENHUMA
  para o que não se aplica:

  | linha | quando aparece | a mesma condição do caso de uso |
  |---|---|---|
  | o destino de espelho é zerado, NOMEADO | `mirrorPath` preenchido | toda conversão zera ([RN-515](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-515)) |
  | o container registrado é parado e removido | o projeto é `container` HOJE e o ciclo de vida existe fora de `removed` | `removerContainerSeExistir` só roda ao SAIR de `container` ([RN-449](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-449)) |
  | "não consegui ler se há container" | o projeto é `container` e a leitura do ciclo de vida FALHOU | — ("não sei" nunca vira "não tem", [RN-468](parte-03.md#rn-468)) |
  | a pasta confirmada em `<data>` deixa de valer | `workspaceVerifiedAt` preenchido | toda conversão zera ([RN-450](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-450)) |

  A linha do container **não** aparece em `mounted`/`runner` mesmo com container
  registrado, porque o caso de uso não o remove ali — o aviso diria o contrário
  do servidor, que é o defeito que esta regra existe para fechar. Os dados são
  os que a seção já tem (`Project`: `mirrorPath`, `workspaceVerifiedAt`,
  `executionMode`) mais o ciclo de vida do container, que a seção NÃO carregava:
  ele vem da rota que JÁ existe, `GET projects/:projectId/container/lifecycle`
  (`viewer`), consultada só quando o projeto é `container` — nenhum endpoint
  novo. Enquanto a leitura está em voo, a linha simplesmente não aparece.
  - **Código:** `apps/web/src/routes/settings/ExecutionModeSection.tsx:106`
    (`consequenciasCondicionais`), `:122` (`containerParaOAviso`, os três
    estados), `:240` (`cicloQuery`, só em `container`), `:344` (as quatro
    linhas no `Alert`)
  - **Teste:** o describe `AT-144` em
    `apps/web/src/routes/settings/conversao-de-modo.test.tsx` — nenhuma
    condição (nenhuma linha a mais), container registrado, linha `removed` que
    não conta, leitura FALHANDO com texto próprio, `mounted` com espelho (a
    linha do espelho sim, a do container não, e a consulta nem sai), `runner`
    com pasta confirmada (com a data), e as três condicionais em `en`
- **ADR:** [0111](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0111-conversao-de-execution-mode-de-projeto-existente.md)
- **Origem:** AT-050 (EP-021/HS-034); as condicionais, AT-144 (EP-021/HS-034)

## A chave de dispositivo ganha tela, e a tela diz o alcance de revogar (RN-561)

<a id="rn-561"></a>

### RN-561 — A aba Configurações lista e revoga chave de dispositivo, marcando a ESPÉCIE — porque revogar a de MÁQUINA derruba o agente local em TODOS os projetos do dono {#rn-561}

A metade que faltava da [RN-519](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-519), declarada por escrito desde então no
`CLAUDE.md`: *"o que segue aberto é só a TELA: `apps/web` não tem onde listar
nem revogar, então quem quiser revogar chama a rota"*. As duas rotas existem —
o `DELETE` desde o
[ADR 0118](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0118-configuracao-automatica-do-runner-pelo-navegador.md) e o
`GET` desde a RN-519 —, e **tela nenhuma as usava**. Esta RN é a tela, e ela
**não abre rota nova**: o que a listagem já devolve basta para desenhar tudo o
que segue.

**Onde ela mora, e por que de PROJETO.** Ela leva a aba Configurações de 17 para
**18** seções e é a **13ª na ordem de render** (`device-keys`, grupo `pessoas`,
logo depois de `access-tokens` — a vizinha que faz o mesmo com PAT); a ordem do
registro é a MESMA do barrel, porque é ela que o scroll-spy usa. De projeto
porque o endpoint é
`/projects/:projectId/runner-device-keys`: uma tela de CONTA exigiria rota nova,
e o recorte é sobre a que existe.

**A ESPÉCIE aparece, e não é enfeite — é o alcance da única ação irreversível
da tela.** Desde a [RN-543](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-543) a listagem marca `projeto` | `maquina`, e
uma chave de MÁQUINA (`project_id` nulo) **serve todos os projetos do dono** e
por isso aparece na lista de TODOS eles. Mostrá-la sem a marca faria a tela
afirmar que é "a chave deste projeto", e quem clicasse em revogar acharia que
derruba o agente local aqui quando derruba **em todos** — a tela mentiria
justamente sobre o que menos pode errar. A marca é `warning` para a de máquina
e `muted` para a de projeto, e **nunca `success`**: verde leria como "está de
pé", que é a aritmética que a [RN-548](#rn-548) já recusou.

**A confirmação DEPENDE da espécie, e diz também o custo colateral.** Revogar
abre um diálogo com TRÊS frases, e a do meio é a que muda: a de máquina nomeia
*todos os seus projetos em modo runner* (o laço de
`RevokeRunnerDeviceKeyUseCase` sobre `listRunnerModeReachableBy`), a de projeto
nomeia *o projeto dela*. Um texto só para as duas mentiria numa das metades. A
terceira frase é o custo que a [RN-520](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-520) declarou e que esta entrega
**não muda**: o alvo da desconexão é `{projeto, usuário}` e nunca `{chave}`, então
outro runner do mesmo usuário no mesmo projeto também cai — mesmo autenticado
por PAT ou por outra chave — e reconecta sozinho se a credencial dele ainda
valer.

**Uso registrado NÃO é agente de pé, e o vocabulário é o MESMO da RN-548.**
`lastUsedAt` é a classe de dado do `workspaceVerifiedAt` ([RN-468](parte-03.md#rn-468)):
registro de uma confirmação, nunca batimento. A ressalva é dita em TEXTO na
legenda, e a coluna de status fala de REVOGAÇÃO ("ativa"/"revogada", um fato
sobre a linha), nunca de conexão — quem sabe do AGORA continua sendo o canal do
terminal. Inventar um segundo vocabulário para a mesma distinção seria a tela
dizendo a mesma coisa de dois jeitos, e um dos dois envelheceria.

**Cinco estados, e nenhum vira o outro
([RN-088](parte-01.md#rn-088)/[RN-470](parte-03.md#rn-470)).** Nenhuma chave
("Nenhuma chave de dispositivo sua serve este projeto"), chave REVOGADA (que
**continua na lista** por decisão da RN-519 — sumir com a linha faria a tela
afirmar que nunca existiu, e ela não ganha botão porque revogar de novo, ainda
que idempotente na api, sugeriria efeito que não sobrou), `lastUsedAt` NULO (a
chave ÓRFÃ da [RN-473](parte-03.md#rn-473): registrada por uma aba que fechou no meio do
fluxo e nunca usada por runner nenhum — texto próprio, e uma explicação abaixo
da tabela que só aparece quando existe uma, porque explicar o que não ocorre é
ruído), "ainda não carregou" e "não consegui ler". **"Não sei" nunca vira "não
tem".**

**O papel é o do ENDPOINT, e é o EFETIVO do projeto.** O mínimo é `developer`
— o que `RunnerDeviceKeysController` exige nas TRÊS rotas
([RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)) — e a comparação sai da MESMA função
que a RN-548 criou (`podeLerChavesDeDispositivo`, sobre `roleAtLeast`), nunca
uma segunda régua e nunca `role === 'x' || role === 'y'` à mão. O que muda em
relação à RN-548 é o INSUMO: lá o painel lia o papel de WORKSPACE e **declarava**
a lacuna, porque monta em lugares que não buscam `project_members`; aqui os
dados estão à mão — a seção mora na mesma aba que `MembersSection`, com a MESMA
`queryKey`, e o react-query deduplica —, então o papel é composto como no caso
de uso (`projectRole ?? workspaceRole`, uma SOBREPOSIÇÃO nos dois sentidos,
[RN-471](parte-03.md#rn-471)) e a lacuna **fecha** em vez de se repetir. Papel AUSENTE não
é papel INSUFICIENTE: enquanto a lista de membros está em voo a tela diz que
está verificando, e não acusa quem lê de não alcançar `developer`. Quem não
alcança **continua vendo** a seção inteira, o que uma chave de dispositivo é e o
que revogar a de máquina custa — some o CONTROLE, nunca a INFORMAÇÃO
([ADR 0064](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0064-escopo-de-area-na-cascata-e-o-binding-de-agente-global.md)) —, e o motivo é dito UMA vez
em TEXTO (`title` em elemento `disabled` não abre no Chromium). Como as três
rotas pedem o MESMO papel, quem não alcança também não vê a LISTA: a tela deixa
de perguntar o que a api negaria, em vez de transformar um 403 previsível em
"não consegui ler". Isto **não é fronteira de segurança** — quem recusa é o
`RolesGuard`.

**Uma por vez, e por isso não há desfecho de lote.** A tela não oferece
"revogar todas", então a régua da [RN-469](parte-03.md#rn-469) — ação de UI que vira N
chamadas não é transação, e a tela diz isso — não se aplica: oferecer o lote
criaria um desfecho parcial a narrar para uma ação que ninguém pediu. Falha na
revogação mostra a frase da PRÓPRIA api e a linha **continua** na lista.

- **Código:** `apps/web/src/routes/settings/RunnerDeviceKeysSection.tsx:76`
  (a seção inteira; o papel efetivo em `:107`, a consulta em `:130`, a
  confirmação por espécie em `:326`);
  `apps/web/src/routes/settings/sumario.ts:62` (a entrada nova, 13ª na ordem de
  render, das 18);
  `apps/web/src/routes/ProjectSettingsTab.tsx:86` (a composição, na MESMA
  ordem); `apps/web/src/locales/{en,pt-BR}/settings.json`
  (`runnerDeviceKeys.*`). Consome `listRunnerDeviceKeys`/
  `revokeRunnerDeviceKey` (`apps/web/src/lib/api-client.ts:431`) e
  `podeLerChavesDeDispositivo` (`apps/web/src/lib/agente-de-maquina.ts:68`) sem
  alterar nenhum dos dois
- **Teste:** `apps/web/src/routes/settings/chaves-de-dispositivo.test.tsx` — as
  duas espécies marcadas na mesma lista; a revogada que fica, marcada e sem
  botão; a órfã com texto próprio e a explicação que NÃO aparece sem ela; vazio
  e falha com textos diferentes; a ressalva de que uso registrado não é agente
  de pé; o aviso de alcance nas DUAS espécies, com a chamada saindo só depois
  de confirmar; cancelar sem revogar; a falha trazendo a frase da api com a
  chave ainda na lista; `viewer` sem chamar a rota e com o motivo em texto; a
  sobreposição do papel de projeto nos DOIS sentidos; e o papel ausente que
  diz "verificando" em vez de acusar
- **Fica declarado e NÃO fecha:** (1) o **alvo da revogação** continua sendo
  `{projeto, usuário}` e nunca `{chave}` — a tela DIZ isso e não muda, porque
  mudar exige coluna nova em `runner_socket_tickets` e contrato novo de auth
  (RN-520), frente própria com ADR; (2) numa instalação **sem PROJETO**, a
  chave de máquina recém-criada pela [RN-552](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-552) segue **inalcançável**:
  as duas rotas são de projeto, e sem projeto não há a quem perguntar — FECHOU
  na [RN-611](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-611), com rota e seção por CONTA; (3) a
  visão de `maintainer` (listar/revogar de qualquer usuário) continua FORA por
  decisão da RN-519, não por omissão desta tela; (4) sem E2E de navegador — o
  que se prova aqui é o que a tela AFIRMA, e isso a suíte de componente prova
- **Origem:** AT-012 (EP-003/HS-007)

---

<a id="rn-568"></a>

### RN-568 — A presença de QA, SecOps e dos membros de área no painel do time é decidida pela sessão INTEIRA, não pela janela de 200 eventos {#rn-568}

A Visão geral e a aba Executores montam a roster com `deriveAgentRoster` sobre
os ÚLTIMOS 200 eventos da sessão (`useSessionEvents`, `latest: true`). Dois dos
fatos de presença saíam dessa janela: `gatesEverOpened` (qa e secops entram
quando algum `pr.gate_changed`/`infra.gate_changed` já aconteceu) e
`delegatedSubagents` (membro de área entra com delegação registrada). Os dois
eventos são dos primeiros de uma execução — numa sessão longa eles saem da
janela, e QA, SecOps e `qa-automacao` **sumiam do painel** de uma execução que
continuava rodando. É a mesma classe de defeito que já tinha sido fechada para
`executionActivated`, e o resumo do workspace ([RN-090](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-090)) já agregava
os dois fatos sobre a sessão inteira (`bool_or` e `selectDistinct` em
`projects-summary.repository.ts`) — as duas telas o carregavam e ignoravam
esses dois campos.

**A regra:** `deriveAgentRoster`/`rosterFactsFromEvents` aceitam um
`agregado` OPCIONAL (`AgregadoDaSessao`), e as duas telas o preenchem com o
resumo. Quatro decisões, cada uma com motivo:

1. **Ausente é "não li", nunca "não houve".** Sem resumo carregado (primeiro
   paint, erro), o fato sai só da janela, exatamente como antes. Leitura
   ausente nunca vira "QA não está aqui".
2. **O agregado SOMA à janela, não a substitui** (OU lógico no gate, união nas
   delegações). Os dois fatos são MONÓTONOS dentro de uma sessão — gate que
   abriu não desabre, delegação registrada não some —, então a janela só
   produz falso NEGATIVO, nunca falso positivo. Um `false` agregado que
   discorde de um gate VISTO na janela é resumo atrasado (as duas leituras
   têm cadências próprias de poll), e não pode esconder QA.
3. **Só vale quando o resumo é da MESMA sessão que a tela lê**
   (`latestSessionId === sessionId`). O resumo agrega a sessão mais RECENTE
   do projeto; a Visão geral lê essa mesma sessão, mas a aba Executores lê a
   sessão de EXECUÇÃO vigente ([RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139)). Uma ideação aberta depois
   faz as duas divergirem, e aí o agregado seria de OUTRA sessão — a tela
   volta a decidir só pela janela.
4. **Só a PRESENÇA muda.** `rosterFromFacts` (a regra única, compartilhada com
   o card do dashboard) fica intacto, e o STATUS de cada agente (`gateStatus`,
   `subagentStatus`) continua lido da janela. Nenhuma requisição nova e o teto
   de 200 não muda.

`delegatedSubagents` entrou pelo MESMO molde porque cabe sem mudar regra: a
tabela `delegations` que o resumo lê e os eventos `delegation.*` que a janela
lê nascem juntos em `RecordDelegationUseCase` (uma linha, um evento, os três
desfechos), então os dois conjuntos descrevem a mesma coisa.

**`executionActivated` (AT-130).** É o terceiro fato do mesmo molde: a aba
Executores o lia do resumo SEM a guarda do item 3, então com uma sessão mais
nova que a de execução o resumo (dela) dizia `false` e os dev agents sumiam —
ou `true`, e apareciam sem prova. Agora ele vai em `agregado.executionActivated`
só quando `latestSessionId === sessionId`, e `deriveAgentRoster` o SOMA (OU
lógico, monótono) à janela e ao parâmetro, que também passa a olhar
`execution.activated` nos eventos. Sem campo novo na API. Testes:
`ProjectExecutorsTab.test.tsx` (resumo de OUTRA sessão, nos dois sentidos).
**Segue aberto:** com a sessão de execução longa E o resumo de outra sessão, o
evento pode ter saído da janela e a aba volta a decidir só por ela — é o custo
da guarda, o mesmo dos outros dois fatos.

- **Código:** `apps/web/src/lib/agent-status.ts:356` (`AgregadoDaSessao`),

- **Código:** `apps/web/src/lib/agent-status.ts:356` (`AgregadoDaSessao`),
  `:296` (o parâmetro opcional de `rosterFactsFromEvents`), `:304` (a união das
  delegações), `:312` (o OU do gate), `:410` (o parâmetro repassado por
  `deriveAgentRoster`); `apps/web/src/routes/ProjectOverviewTab.tsx:97` e
  `apps/web/src/routes/ProjectExecutorsTab.tsx:111` (o agregado com a guarda
  de sessão)
- **Teste:** `apps/web/src/lib/agent-status.test.ts:628` (o bloco inteiro:
  `:633` gate fora da janela traz QA/SecOps com status da janela, `:658` sem
  agregado a janela decide sozinha, `:676` `false` agregado não esconde gate
  visto na janela); `apps/web/src/routes/ProjectExecutorsTab.test.tsx:385`
  (QA e membro de área voltam pelo resumo), `:397` (resumo de outra sessão não
  decide); `apps/web/src/routes/ProjectOverviewTab.test.tsx:301` (SecOps volta
  pelo resumo)
- **Origem:** AT-047 — a lacuna declarada no `CLAUDE.md` e nos comentários das
  duas telas

<a id="rn-572"></a>

### RN-572 — A árvore do time traduz todo tipo `dev.*` que o engine emite, e só diz trabalho em curso onde o painel diz `trabalhando` {#rn-572}

Numa instalação real (14/09) os dev agents "não saíram do *começou a task*".
O event log tinha `dev.started` seguido de `dev.blocked_by_container`, com o
`reason` por extenso ([RN-502](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-502)). A árvore do time
(`timeline-tree.ts`) não tinha tradução para o bloqueio — o que não está em
`TRADUCAO` é descartado —, então o ramo parava no marco anterior e a frase do
presente afirmava trabalho sobre um agente parado. O painel do time, na mesma
tela de execução, já dizia `aguardando` para o mesmo evento
(`DEV_STATUS_EVENTS`, [RN-411](https://github.com/viralabs-dev/brabo-ci/blob/dev/scripts/ci/docs/business-rules/ci.md#rn-411)): duas telas, duas tabelas, e só uma
delas estava coberta pela comparação com o vocabulário do engine.

**A regra**, em três partes:

1. **Todo tipo `dev.*` que o engine emite tem decisão na árvore** — traduzido
   em `TRADUCAO` ou declarado em `TRADUCAO_FORA` com o motivo (vazia hoje).
   Omitir deixou de ser possível: `scripts/ci/vocabulario-de-eventos-dev.spec.ts`
   deriva o vocabulário do engine pelo mesmo extrator do inventário de eventos
   e reprova, nomeando o tipo, o que faltar; e reprova também o tipo `dev.*`
   traduzido que o engine não emite. Na primeira rodada ele achou DOIS
   faltando (`dev.blocked_by_container` e `dev.error`) e UM sobrando
   (`dev.rearmed`, que a api grava com ator `user` e que por isso nunca chegou
   a ramo nenhum — a árvore só pendura marco de ator `agent`).
2. **Se o último marco de um dev agent é trabalho em curso não se decide na
   árvore.** Para marco `dev.*`, o ramo só fica ATIVO quando o painel dá
   `trabalhando` ao mesmo evento (`statusDoEventoDev`, lido de
   `DEV_STATUS_EVENTS`). `aguardando`, `ocioso`, `falhou` e `travado` deixam o
   ramo parado — e com eles `dev.idle`, `dev.blocked`, `dev.awaiting_gate`,
   `dev.awaiting_approval` e `dev.idle_tripped`, que antes também contavam
   como ativos. Tipo `dev.*` que o painel não decidiu NÃO vira ativo: na
   dúvida a tela não afirma trabalho.
3. **O bloqueio por container é marco próprio** (`espera`, cor de
   `warning`, a mesma do gate), com o `reason` do engine como detalhe — é ele
   que diz o que fazer. E `dev.started` deixa de dizer "começou a task":
   medido no engine, ele sai ao RECEBER a ordem de trabalhar, antes de
   `try_claim` (`DevAgentServer.handle_cast(:work)`); passa a dizer
   "procurando task", e quem afirma a task é `dev.working`, que agora mostra o
   título dela.

**O que esta regra NÃO faz, e por quê:**

- **`container.start_failed` não entra na árvore.** É a razão do bloqueio,
  mas o ator é `system` (`action-executor`): pendurá-lo no ramo de um dev
  agent seria inventar autoria, e o único outro lugar da estrutura, o
  `tronco`, NÃO É RENDERIZADO por consumidor nenhum (medido:
  `AgentTimelineTree` e a seção Atividades do `Shell` leem só `ramos`). O
  evento continua no log cronológico, a um clique, e o ramo bloqueado já diz,
  pelo `reason`, que falta subir o container.
- **Os rótulos da árvore ficaram em pt-BR fixo nesta correção** — migrá-los
  era mudança da tela inteira. A AT-134 fez essa migração depois, e ela NÃO
  mexeu na regra acima: a DECISÃO por tipo (se vira nó, que `MarcoTipo`, que
  detalhe) continua em `TRADUCAO`, no código, e é ela que o spec compara com o
  engine; só o TEXTO saiu, como CHAVE (`ChaveDeRotulo`) resolvida em
  `executors:timelineTree.label.*`, com a frase do presente em
  `timelineTree.now.*` e o detalhe de origem em `timelineTree.detail.origin`,
  nos dois idiomas (`en` é o default, [RN-425](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-425)). `montarArvore`
  recebe o idioma como argumento (`getFixedT`), e os dois consumidores
  (`AgentTimelineTree` e a seção Atividades do `Shell`) o passam do
  `useTranslation` — trocar de idioma refaz a árvore. Uma chave que a tabela
  usa sem texto em um dos dois locales reprova em `timeline-tree.test.ts`.

- **Código:** `apps/web/src/lib/timeline-tree.ts:164` (`TRADUCAO`), `:209`
  (`dev.started`), `:212` (`dev.working` com o título), `:230`
  (`dev.blocked_by_container`), `:235` (`dev.error`), `:255`
  (`TRADUCAO_FORA`), `:307` (o `ativo` lido do painel), `:96`
  (`ChaveDeRotulo`, AT-134), `:135` (`tradutorDaArvore`);
  `apps/web/src/locales/{en,pt-BR}/executors.json` (`timelineTree.label`,
  `timelineTree.now`, `timelineTree.detail`);
  `apps/web/src/lib/agent-status.ts:134` (`statusDoEventoDev`);
  `apps/web/src/components/AgentTimelineTree.module.css` (`.espera`)
- **Teste:** `scripts/ci/vocabulario-de-eventos-dev.spec.ts:300` (o bloco da
  árvore: `:308` todo tipo do engine decidido, `:324` nada traduzido que o
  engine não emite, `:342` nada nos dois lados);
  `apps/web/src/lib/timeline-tree.test.ts:130` (a sequência medida:
  `dev.started` + `dev.blocked_by_container` deixa o ramo parado com o
  motivo — caso de falha), `:149` (`dev.started` não afirma task), `:156`
  (estados que o painel não chama de trabalho deixam o ramo parado; `dev.working`
  segue ativo com o título), `:168` (`dev.error` encerra com o motivo), `:367`
  (AT-134: toda chave usada tem texto nos dois locales, as subárvores têm as
  mesmas chaves, e o idioma passado vence o ativo)
- **Origem:** AT-087 — instalação real de 14/09; o i18n dos rótulos, AT-134

## O repositório nasce no aceite do handoff ao Arquiteto, e a execução não começa sem ele (RN-582)

<a id="rn-600"></a>

### RN-600 — A criação de projeto pela tela não manda o corpo que a api já se sabe que recusa, uma criação por vez, e a recusa aparece na tela {#rn-600}

No teste do dono em 26/09 a api registrou 11 `POST /workspaces/:id/projects →
400` em ~4 s, e o mesmo projeto `runner`, criado pela api com caminho, saiu 201.
Medido por leitura e reproduzido no vitest do assistente: não há retry
automático (`createProject` é chamada direto, sem `useMutation`), então cada
POST foi um CLIQUE. A causa provável é o "Procurar pasta..." do modo `runner`,
que CRIA o projeto antecipadamente ([RN-437](parte-03.md#rn-437)): no passo de detalhes o
campo de caminho fica ACIMA do nome, e clicar antes de digitar o nome mandava
`{ name: '', slug: '', executionMode: 'runner', workspacePath:
'/workspace-a-confirmar' }` — o `CreateProjectDto` recusa `name` com menos de 2
caracteres e `slug` fora do kebab-case —, e a falha virava só o toast "Não deu
para preparar a navegação de pasta agora", sem motivo; clicar de novo era a
única resposta que a tela sugeria. Um nome de UMA letra passava no `Continuar`
e voltava 400 no "Provisionar" pelo mesmo `MinLength(2)`.

Três metades, todas na tela (a api está certa em recusar):

1. **Não mandar o que já se sabe recusado.** `nomeAceitoPelaApi` espelha o DTO
   (2+ caracteres, recortado, e slug não vazio) e passa a ser o gate de nome do
   passo de detalhes. No modo `runner`, "Procurar pasta..." fica INERTE enquanto
   o nome não passa, ou enquanto um caminho DIGITADO não é plausível
   (`caminhoLocalParecePlausivel`), e o motivo é dito em texto abaixo do campo
   (`procurar-bloqueado`, ADR 0064). Caminho VAZIO continua não bloqueando — o
   placeholder provisório da [RN-437](parte-03.md#rn-437) cobre. É a revisão da frase
   "nunca bloqueando o clique" da RN-437, que falava do CAMINHO e não previu o
   nome vazio. O nome vai recortado no corpo.
2. **Uma criação por vez.** `criacaoEmVoo` (um `useRef`) trava os DOIS caminhos
   que criam — "Procurar pasta..." e "Provisionar" —, porque o `disabled` só
   chega ao botão no render seguinte. No jsdom o `disabled` já segura o segundo
   clique; a ref é o que segura dois eventos no mesmo quadro do navegador.
3. **A recusa na tela.** A falha 400 da criação antecipada passa a pôr a frase
   da api (`mensagemDaApi`, lista do `class-validator` juntada) no MESMO
   `Alert` do passo que o "Provisionar" já usava ([RN-170](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-170)); outros
   erros seguem só com o toast.

**O que não foi medido:** o log da api do teste do dono não sobreviveu ao
reinício do container, então o CORPO de cada um dos 11 POSTs não foi visto — a
causa acima é a única que a leitura do código e o vitest reproduzem, e não
prova que foi ela. A adjacência ([RN-437](parte-03.md#rn-437)) segue como era: o projeto
criado antecipadamente com o caminho provisório não recebe o caminho refinado
depois no "Provisionar" (ele é REUSADO, não atualizado) — quem o corrige é o
runner ao conectar (RN-423).

- **Código:** `apps/web/src/lib/wizard.ts:108` (`nomeAceitoPelaApi`);
  `apps/web/src/routes/NewProjectWizard.tsx:112` (`montarPayloadDeCriacao`),
  `:202` (`criacaoEmVoo`), `:321` (`bloqueioDoProcurarNoRunner`), `:486`
  (`handleProcurarPasta`), `:536` (`handleConfirm`)
- **Teste:** `apps/web/src/routes/NewProjectWizard.test.tsx:850` (describe
  `criar projeto sem rajada de 400` — sem nome, 11 cliques e nenhum POST;
  caminho relativo; nome de uma letra; nome recortado; três cliques no mesmo
  quadro criam um; a recusa da api na tela); `apps/web/src/lib/wizard.test.ts:210`
  (`nomeAceitoPelaApi`)
- **Origem:** AT-215 (teste do dono, 26/09), irmã da AT-214

## A conversão de modo deixa de ser um salto no escuro (RN-559, RN-560)

<a id="rn-612"></a>

### RN-612 — Converter para `runner` é converte, DEPOIS onboarda: salvar monta o painel de onboarding do projeto agora `runner`, e o navegador de pastas fica fora por construção {#rn-612}

O ramo `runner` da conversão era digitado no escuro ([RN-559](#rn-559)) porque a
ordem estava indecidida: onboardar ANTES de salvar registra chave num projeto
que ainda não é `runner`, e `ConfirmProjectWorkspaceUseCase` recusa a
confirmação com 400. A decisão do mantenedor foi **medir** a outra ordem com a
chave de MÁQUINA ([RN-543](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-543)/[RN-548](#rn-548)) e implementar se o
atrito fosse aceitável. A medição foi feita no CÓDIGO (sem subir o ambiente) e
deu isto:

| quem vai atender o projeto | o que acontece depois de salvar | gestos |
|---|---|---|
| agente de MÁQUINA esperando (zero projetos `runner`, [RN-550](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-550)) | a próxima consulta de `GET /runner/projects` o lista e o agente conecta sozinho — cadência 15/30/60 s de `espera-de-projetos.ts` | **zero**, em até 60 s |
| agente de MÁQUINA já atendendo OUTRO projeto | a lista é lida UMA vez, no start, com conexão viva (RN-550) — o projeto novo **não** entra | **um**: reiniciar o serviço |
| nenhuma chave de máquina | o mesmo pareamento da criação de projeto ([RN-473](parte-03.md#rn-473)) | parear + um comando |

Nos três casos o atrito é o da criação de projeto ou menor, então a conversão
passa a ser **dois passos na mesma seção**: salvar para `runner` monta, logo
abaixo, o MESMO `RunnerOnboardingPanel` da aba Código e do wizard, com o
`projectId` de um projeto que agora É `runner` — o reconhecimento da máquina
pareada, a `EsperaDoRunner` e o pareamento do ADR 0118 vêm junto, sem régua
nova. Acima do painel a seção DIZ a assimetria do agente de máquina (espera
sozinho × reinício), com o comando de reinício das duas plataformas
(`systemctl --user restart brabo-runner.service`,
`launchctl kickstart -k gui/$(id -u)/dev.brabo.runner`): a tela não sabe se o
agente tem outra conexão viva, então nomeia os dois casos em vez de afirmar um.

O painel aparece quando o projeto SALVO é `runner`, sem troca de modo pendente
no seletor, e com a pasta ainda não confirmada — ou até o fim da visita em que
a conversão salvou, para a `EsperaDoRunner` mostrar a confirmação em vez de
sumir no instante em que ela chega. Um projeto `runner` já confirmado não o
ganha.

**O caminho digitado é PROVISÓRIO, e a tela diz isso.** Quem decide a pasta de
um projeto `runner` é o runner: a confirmação SOBRESCREVE `workspacePath`
([RN-423](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-423)), e o agente de máquina nem olha o valor digitado — ele usa
`<base>/<workspaceDirName>` ([RN-544](https://github.com/viralabs-dev/brabo-runner/blob/dev/docs/business-rules/runner.md#rn-544)). O campo continua obrigatório
porque o CHECK do banco pede caminho não-nulo fora de `container`; a seção não
inventa placeholder.

**O navegador de pastas continua FORA do ramo `runner`, e agora pelo motivo
certo.** Não é mais a ordem: é que o transporte `{ tipo: 'runner', projectId }`
exige um runner conectado a ESTE projeto, e um runner conectado já confirmou a
PRÓPRIA pasta (`--dir`, ou a derivada da base). Escolher outra ali seria uma
segunda conversão `runner → runner` que a próxima reconexão desfaria. Oferecer o
botão seria um controle que não controla nada; a seção diz isso em texto
([ADR 0064](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0064-escopo-de-area-na-cascata-e-o-binding-de-agente-global.md)).

- **Código:** `apps/web/src/routes/settings/ExecutionModeSection.tsx:304`
  (`mostrarProximoPasso`), `:317` (`setConvertidoParaRunner`, a visita em que a
  conversão salvou), `:452` (o bloco do próximo passo), `:487`
  (`RunnerOnboardingPanel`, o mesmo da aba Código);
  `apps/web/src/locales/pt-BR/settings.json:249` e
  `apps/web/src/locales/en/settings.json:249` (`executionMode.nextStep.*`) e
  `:238` (`executionMode.path.runnerTyped`, reescrito); a cadência medida em
  `apps/runner/src/espera-de-projetos.ts:60` (`CADENCIA_DA_ESPERA_MS`) e a
  lista lida uma vez em `apps/runner/src/index.ts` (`rodarComoAgenteDeMaquina`)
- **Teste:** o describe `RN-612` em
  `apps/web/src/routes/settings/conversao-de-modo.test.tsx` — o caminho feliz
  (antes de salvar não há painel; salvar monta o próximo passo, com o comando de
  reinício, e o painel pergunta pelas chaves DESTE projeto), a chave de máquina
  reconhecida, o caso de falha (projeto `runner` já confirmado não ganha o
  passo), o rascunho de outro modo escondendo o passo, e o texto em `en`
- **Lacuna DECLARADA:** o reinício do agente de máquina que já atende outro
  projeto continua sendo um gesto no terminal — repesquisar a lista com conexão
  viva foi recusado pela RN-550, e esta regra não reabre isso. E a medição é de
  CÓDIGO, não de tela: o ambiente não foi subido
- **ADR:** [0111](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0111-conversao-de-execution-mode-de-projeto-existente.md),
  [0154](https://github.com/viralabs-dev/brabo/blob/dev/docs/adr/0154-chave-de-dispositivo-de-maquina.md)
- **Origem:** AT-143 (EP-021/HS-033)

---

## O repositório nasce no aceite do handoff ao Arquiteto, e a execução não começa sem ele (RN-582)

<a id="rn-614"></a>

### RN-614 — A tela mostra o motivo da política e a raiz do escopo, numa frase só, nos dois lugares {#rn-614}

A [RN-567](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-567) pôs no `proposed_action.created` a regra que decidiu
(`reason`) e a [RN-609](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-609) pôs a raiz do escopo (`scopeRoot`, só em
`terminal`) — e as duas declararam que a tela não mudava. Quem auditava pela
tela uma ação que PASSOU continuava sem saber qual regra a deixou passar.

**A regra:** o dado aparece em DOIS lugares (decisão do mantenedor), e os dois
dizem a MESMA frase, montada por UMA função, `fraseDaDecisaoDaPolitica`:

- a **linha do evento no painel de log** — `classifyEvent` ganha o ramo de
  `proposed_action.created` (tipo `permission`, `bad` quando negada), com o
  desfecho da política e, depois do travessão, a frase;
- o **`ApprovalCard`**, numa linha própria logo abaixo da frase do que
  acontece ([RN-096](https://github.com/viralabs-dev/brabo/blob/dev/docs/business-rules/produto.md#rn-096)) — nunca dentro do payload colapsado.

A ação (`proposed_actions`) não guarda nenhum dos dois campos: a tela os lê do
EVENTO, que ela já carrega (`decisaoDaPoliticaDaAcao`, pelo `actionId`). Por
isso o card tem TRÊS estados, que não colapsam: tela que não lê o event log
(o painel "precisa de você", PRs, containers) não passa o dado e o card CALA;
tela que lê (o chat da sessão e a fila da aba Aprovações, ambos sobre a sessão
mais recente) e não achou o evento na janela carregada diz *"fora dos eventos
carregados nesta tela"*; e o evento achado dá a frase. A aba Insights não tem
`ApprovalCard` — hipótese do Psicólogo não é `proposed_action`.

**Desde a AT-336 ([RN-656](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-656)), cada card da aba Aprovações tem o
PRÓPRIO motivo**, lido pela ação quando o log carregado não o cobre; o
parágrafo seguinte é o estado da AT-333, que ela substituiu — a nota única
sobra só para a leitura que FALHA. Desde a AT-340 o mesmo vale para os cards
das pendências de OUTRAS sessões no chat ([RN-626](parte-05.md#rn-626)), que antes
calavam: o log do fio nunca cobre ação de outra sessão.

**Na AT-333, a fila da aba Aprovações passou a dizer a lacuna UMA vez.** A fila é a
do PROJETO ([RN-638](parte-05.md#rn-638)) e os eventos são os de UMA sessão, então ali o
*"fora dos eventos carregados"* saía em quase todo card — verdade repetida por
card, a ferramenta se explicando. A api não expõe o motivo por ação (a ação
não o guarda, e a leitura de eventos não filtra por `actionId`: medido), e
buscar sem janela exigiria endpoint novo. A aba passa então a CONTAR as
pendentes sem o evento e a dizer, numa nota acima da fila, quantas são e por
quê (*"destas N ações"*, ou *"de N das M ações abaixo"*), no molde da
[RN-180](parte-02.md#rn-180); o card dessas cala (o estado "tela que não lê"), e o card
cujo evento está carregado continua mostrando a frase. A nota só conta com o
log em mãos: antes de os eventos chegarem ela não afirma nada. O chat da
sessão segue com os três estados por card — ali o recorte é o do próprio fio.

**Ausente não é "sem motivo", e o absoluto nunca aparece.** Evento anterior à
RN-567 diz *"motivo da política não registrado"*; `terminal` anterior à RN-609
diz *"raiz do escopo não registrada"*; outro tipo, sem `scopeRoot`, não fala de
raiz (o escopo só é consultado em `terminal`). As quatro âncoras têm texto
próprio — pasta gerenciada, segmento dentro da base de projetos, nome da pasta
na máquina do runner, e `indisponivel` (*"sem forma relativa"*, sem segmento).
Âncora que a tela não conhece diz que não conhece, e não imprime o segmento: a
tela não reconstrói caminho nenhum. As frases estão em `en` e `pt-BR`
(`approvals.json`, chave `politica`).

- **Código:** `apps/web/src/lib/decisao-da-politica.ts:111`
  (`fraseDaDecisaoDaPolitica`), `:65` (`lerDecisaoDaPolitica`), `:124`
  (`decisaoDaPoliticaDaAcao`), `:145` (`linhaDoEventoDePolitica`);
  `apps/web/src/lib/activity.ts:804` (o ramo de `proposed_action.created`);
  `apps/web/src/components/ApprovalCard.tsx:272` (a linha do card);
  `apps/web/src/routes/session-timeline-montagem.tsx:825` e
  `apps/web/src/routes/ProjectApprovalsTab.tsx:311` (`decisoesDaPolitica`, desde a
  AT-336 por `useDecisoesDaPolitica`) e `:499` (quem passa o dado)
- **Teste:** `apps/web/src/lib/decisao-da-politica.test.ts:43` (as âncoras,
  `:43`/`:54`/`:65`/`:76`), `:87` (evento antigo), `:102` (âncora desconhecida
  sem vazar caminho), `:114` (os dois idiomas), `:144` (a linha do log É a
  frase do card); `apps/web/src/components/ApprovalCard.test.tsx:733` (o card
  usa a mesma função, e os três estados);
  `apps/web/src/routes/ProjectApprovalsTab.test.tsx:304` (desde a AT-336, a nota
  conta só a leitura que falha)
- **Origem:** AT-148 (EP-025/HS-043); a nota da fila, AT-333; o motivo por cartão, AT-336

---

## O idioma das respostas dos agentes (RN-618..620, RN-622..624, ADR 0177)

<a id="rn-620"></a>

### RN-620 — A barra da sessão mostra o idioma das respostas de QUEM VÊ, com a origem, e trocar ali é o override só daquela pessoa naquela sessão {#rn-620}

1. **Ao lado do seletor de modelo, em outro escopo.** O modelo da barra é da
   SESSÃO e vale para todos; o idioma é da PESSOA (`GET
   .../sessions/:sessionId/response-language`, resolvido para quem chama,
   [RN-618](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-618)). Trocar ali é o override por sessão — decisão do
   mantenedor, AT-169 resposta 2 — e nunca mexe no de outro participante nem
   na Conta.
2. **Nunca o valor sem a origem** (a régua da [RN-470](parte-03.md#rn-470)): "fixado
   por você nesta sessão", "escolhido por você na Conta", "detectado pelas
   suas mensagens e confirmado por você" e "o idioma da interface" são
   quatro textos, e nenhum colapsa em outro. Carregando e falhou também têm
   texto próprio — a falha não finge um idioma. O detectado nunca vira
   afirmação sobre a pessoa ("você é brasileiro"), só sobre as mensagens
   (AT-080).
3. **"Seguir a Conta" solta o override** (`language: null`) e diz em QUE
   idioma isso dá — a mesma cadeia sem o degrau da sessão, derivada no
   cliente da cadeia que a rota já devolve, sem endpoint novo. "Outro
   código…" abre um campo que só fixa no botão (RN-469), e a recusa da api
   chega no toast com a frase dela. Um link leva à Conta, onde mora a
   escolha que vale em todas as sessões.
4. **Quem troca**: o mínimo do `PUT` (`developer`), por `roleAtLeast` sobre o
   papel de WORKSPACE (a lacuna declarada das telas que não buscam
   `project_members`). Abaixo dele o valor e a origem continuam na barra, o
   seletor fica inerte e o motivo vem em texto.
5. **O que a barra NÃO afirma**: nunca "os agentes respondem em X" como fato
   sobre a pessoa — só o efetivo e a origem. Desde a [RN-622](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-622) esse
   efetivo chega ao modelo nas mensagens de quem vê, e o aviso "ainda não
   chega aos agentes" saiu da linha de origem. A linha trunca nos 60px da
   barra e leva o texto inteiro no `title` — o texto está na tela, o `title`
   só devolve o que as reticências cortaram.
6. **Na barra estreita, o idioma MUDA de lugar e não some** (AT-317). A barra
   se arruma pela PRÓPRIA largura (`modoDaBarra`, medida por
   `ResizeObserver`; largura desconhecida é a barra completa): a partir de
   1720px tudo fica em linha; abaixo disso modelo, idioma e orçamento viram UM
   controle cujo gatilho resume o modelo e o código do idioma (abaixo de 920px
   só o ícone, com nome acessível), e o painel dele traz o indicador inteiro
   com a origem QUEBRANDO em vez de cortar. A pergunta da detecção
   ([RN-624](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-624)) mora no painel, e enquanto existe o gatilho ganha uma
   marca e o nome acessível a anuncia. O título da sessão é o único item que
   encolhe (com piso e o nome inteiro no `title`), e os botões não quebram
   linha — "Encerrar" vira ícone com nome acessível só na barra mínima.

- **Código:** `apps/web/src/routes/SessionLanguageIndicator.tsx:72`
  (`SessionLanguageIndicator`), `:29` (`idiomaSemOverride`), `:163`
  (`origemPorExtenso`), `:215` (`podeTrocar`);
  `apps/web/src/routes/SessionTopbar.tsx:260` (`SessionLanguageIndicator`),
  `:128` (`modoDaBarra`), `:377` (`AjustesAgrupados`);
  `apps/web/src/lib/modo-da-barra-da-sessao.ts:35` (`modoDaBarra`)
- **Teste:** `apps/web/src/routes/SessionTopbar.test.tsx:174` (a barra de
  1440px não é completa), `:191` (agrupa, e o painel traz idioma com origem),
  `:236` (barra mínima com nome acessível), `:256` (pergunta pendente marca o
  controle), `:273` (leitura do idioma falhada — caso de falha);
  `apps/web/src/routes/SessionLanguageIndicator.test.tsx:99`
  (efetivo com origem e o link, sem o aviso antigo), `:112` (o detectado não vira
  "escolhido"), `:126` (trocar fixa só nesta sessão), `:151` ("Seguir a
  Conta" manda `null`), `:180` (recusa da api — caso de falha), `:202`
  (abaixo de `developer`), `:213` (leitura falhada), `:225` (a cadeia sem a
  sessão)
- **Origem:** AT-165, sobre as decisões das AT-169 (resposta 2) e AT-168
  (resposta 7)
