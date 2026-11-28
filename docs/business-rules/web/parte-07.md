---
id: rn-web-parte-07
title: 'Regras de negócio — Web — parte 7 (desde RN-978)'
sidebar_label: 'Web — parte 7 (desde RN-978)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 7 (desde RN-978)

## A Anamnese não paga duas vezes pela mesma janela, e o resgate de gate não reinicia ciclo que espera alguém (RN-722)
<a id="rn-978"></a>

### RN-978 — As mensagens na fila de um agente aparecem num painel acima da caixa, e a cancelada some {#rn-978}

- **Regra:** revisa a apresentação da [RN-673](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-673): o selo sob cada mensagem sai e o `PainelDaFila` lista, acima da caixa, TODAS as pendentes (`estadosNaFila` em `naFila`), uma linha "Agente: texto" por mensagem. O painel só existe com pendente. Cancelar chama o MESMO endpoint (`cancelQueuedAgentMessage`), só aparece para quem ENVIOU e com a sessão ativa, não é otimista (o item sai quando o log disser `chat.message_cancelled`) e a recusa é dita no toast. Decisão do dono (02/11): a mensagem CANCELADA (e a entregue) deixa de aparecer em qualquer lugar; o log a guarda.
- **Onde:** `apps/web/src/routes/PainelDaFila.tsx:20` (`PainelDaFila`).
- **Teste:** `apps/web/src/routes/SessionPage.fila-de-mensagens.test.tsx` (lista as pendentes e só quem enviou cancela; sem pendente não há painel).
- **Origem:** AT-683 (EP-031).

<a id="rn-979"></a>

### RN-979 — Decisão, mapa de módulos, C4, imagem e parecer de QA/SecOps ganham cartão no fio {#rn-979}

- **Regra:** os eventos `artifact.decision_record`, `artifact.module_map`, `artifact.c4_diagram`, `artifact.project_image`, `artifact.qa_verdict` e `artifact.secops_verdict` aparecem no fio com o MESMO cartão do épico/história, com link para a aba (Arquitetura ou PRs). Título e descrição saem dos campos REAIS do payload: decisão (`choice`, `context`), mapa de módulos (sem título; descrição = `modules[].name`), C4 (`systemName`, `systemDescription`), imagem (`image`, `rationale`), pareceres (`veredito` traduzido, `resumo`). Campo ausente cai no rótulo do tipo; descrição passa de 200 caracteres é cortada. Leitura do payload, sem query nova.
- **Onde:** `apps/web/src/lib/artefato-do-fio.ts:11` (`camposDoArtefato`), `apps/web/src/routes/session-timeline-montagem.tsx:147` (`ARTEFATOS_DO_FIO`).
- **Onde:** `apps/web/src/lib/artefato-do-fio.ts:11` (`camposDoArtefato`), `apps/web/src/routes/session-timeline-montagem.tsx:145` (`ARTEFATOS_DO_FIO`).
- **Teste:** `apps/web/src/lib/artefato-do-fio.test.ts` (um caso por tipo e payload sem campo opcional).
- **Origem:** AT-683 (EP-031).

<a id="rn-980"></a>

### RN-980 — As Configurações do projeto são uma página por grupo, com os grupos como abas dentro da página; só o grupo aberto monta {#rn-980}

- **Regra:** revisa a [RN-645](parte-05.md#rn-645) no item 3. O sumário lateral deixa de existir: cada grupo do registro (`modelos`, `projeto`, `pessoas`, `avancado`) é uma PÁGINA, e os quatro são ABAS numa faixa no topo da página de Configurações (setas, Home e End; `aria-selected`/`aria-controls`); "Configurações" segue UM item só da barra lateral, sem sub-itens (decisão do dono, 03/11). O endereço é `?tab=settings&group=<grupo>`; Modelos é a página padrão. `?section=` continua valendo: abre a página do grupo da seção e rola até ela, e vence um `group` incoerente; chave aposentada ([RN-911](parte-06.md#rn-911)) ou desconhecida abre Modelos no topo. O grupo é derivado do campo `grupo` do registro, nunca de outra lista. Só as seções do grupo aberto montam, então a carga busca só o que é da página (abrindo em Modelos, no máximo 21 requisições, contra 30; teto em `configuracoes.orcamento.test.tsx`). Os itens 1 e 2 da RN-645 (frescor de um minuto, sem poll) não mudam, e trocar de página dentro do minuto não refaz busca. Trocar de página descarta rascunho não salvo, como trocar de aba.
- **Onde:** `apps/web/src/routes/settings/sumario.ts:115` (`grupoDaSecao`), `apps/web/src/routes/settings/sumario.ts:120` (`resolverGrupo`), `apps/web/src/routes/ProjectSettingsTab.tsx:71` (`ProjectSettingsTab`).
- **Teste:** `apps/web/src/routes/settings/paginas-por-grupo.test.tsx` (página só com as seções do grupo; todo `?section=` antigo cai no seu grupo; rola até a seção), `apps/web/src/routes/configuracoes.orcamento.test.tsx` (carga de Modelos não busca o resto), `apps/web/src/routes/settings/paginas-por-grupo.test.tsx` (a faixa de abas e o teclado).
- **Origem:** AT-719 (EP-031).

<a id="rn-981"></a>

### RN-981 — Na Sessão, as caixas de pergunta e de aprovação ficam na borda do fio, e o contexto e o esqueleto de carregamento ganham o tratamento R3 {#rn-981}

- **Regra:** revisa a [RN-171](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-171) e a [RN-173](parte-02.md#rn-173) no alinhamento: a caixa de pergunta estruturada e o contêiner da ação no fio deixam de ser centralizados (`margin: auto`) e ficam encostados na borda esquerda do fio, mantendo o teto de 560px. Decisão do dono (03/11/2026). O resto da RN-171 (texto livre) e da RN-173 (um só `ApprovalCard`) fica. Junto: o botão do contexto tem só ícone, com legenda "Recolher contexto"/"Abrir contexto" e `aria-expanded`; o fio mostra "Carregando sessão…" com esqueleto na mesma condição que adia o convite (RN-131); "Arquivos tocados" é um `Disclosure` com a contagem; a faixa de sessão encerrada tem ícone, título e explicação, e "Reabrir sessão" segue com a regra de papel da RN-650.
- **Onde:** `apps/web/src/routes/SessionPage.module.css:1261` (`.acaoNoFio`), `apps/web/src/routes/SessionFio.tsx:59` (`SessionFio`), `apps/web/src/routes/SessionTopbar.tsx:111` (`SessionTopbar`).
- **Teste:** `apps/web/src/routes/SessionPage.layout-movel.test.tsx` (legenda e `aria-expanded`), `apps/web/src/routes/SessionPage.sessao-encerrada.test.tsx`.
- **Origem:** AT-720 (EP-031).

<a id="rn-992"></a>

### RN-992 — O composer interpreta `@` e `/` só na tela: `@` escolhe destinatários entre os agentes da sessão, `/` dispara a ação do botão ou insere um prompt, e nenhum comando decide por teto {#rn-992}

- **Regra:** `@` e `/` no início de uma palavra abrem a lista de sugestões (`Command` do shadcn dentro de um `Popover`); o campo segue NÃO controlado (RN-882) e o texto depois do gatilho só filtra a lista. O `@` lista SÓ os agentes que já estão na sessão e vira chip; um chip usa a rota por agente de hoje, dois ou mais usam `POST .../messages` com `destinatarios`. O `/` tem nome localizado e aceita o id interno: `/pronto`, `/arquitetura`, `/handoff`, `/perguntas` e `/parar` chamam o handler e o predicado do botão (RN-976); `/resumo` e `/plano` inserem um texto fixo traduzido para a pessoa editar; `/ajuda` lista os comandos; `/skills` lista as ferramentas e a instrução vigente do destinatário (catálogo da RN-995, `queryKey` `['agent-catalog', projectId]` da RN-645; engine fora diz "não sei", nunca "sem ferramentas") e `/buscar` pesquisa no RAG (`POST .../rag/search`, sem rota nova) o texto do campo, e ambos só LEEM e dizem o motivo quando falham (AT-724). `/aprovar` com UMA pendência pede confirmação e chama o endpoint do `ApprovalCard`; com várias, ou com teto (`git_merge`, `instruction_patch`, `parallelize`, `raise_max_parallel`, deploy, `sudo`/`doas`, RN-154/RN-418), só leva ao card. Enter e Tab escolhem, Esc fecha, e com o menu aberto Enter NÃO envia; composição de acento (RN-830) é ignorada. Nenhum comando cria `proposed_action`.
- **Onde:** `apps/web/src/lib/comandos-do-composer.ts:115` (`gatilhoNoCursor`), `apps/web/src/lib/comandos-do-composer.ts:132` (`destinoDoAprovar`), `apps/web/src/lib/use-menu-do-composer.ts:25` (`useMenuDoComposer`), `apps/web/src/lib/use-menu-do-composer.ts:97` (`listarSkills`), `apps/web/src/lib/use-menu-do-composer.ts:125` (`buscar`), `apps/web/src/components/ai-elements/menu-do-composer.tsx:15` (`MenuDoComposer`).
- **Teste:** `apps/web/src/routes/SessionComposer.menu.test.tsx` (menu, filtro, Enter sem enviar, Esc, `/aprovar` comum e de teto, `/resumo`, `@` da sessão, chips e rota nova, `/skills` e `/buscar` no caminho feliz e na falha), `apps/web/src/lib/comandos-do-composer.test.ts`.
- **Origem:** AT-717 (EP-031), lane web.

<a id="rn-994"></a>

### RN-994 — Na Sessão, a pergunta estruturada vem depois da mensagem do agente que a introduz {#rn-994}

- **Regra:** revisa a [RN-162](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-162) só na posição. O agente pergunta no meio do turno e fecha com o `agent.response`, então o `chat.structured_question` tem `seq` menor que a resposta; o fio põe o cartão (aberto ou já respondido) logo DEPOIS da bolha de `agent.response` do MESMO agente com `seq` maior, antes da próxima `chat.message` do usuário. Sem resposta depois (turno em curso), o cartão fica onde está. Move-se o item, não o evento, e o item mantém a flag `mensagem` do corte da [RN-644](parte-05.md#rn-644). Raciocínio e "Passos do turno" seguem antes da resposta. Decisão do dono (03/11/2026).
- **Onde:** `apps/web/src/routes/session-timeline-montagem.tsx:160` (`montarTimeline`).
- **Teste:** `apps/web/src/routes/session-timeline-montagem.perguntas.test.tsx` (resposta antes do cartão; turno em curso; duas perguntas na ordem; não pula para a resposta do turno seguinte).
- **Origem:** pedido do dono, 03/11/2026.

## A versão do brabo-contracts é uma só (RN-1038)

<a id="rn-1038"></a>

### RN-1038 — No web, a versão do brabo-contracts é a mesma no alias do `package.json`, no lock e em `scripts/baixar-areas.mjs` {#rn-1038}

- **Regra:** `@brabo/shared` é o alias do pnpm `npm:@viralabs-dev/brabo-shared@X.Y.Z` (pacote público no GitHub Packages, ADR 0270), com versão exata. O `areas.json` baixado pelo `pnpm areas:baixar` vem da tag `vX.Y.Z` do mesmo contracts. As três fontes (alias, lock e a constante `TAG`) têm de coincidir; quem troca a versão usa `scripts/ci/subir-contracts.sh` do `brabo-ci`, e o lock nunca é editado à mão. Diverge, o check `contracts-alinhado` reprova; difere do `componentes.json` do `brabo`, só avisa. O check não é obrigatório.
- **Onde:** `package.json:20` (`@brabo/shared`), `scripts/baixar-areas.mjs:3` (`TAG`), `.github/workflows/contracts-alinhado.yml:17`.
- **Teste:** o reutilizável `contracts-alinhado.yml` do `brabo-ci` (spec `scripts/ci/contracts-alinhado.spec.ts` no `brabo-ci`) roda no PR; `apps/web/src/lib/agent-areas.contrato.test.ts` confere o `agent-areas.generated.ts` contra o `areas.json` da mesma tag.
- **Origem:** AT-770 (EP-033), R2a.

O web cumpre a RN-1039 (o token do GitHub Packages nunca entra em camada, `ARG` ou `ENV`, só como secret do BuildKit), definida no brabo-broker em [`docs/business-rules/broker.md`](https://github.com/viralabs-dev/brabo-broker/blob/dev/docs/business-rules/broker.md). A prova no web é `test/token-do-registry.test.ts:1`, junto de `Dockerfile:54`, `.npmrc:1`, `.github/workflows/ci.yml:61` e `.github/workflows/release.yml:56`.

## Achados do TP-01 27ª (RN-1060 a RN-1063)

<a id="rn-1060"></a>

### RN-1060 — Aberta por um loopback diferente do da api, a web vai para o loopback da api antes de montar {#rn-1060}

- **Regra:** `localhost` e `127.0.0.1` são SITES diferentes para o navegador: a página num e a api (`apiUrl` do `/config.js`) no outro dão CORS recusado e cookie `SameSite=Strict` ([RN-034](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-034)) que não viaja, e a tela parece fora do ar ("api sem resposta"). Antes de `restaurarSessao()` e do primeiro render, se o host da página e o da `apiUrl` são AMBOS loopback (`localhost`, `127.0.0.1`, `[::1]`) e diferentes, a página faz `location.replace` para o mesmo endereço (porta, caminho, query e hash preservados) com o host da api. Domínio, IP de rede, k8s e `apiUrl` vazia ou inválida não mudam. Nenhuma origem nova entra no CORS da api nem do engine.
- **Onde:** `apps/web/src/lib/runtime-config.ts:114` (`enderecoNoLoopbackDaApi`), `apps/web/src/main.tsx:96` (`noLoopbackDaApi`).
- **Teste:** `apps/web/src/lib/runtime-config.test.ts` (127.0.0.1 → localhost com caminho/query/hash, o inverso, `[::1]`, mesmo host, domínio, IP de rede, `apiUrl` inválida).
- **Origem:** AT-801 (EP-030), TP-01 27ª achado 1.

<a id="rn-1061"></a>

### RN-1061 — O aviso de execução parada, no feed, no fio e em Executores, oferece Rearmar e Desbloquear {#rn-1061}

> **Revisada pela [RN-1491](parte-08.md#rn-1491) (AT-1007):** na aba Execução a faixa é de aviso (âmbar), não de perigo, e oferece "Pedir o parecer de novo" quando um gate estacionado está por trás da parada.

- **Regra:** o `execution.stalled` que o engine grava ([RN-1059](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-1059): todos os dev agents parados, tarefa pendente atrás de tarefa bloqueada ou de agente travado) aparece em vermelho no feed de atividade, nomeando as tarefas e os agentes que seguram a execução. Na sessão de execução ele vira uma mensagem do fio (`data-testid="execucao-parada"`) e, acima do time, na aba Executores, o mesmo aviso. Sob ele, `DestravarExecucao` traz um **Rearmar** por agente travado (`rearmDevAgent`, [RN-047](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-047)) e um **Desbloquear** por tarefa bloqueada (`unblockTask`, [RN-826](parte-06.md#rn-826)), com as mesmas rotas dos atalhos do chat. Os botões só existem enquanto a parada é VIGENTE: o último evento entre `execution.stalled`, `dev.working`, `dev.rearmed` e `backlog.task_unblocked` é um `execution.stalled`; depois do destrave o aviso fica no histórico, sem botões. Papel abaixo de `developer` vê os botões inertes e o motivo em texto; a recusa da api vira toast com a frase dela. A web não decide nada: só lê o payload do engine.
- **Onde:** `apps/web/src/lib/execution.ts:173` (`execucaoParadaDe`), `apps/web/src/routes/DestravarExecucao.tsx:25` (`DestravarExecucao`), `apps/web/src/lib/activity.ts:228` (`classifyEvent`), `apps/web/src/routes/ProjectExecutorsTab.tsx:223` (`paradaVigente`).
- **Teste:** `apps/web/src/routes/DestravarExecucao.test.tsx`, `apps/web/src/lib/execution.test.ts`, `apps/web/src/lib/activity.test.ts`.
- **Origem:** AT-800 (EP-030), parte web; engine#57.

<a id="rn-1062"></a>

### RN-1062 — O cartão do plano mostra o teto do projeto e das áreas dev/qa, avisa quando a estimativa passa do que resta e ajusta o teto da área dev ali {#rn-1062}

- **Regra:** o "custo esperado" do plano do Dev Lead é o teto POR TAREFA × tarefas ([RN-802](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-802)), não o preço. Enquanto o plano está pendente, logo abaixo dele o cartão mostra o teto do projeto (`GET /projects/:id/budget`, `maintainer`; para papel abaixo a linha do projeto some) e o das áreas `dev` e `qa` (`GET .../agent-areas`), cada um com o gasto, ou "sem teto" ([RN-443](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-443)). Quando a estimativa passa do que resta (`limite − gasto`, nunca negativo) do MENOR teto aplicável, entre o do projeto (só com política `block`; `allow` não para nada) e o da área `dev`, aparece um aviso `warning` com o que resta e a frase "a execução para quando o teto for atingido; a estimativa é o teto por tarefa, não o preço". O aviso NÃO trava o Aprovar ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)). "Ajustar teto" (ícone e rótulo) abre na própria linha um campo em dólar para o teto da área `dev` só, com Salvar e Cancelar (`setAreaBudget`; vazio = sem teto, como na [RN-980](#rn-980)); abaixo de `maintainer` fica inerte, com o motivo em texto (ADR 0064). "Outros tetos" abre `?section=budget` em outra aba: o teto do projeto, que tem política, segue em Configurações. Reusa as chaves de cache `['budget', projectId]` e `['agent-areas', projectId]`; sem `QueryClient` (teste isolado do card) nada é lido nem mostrado.
- **Onde:** `apps/web/src/components/TetoDoPlano.tsx:33` (`TetoDoPlano`), `apps/web/src/components/TetoDoPlano.helpers.ts:15` (`menorTetoAplicavel`), `apps/web/src/components/ApprovalCard.tsx:503` (`TetoDoPlano`).
- **Teste:** `apps/web/src/components/ApprovalCard.teto-do-plano.test.tsx`.
- **Origem:** AT-808 (EP-031); decisão do dono, 07/11/2026 (ajuste só da área dev; o aviso não trava).

<a id="rn-1063"></a>

### RN-1063 — PR que entra na fila de prontas avisa na borda do fio e no título da aba, com Mergear e o tempo de espera, e se dispensa {#rn-1063}

- **Regra:** estende a [RN-825](parte-06.md#rn-825)/[RN-841](parte-06.md#rn-841). Quando há PR pronta para o dono mergear (a fila `prontas`: gates aprovados, ou PR sem tarefa), um `Item` de 44 px (AT-960; antes `Alert` accent) fica FIXO na borda do fio, entre o fio e o composer (RN-981), com `role="status"`: "PR #3 "título" está pronta para você mergear: os gates passaram", com "Pronta há N min" (sobre o `updatedAt` da tarefa da PR, quando há) e o `MergearNoChat` com a confirmação num Popover ([RN-1358](#rn-1358); antes na linha, AT-753 P1). Com várias: "N PRs prontas para você mergear" e "Ver as N", que abre a aba `prontas` ([RN-975](parte-06.md#rn-975)). "Agora não" dispensa as PRs avisadas; o aviso só volta se ENTRAR uma PR nova. Quando a PR sai da fila (mergeada), o aviso some. O título da aba mostra o contador enquanto houver PR pronta ("(1) Brabo"), mesmo com o aviso dispensado, e volta ao normal quando a fila esvazia. PR que ENTRA na fila (na primeira leitura, as que já esperavam) abre sozinha a aba `prontas` do painel de pendências quando nenhuma está aberta (exceção declarada à "nenhuma aba nasce aberta" da RN-975). Sem evento novo, sem mudança em api ou engine e sem notificação do navegador: o aviso lê as mesmas prontas do painel (`usePrsProntas`, cache compartilhado), pela releitura de 15 s do backlog. **Destrava (AT-902):** a faixa diz quantas tarefas o merge destrava ("Destrava N tarefas"; com várias, "A PR #X destrava N tarefas" para a do topo): as `todo` dos módulos que dependem (`dependsOn` direto) do módulo da tarefa da PR, contadas só quando essa tarefa é a última aberta do módulo (a régua da [RN-1005](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1005)); a conta usa só o backlog e o `module_map` já lidos. Com várias prontas, a que destrava mais vem primeiro (empate: a ordem da fila). O título da aba segue "(N) Brabo". O merge segue gesto humano ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418)/[RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)): o aviso só oferece o `MergearNoChat`.
- **Onde:** `apps/web/src/components/AvisoDePrPronta.tsx:29` (`AvisoDePrPronta`), `apps/web/src/components/AvisoDePrPronta.helpers.ts` (`tarefasQueODestrava`), `apps/web/src/lib/prs-prontas.ts:14` (`usePrsProntas`), `apps/web/src/lib/saidas-da-fila.ts:30` (`entradasDaFila`), `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:228` (`idsDasProntas`), `apps/web/src/routes/SessionPage.tsx:849` (`AvisoDePrPronta`).
- **Teste:** `apps/web/src/components/AvisoDePrPronta.test.tsx`, `apps/web/src/components/AvisoDePrPronta.destrava.test.ts`, `apps/web/src/lib/saidas-da-fila.test.ts`, `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`.
- **Origem:** AT-810 (EP-031); decisão do dono, 07/11/2026 (aviso fixo na borda do fio; contador no título da aba; sem notificação do navegador).

<a id="rn-1303"></a>

### RN-1303 — O chat de sessão criativa mostra a execução vigente numa faixa de uma linha acima do fio, e o detalhe dos executores mora na aba Executores do painel {#rn-1303}

> **Revisada pela AT-957 (v10):** o carrossel saiu de cima do fio. O "minimizar" e a chave `localStorage` `brabo:carrossel-de-executores:minimizado` não existem mais; a faixa é a [RN-1354](#rn-1354) e a lista é a aba Executores do painel ([RN-1353](#rn-1353)).

- **Regra:** quando a sessão aberta é `kind=criativa` e há execução vigente ([RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139)) com `module_map`, o painel da sessão ganha a aba Executores com UM item por executor: os dev agents (um por módulo) e, com evidência (`pr.gate_changed`, `artifact.qa_verdict`/`artifact.secops_verdict`, `delegation.*`), QA e SecOps, com estado (badge), tarefa, texto do estado (o motivo da espera), última ação, tempo (minutos, sem tique), custo (`token-usage` da execução) e "Ver no fio" (`?highlightEvent=` do último evento) na própria linha. A ordem é a de atenção primeiro: travado, bloqueado, falhou, trabalhando, aguardando, ocioso, concluído, e dentro do estado a do `module_map`. A leitura é a de sempre: a sessão de execução (outra sessão, mesmas chaves de cache de `useAgentesTravados`), viva pelo heartbeat dela; sem endpoint nem evento novo. **Fim:** quando a execução deixa de ser a vigente, a faixa vira o resumo ("execução concluída" com todas as tarefas `done`, senão "execução parada") com o "x de N" e o custo, dispensável no ×.
- **Onde:** `src/routes/ListaDeExecutores.tsx` (`ListaDeExecutores`), `src/routes/FaixaDeEstado.tsx` (`FaixaDeEstado`), `src/lib/executores-ao-vivo-query.ts` (`useExecutoresAoVivo`), `src/lib/executores-ao-vivo.ts` (`cartoesDaExecucao`).
- **Teste:** `src/routes/FaixaEListaDeExecutores.test.tsx`, `src/lib/executores-ao-vivo.test.ts`.
- **Origem:** AT-880 (EP-031); decisão do dono, 09/11/2026 (resumo no fim, atenção primeiro, devs + QA + SecOps); AT-957 (EP-035), v10 de 14/11/2026 (carrossel sai do topo).

<a id="rn-1073"></a>

### RN-1073 — O motivo do ócio do dev agent é derivado no web do `module_map` e do backlog, com o predicado da RN-1005; sem causa achada, diz "sem tarefa disponível agora" {#rn-1073}

- **Regra:** o `dev.idle` do engine só diz "sem task pegável" (ou a pausa de rede, [RN-864](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules.md#rn-864)), e o claim vazio é decidido na api por [RN-1005](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1005): a tarefa do módulo só sai enquanto nenhum módulo do `dependsOn` DIRETO tiver tarefa aberta. O web relê esse predicado para o cartão, em ordem: (a) pausa de rede: o próprio `reason`; (b) o módulo não tem tarefa aberta: concluído; (c) o módulo tem tarefa aberta e algum `dependsOn` tem tarefa ≠ `done`: "esperando a fundação de X" com a PR aberta da tarefa de X (branch `feature/task-<id>`) ou o título da tarefa em andamento, e com várias dependências "esperando N módulos; o primeiro a destravar é X" (o que tem PR); (d) todas as tarefas abertas bloqueadas: "tarefa bloqueada" com o motivo; (e) fora disso, "sem tarefa disponível agora", nunca um motivo inventado. A tarefa ainda não pega não tem `module`: ela herda os `moduleIds` da história (AT-881), que o backlog já manda. `Task.module` já vinha no DTO e passou a existir no tipo do web.
- **Onde:** `apps/web/src/lib/executores-ao-vivo.ts:68` (`motivoDoOcio`), `apps/web/src/lib/api-types.ts:1124` (`Task.module`).
- **Teste:** `apps/web/src/lib/executores-ao-vivo.test.ts`.
- **Origem:** AT-880 (EP-031); levantamento de 09/11/2026 (TP-01 28ª).

<a id="rn-1162"></a>

### RN-1162 — A Visão geral diz UM próximo passo do projeto, tirado de uma tabela tipada e ordenada; sem situação verdadeira, o cartão some {#rn-1162}

- **Regra:** depois dos "Primeiros passos" (RN-708) a Visão geral não dizia mais o que fazer. Desde a AT-936 o cartão "Próximo passo" mostra UMA situação, a primeira verdadeira de uma tabela ordenada: (1) primeiro passo pendente da RN-708, (2) agente conversacional trabalhando, (3) continuar a ideação (há sessão e o backlog não tem histórias), (4) confirmar a arquitetura (há histórias e o mapa de módulos falta ou tem pendência), (5) ligar tarefas a um módulo (RN-1085; só com a execução ativa, RN-1397), (6) desbloquear tarefas, (7) ativar a execução (tarefas prontas e execução inativa), (8) acompanhar a execução (execução ativa com tarefa em andamento), (9) rodar o entregável (todas as tarefas não arquivadas concluídas). O passo 1 reusa o texto e o destino da RN-708, sem duplicar a regra. A regra só ORDENA fatos que a aba já lê: nenhuma leitura nova (o orçamento de carga da Visão geral não muda), e insumo ainda não lido é "não sei" (RN-470), então o cartão espera. Decisões pendentes (aprovações, PRs, hipóteses, promoções) ficam de fora de propósito: já são a faixa "Precisa de você" (RN-467). Tarefa arquivada não conta. Sem situação verdadeira o cartão não aparece, sem texto inventado. "Mapa de módulos sem confirmação" não existe como dado no web: vale "mapa ausente ou com pendência".
- **Onde:** `apps/web/src/lib/proximo-passo.ts:46` (`PASSOS`), `apps/web/src/lib/proximo-passo.ts:72` (`derivarProximoPasso`), `apps/web/src/components/ProximoPasso.tsx:19` (`ProximoPasso`), `apps/web/src/routes/ProjectOverviewTab.tsx:310` (montagem logo abaixo dos Primeiros passos).
- **Teste:** `apps/web/src/lib/proximo-passo.test.ts` (um caso por situação, precedência, "nenhuma" e tarefa arquivada), `apps/web/src/routes/ProjectOverviewTab.test.tsx` (describe "próximo passo": fixture da P10, bloqueada, cartão que some).
- **Origem:** AT-936 (EP-035); prévia em `13-design/proximo-passo`. Revisa a RN-708: o primeiro passo pendente dela é a situação 1 desta tabela.

<a id="rn-1200"></a>

### RN-1200 — O teto do projeto é MENSAL na tela: medidor, dias restantes, previsão e a legenda da virada em UTC {#rn-1200}

- **Regra:** o teto do projeto (`GET/PUT projects/:id/budget`, `maintainer`) passa a ser do mês civil em UTC (api RN-1168..1171): o `spentMicros` é o gasto do mês e a resposta traz `periodo { inicio, fim, diasRestantes, previsaoMicros }`. A aba Gastos chama o bloco de "Teto do mês" e diz "N dias restantes", "Previsão no fim do mês: US$ X" e "O mês vira em <data> (00:00 UTC)". A virada é em UTC; SÓ a legenda é convertida para a hora local do navegador. Os avisos 70/90 e o bloqueio falam "do mês" (a sessão segue acumulada e sem `periodo`). O cartão do plano (RN-1062) compara a estimativa com o que resta do teto do projeto NO MÊS. O motivo `politica` do engine agora também vem do teto do mês; o cartão "Aumentar o teto por tarefa" (AT-917) só vale para o motivo do ToolLoop e deve oferecer "ver o teto do projeto" no motivo `politica`.
- **Onde:** `src/components/TetoDoMes.tsx:41` (`TetoDoMes`), `src/lib/spend.ts:289` (`viradaDoMesLocal`), `src/routes/ProjectSpendTab.tsx:95` (`OrcamentoDoProjeto`).
- **Teste:** `src/routes/ProjectSpendTab.test.tsx` ("mostra dias restantes, previsão e a virada do mês"), `src/lib/spend.test.ts` (`viradaDoMesLocal`).
- **Origem:** AT-934 (EP-035). Revisa a RN-213 (o alerta é do mês).

<a id="rn-1201"></a>

### RN-1201 — O workspace tem teto de gasto mensal, que só o owner vê e define {#rn-1201}

- **Regra:** a S06 (Gastos) mostra ao `owner` o teto do mês do workspace (`GET/PUT workspaces/:id/budget`, 403 para os demais), com o mesmo medidor, previsão e legenda da RN-1200, e o editor (valor e política `block`/`allow`). Quem não é owner não lê o valor (a api recusa): vê, em texto, que o teto é do owner e que só o conhece quando uma chamada é recusada ("Budget do workspace atingiu o teto do mês"). O controle nunca é oferecido a quem a api não deixa usar (RN-102); erro de leitura de quem não edita é silencioso. O teto do workspace soma todos os projetos e é independente dos de projeto, sessão e área: basta um no limite com `block` para recusar.
- **Onde:** `src/components/TetoDoMes.tsx:41` (`TetoDoMes`), `src/routes/SpendPage.tsx:23` (`SpendPage`), `src/lib/api-client.ts:1379` (`getWorkspaceBudget`).
- **Teste:** `src/components/TetoDoMes.test.tsx` (owner edita; sem papel fica inerte com o motivo; 403 silencioso).
- **Origem:** AT-935 (EP-035).

<a id="rn-1185"></a>

### RN-1185 — Os passos do turno se recolhem numa linha e se agrupam por INTENÇÃO, num mapa tipado; nenhum passo some {#rn-1185}

- **Regra:** `PassosDoTurno` recolhido mostra "N passos", até 3 ferramentas mais usadas com ×N, o custo (`custoMicros` do `agent.response`, RN-1158) e a duração do TURNO (`duracaoMs`); campo ausente (evento antigo ou do `ToolLoop`) é traço ou some, nunca zero. Aberto, o seletor "Agrupados | Em ordem": "Em ordem" é a lista de `passosDoTurno`; "Agrupados" parte o MESMO conjunto por intenção (Leu o contexto, Desenhou, Registrou, Outros) por `GRUPO_DA_FERRAMENTA`, `Record<FerramentaConhecida, Grupo>` exaustivo pelo tipo; ferramenta fora do tipo cai em Outros. O fio não agrupa por origem (RN-644). Desde a AT-958 (RN-1392) o raciocínio, as consultas e os passos de cada turno, o último e os anteriores, moram dentro de UMA linha de trabalho (`LinhaDeTrabalho`); `ResumoDeTurno` saiu do fio (segue na visão geral do projeto). A mensagem do agente (a última de todas inteira; as anteriores em 3 linhas com "Ver resposta inteira", RN-1406) continua no fio e o texto dela fica em 62ch (ADR 0248). O `Reasoning` mostra "N tokens" quando o fecho traz `raciocinioTokens`, senão a contagem de caracteres. Recorte declarado (RN-180): o texto lateral por passo da prévia não tem fonte estruturada e sai; "iteração N de 14" sai; o papel do raciocínio é filtrado pela api (ADR 0249), não pelo web.
- **Onde:** `src/lib/grupos-de-ferramenta.ts:12` (`GRUPO_DA_FERRAMENTA`), `src/components/ai-elements/passos-do-turno.tsx:11` (`PassosDoTurno`), `src/lib/resumo-de-turno.ts:20` (`gravadoDoPayload`), `src/components/ai-elements/linha-de-trabalho.tsx:21` (`LinhaDeTrabalho`).
- **Teste:** `src/lib/grupos-de-ferramenta.test.ts`, `src/components/ai-elements/passos-do-turno.test.tsx` (seletor Agrupados | Em ordem).
- **Origem:** AT-891 (EP-035), ADR 0290/0294.

<a id="rn-1180"></a>

### RN-1180 — A navegação do projeto tem oito seções; as 12 abas viram sub-abas, e as chaves antigas de `?tab=` continuam abrindo a mesma tela {#rn-1180}

- **Regra:** desde a AT-886 (ADR 0294) a sidebar do projeto tem OITO itens: Visão geral, Sessões, Trabalho, Código, Decisões, Arquitetura, Gastos e Configurações. As 12 chaves de hoje continuam sendo as telas e viram seção ou sub-aba com o mesmo painel (Sessões: `criativo`, `chat`; Trabalho: `backlog`, `executores`; Código: `code`, `prs`; Decisões: `approvals`, `insights`). O item da seção é link para a primeira sub-aba e fica ativo quando qualquer sub-aba dela é a ativa. Seção com mais de uma sub-aba mostra a faixa de sub-abas no topo do conteúdo (`Tabs variant="casa"`, a mesma peça de Configurações); trocar de sub-aba troca a tela e o `?tab=` acompanha. `resolverChaveDeAba` devolve `{ secao, sub }` e resolve as 12 chaves, os aliases `sessions`, `rag` (para `chat`) e `historias` (para `backlog`) e as chaves de seção (`sessoes`, `trabalho`, `codigo`, `decisoes`, que abrem a primeira sub-aba); chave desconhecida é `undefined`. Contadores nunca se somam (RN-467): o item da seção só mostra número quando UMA fila o alimenta (Trabalho: promoções; Código: PRs; Arquitetura: pendências), Decisões (aprovações mais hipóteses) mostra só o ponto de presença, e cada sub-aba traz o número da própria fila na faixa, da mesma fonte (`useContagensDoProjeto`, sem requisição nova). Só entra no registro sub-aba que tem painel: `todas` e `permissoes` entram, uma linha cada, nas AT-893 e AT-895.
- **Onde:** `apps/web/src/routes/project-tabs.ts:411` (`SECOES_DO_PROJETO`), `apps/web/src/routes/project-tabs.ts:433` (`resolverChaveDeAba`), `apps/web/src/routes/AbasDoProjeto.helpers.ts:11` (`itensDasAbas`), `apps/web/src/components/FaixaDeSubAbas.tsx:22` (`FaixaDeSubAbas`), `apps/web/src/routes/ProjectPage.tsx` (`trocarSub`).
- **Teste:** `apps/web/src/routes/project-tabs.test.tsx` (os 15 deep-links, as chaves de seção, desconhecida e a faixa com o selo de cada fila), `apps/web/src/routes/AbasDoProjeto.test.tsx` (8 itens, teclado com volta, Decisões sem número), `apps/web/src/routes/Shell.test.tsx` (sidebar, flyout e gaveta).
- **Origem:** AT-886 (EP-035), ADR 0294. Revisa a RN-196 e o ADR 0211 no que diz respeito aos três grupos: a lista passa a ter oito itens.

<a id="rn-1210"></a>

### RN-1210 — O cabeçalho do projeto tem trilha, chips, medidor de gasto do mês e UMA ação primária por seção {#rn-1210}

- **Regra:** desde a AT-888 o cabeçalho (56 px) mostra a trilha `Projeto / Seção` (a seção vem de `secaoDaChave`), os chips `provider · visibilidade` e a branch padrão do repositório (não a checada), o `MedidorDeGasto` e a ação primária da seção: Visão geral e Sessões = "Nova sessão"; Trabalho = "Ativar execução" só na sub-aba Backlog (some com a execução já ativa; em Execução o cartão de chamada tem a ação, RN-1220); demais = nenhuma. O medidor lê `GET projects/:id/budget`: gasto do mês, barra por faixa (70% aviso, 90% perigo) e a previsão de `periodo.previsaoMicros` só quando a api a devolve; sem teto (`null`) diz "sem teto" com barra neutra e "Definir teto" leva a `?tab=spend#teto` (Gastos#teto: o teto tem um lugar só). "Nova sessão" cria `consultiva` em Sessões › Conversa e `criativa` nos demais lugares, ativa e navega, pelo MESMO `useCriarSessao` da aba (uma régua só). "Ativar execução" usa `useAtivarExecucao`: recusa por repositório ausente confirmado (RN-582) e toast com a causa real da api. Papel mínimo do controle = o do endpoint (RN-102): `developer` para criar sessão, `maintainer` para ativar. O chip "Precisa de você" fica até a AT-889.
- **Onde:** `apps/web/src/routes/ProjectPage.tsx` (`ProjectPage`), `apps/web/src/components/MedidorDeGasto.tsx:14` (`MedidorDeGasto`), `apps/web/src/lib/use-criar-sessao.ts:17` (`useCriarSessao`), `apps/web/src/lib/use-ativar-execucao.ts:12` (`useAtivarExecucao`).
- **Teste:** `apps/web/src/components/MedidorDeGasto.test.tsx` (com teto, faixa e previsão; sem teto).
- **Origem:** AT-888 (EP-035), ADR 0294 e 0296 (previsão: AT-934).

<a id="rn-1220"></a>

### RN-1220 — Trabalho junta Backlog e Execução: ativar, áreas, fila, ações da execução e Quadro por estado da tarefa {#rn-1220}

- **Regra:** em Trabalho › Execução, com a execução parada, o topo de `ResumoDaExecucao` é só o cartão de chamada (AT-943, v9): o que acontece ao ativar, o teto do projeto (SEM estimativa de custo, AT-883 #21) e a ação "Ativar execução" (`AtivarExecucao`, `maintainer` no endpoint, RN-102; trancada sem repositório confirmado, com o motivo dito no próprio cartão, RN-582; a recusa da api, como o 409 sem container da RN-1101, é dita ao lado). Abaixo, um cartão por área executora (Dev, Infra, QA…) com situação, paralelismo `ativos / maxParallel` e lead com o número de membros, e a fila de tarefas em tabela (título, módulo, estado; `N prontas · N rodando · N bloqueadas`, cada contagem do ESTADO da tarefa e nunca somada, RN-467; arquivada fora; pronta = `todo` de história que não está em rascunho, RN-048). `AcoesDaExecucao` traz da Visão geral o desbloqueio com orientação (RN-835), o aceite de paralelização (RN-083) e a lista de PRs de dev; as duas ações pedem `developer` (RN-102) e a lista só tem as PRs PENDENTES do projeto. A lista de áreas vem da leitura de áreas só com a execução parada; com a execução de pé vem do roster, sem leitura nova (RN-632, RN-794). A sub-aba "Histórias" passou a se chamar "Backlog". Em Trabalho › Backlog: ação "Ativar execução" no cabeçalho, busca e filtros (pergunta aberta, módulo) locais sobre a árvore carregada, épico recolhível com progresso, chips de módulo e "N pergunta(s)" por história (a lista de perguntas tem teto de 50, e acima dele a tela diz que é recorte, RN-180), e o seletor Por épico | Quadro, só leitura, com cinco colunas pelo `estadoDaTarefa` (a fazer, em curso, em revisão, concluída, bloqueada).
- **Onde:** `apps/web/src/routes/ResumoDaExecucao.tsx:34` (`ResumoDaExecucao`), `apps/web/src/components/AtivarExecucao.tsx:17` (`AtivarExecucao`), `apps/web/src/routes/AcoesDaExecucao.tsx:22` (`AcoesDaExecucao`), `apps/web/src/lib/trabalho-v9.ts:5` (`filaDeTarefas`), `apps/web/src/lib/trabalho-v9.ts:22` (`historiaPassaNoFiltro`), `apps/web/src/routes/ProjectBacklogTab.tsx:801` (`QuadroDeTarefas`), `apps/web/src/routes/ProjectExecutorsTab.tsx:130` (`backlogEmCache`).
- **Teste:** `apps/web/src/routes/AcoesDaExecucao.test.tsx` (desbloqueio e botão inerte sem papel), `apps/web/src/routes/ProjectBacklogTab.quadro.test.tsx` (5 colunas, arquivada fora, fila, busca e filtro), `apps/web/src/routes/duas-abas.orcamento.test.tsx` (teto de requisições intacto).
- **Origem:** AT-894 (EP-035).

<a id="rn-1215"></a>

### RN-1215 — Sessões junta Chat e Criativo: "Todas" é a união das duas listas, e a busca filtra localmente e só consulta o RAG com Enter {#rn-1215}

- **Regra:** a seção Sessões tem as sub-abas Todas, Ideação e Conversa (AT-893). "Todas" lê a MESMA lista de hoje (`useProjectSessions`, sem endpoint novo) e não traz o botão de criar (o tipo é escolhido na sub-aba). A linha mostra tipo (ou "sistema" para a sessão técnica), a cadeia de avatares de `agentes[]`, estado, "N aguardando", passos e custo, todos da lista (RN-1151); custo zero aparece como zero. O resumo de uma linha da P13 não existe (a lista não traz o último "Gravado neste turno"). O campo de busca filtra a lista por título e id, localmente; Enter ou o botão abre o RAG (`ProjectRagTab`, a mesma busca medida das RN-479..481) abaixo, UMA consulta por gesto, nunca a cada tecla. `?tab=rag` abre Sessões › Todas já em modo RAG; `?tab=sessions` abre Conversa. O segmento Conversar/Buscar da antiga aba Chat sai (`ProjectChatShell`).
- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx` (`ProjectSessionsTab`, `ProjectTodasTab`, `casaComABusca`), `apps/web/src/routes/ProjectRagTab.tsx` (`consultaInicial`), `apps/web/src/routes/project-tabs.ts` (`REGISTRO`, `ALIASES_DE_ABA`).
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.todas.test.tsx` (união, filtro local sem RAG, Enter com termo curto e longo, `?tab=rag`), `apps/web/src/routes/project-tabs.test.tsx` (deep-links).
- **Origem:** AT-893 (EP-035), decisão do dono de 12/11/2026. Revisa a RN-1180 (a seção ganha a sub-aba `todas`; o alias `rag` aponta para ela).

<a id="rn-1225"></a>

### RN-1225 — Decisões ganha "Decididas recentemente" e a sub-aba Permissões; PRs diz as próximas ações e que o merge é manual {#rn-1225}

- **Regra:** desde a AT-895 (ADR 0294) a sub-aba Aprovações lista, abaixo da fila pendente, o que JÁ foi decidido (`GET /projects/:projectId/actions?status=decided&since=`, RN-1154): aprovadas, negadas com o motivo, automáticas (rotuladas "pela política"), executadas e falhas, mais novas primeiro, 24 h por padrão e "Ver todas" alarga para 30 dias (teto de 100 da api). A leitura não tem poll próprio: a chave começa por `['project-pending-actions', projectId]`, e quem decide invalida o prefixo. Erro da api diz que falhou, nunca "nada decidido" (RN-088), e a lista não soma com a fila pendente (RN-467, RN-638). A tabela do `permissions.json` saiu da aba Aprovações para a sub-aba Permissões (`PermissoesDoProjeto`), sem mudar comportamento. A aba PRs ganha, no vazio, "Ver a aprovação" e "Ativar execução" e o bloco "Como uma PR anda aqui", que diz que o merge em branch protegida é sempre manual: o card só PROPÕE (RN-418 intacta). O rótulo da fila pendente passa de "ordenadas por urgência" para "mais antigas primeiro" (não existe regra de urgência). A frase "o que acontece se aprovar" segue vindo de `FRASE_DA_ACAO` em `lib/aprovacoes.ts`, exaustiva sobre o `ActionType` gerado.
- **Onde:** `src/routes/DecididasRecentemente.tsx:21` (`DecididasRecentemente`), `src/lib/decididas-queries.ts:13` (`useProjectDecidedActions`), `src/routes/PermissoesDoProjeto.tsx:26` (`PermissoesDoProjeto`), `src/routes/project-tabs.ts:258` (registro da sub-aba `permissoes`), `src/routes/code/PrListAndDiff.tsx:66` (`vazioExtra`).
- **Teste:** `src/routes/DecididasRecentemente.test.tsx` (automática com origem, negada com motivo, vazio, "Ver todas", erro), `src/routes/PermissoesDoProjeto.test.tsx` (as três de hoje, extraídas), `src/routes/project-tabs.test.tsx` (13 abas, deep-link `permissoes`), `src/routes/ProjectPrsTab.test.tsx` (vazio e fluxo).
- **Origem:** AT-895 (EP-035), ADR 0294. Fica de fora, declarado: Hipóteses (P17) sem o bloco "Exemplo", "Aprovar e criar regra" (rótulo) e o rodapé "0 agentes editando", que sai.

<a id="rn-1205"></a>

### RN-1205 — A sidebar mostra "Agentes agora" (até 5, por urgência, sem contagem de eventos) no lugar de Atividades, e as cores `--ag-*` do v9 entram nos dois temas {#rn-1205}

- **Regra:** "Atividades" (a árvore de eventos por agente, RN-198) sai; entra "Agentes agora": até 5 agentes do roster do projeto aberto, ordenados por urgência (aguardando, falhou, trabalhando, ocioso), cada um com avatar na cor do papel, nome e ponto de status (`travado` conta como falhou), sem contagem de eventos (RN-467). O "ver todos" para Executores saiu na AT-939 (RN-1329). Recolhida (48 px), só o avatar com `title`/`aria-label`. O roster sai de `deriveAgentRoster` sobre os eventos que a sidebar já lê, com a moldura do projeto como fonte de pendências e `moduleMap`, sem handoffs e sem requisição nova. WORKSPACE passa a rotular Containers, Providers, Gastos e Status (link novo para `/status`). Os oito `--ag-*` (criativo, po, arquiteto, dev, qa, secops, infra, psi) entram em `design/tokens.css` nos dois temas, com o piso de elemento (3:1) medido; qa passa a verde, infra a azul e dev-backend a teal. A Caixa de decisões fica para a AT-889 e o seletor de projeto para a AT-888.
- **Onde:** `src/lib/agentes-agora.ts` (`agentesAgora`), `src/components/AgentesAgora.tsx` (`AgentesAgora`), `src/routes/Shell.tsx` (`Shell`), `design/tokens.css`, `src/lib/agents.ts` (`AGENTS`).
- **Teste:** `src/lib/agentes-agora.test.ts`, `src/routes/Shell.test.tsx` (Agentes agora), `src/lib/contraste.test.ts`.
- **Origem:** AT-887 (EP-035), ADR 0294. Revoga a RN-198 e a chave `brabo.sidebar.agents`.

<a id="rn-1265"></a>

### RN-1265 — Configurações tem linhas de configuração e um Salvar no cabeçalho que cumpre a RN-469 {#rn-1265}

> **Complementada pela [RN-1489](parte-08.md#rn-1489) (AT-1005):** o Salvar da escada de modelos, que tem gesto próprio, fica no rodapé da seção, com a contagem de alterações; o gesto e a confirmação não mudam.

- **Regra:** (a linha vira grade com o controle ao lado do rótulo na AT-974, [RN-1455](parte-08.md#rn-1455).) Desde a AT-896 (lane F) as seções escalares (paralelismo e teto por área) mostram cada ajuste como linha (rótulo e descrição à esquerda, controle à direita) e a aba ganha, acima dos grupos, "N alterações não salvas · Descartar · Salvar". O Salvar do cabeçalho junta as linhas sujas de todas as seções montadas e as salva em SÉRIE, sem abortar na primeira recusa (RN-469): todas passaram diz a contagem; nenhuma passou diz a mensagem da api; algumas passaram diz "Salvou N de M" nomeando as que ficaram (`<seção>: <linha>`), que continuam sujas. Valor inválido bloqueia o botão e a barra diz quantos. Só as linhas escalares entram; converter modo de execução, arquivar e as chaves seguem com a confirmação própria. A linha "Teto de gasto do mês" usa o `TetoDoMes` (RN-1200) e o papel mínimo é o do endpoint (`maintainer`, RN-102): quem não pode vê o valor e o motivo em texto. Desde a AT-946 (P18) as linhas escalares (bloqueadas seguidas, teto por tarefa, paralelismo por área, teto por área) NÃO têm mais botão por seção: o Salvar do cabeçalho é o único gesto. A escada de modelos (lista), o teto de gasto do mês e a conversão de modo mantêm gesto próprio, com confirmação própria. Teto por tarefa e escada de modelos formam a seção "Teto por tarefa e escada de modelos" (`TetoPorTarefaSection`). **Desde a AT-973 o teto do mês tem um lugar só, o cartão `#teto` dos Gastos (RN-1450):** Configurações mostra só o valor, com "Editar em Gastos".
- **Onde:** `src/routes/settings/salvar-do-cabecalho.tsx:21` (`ProvedorDoSalvarDoCabecalho`), `src/routes/settings/salvar-do-cabecalho.tsx:100` (`BarraDeSalvar`), `src/routes/settings/secao-salvavel.helpers.ts:118` (`salvarSecao`), `src/routes/settings/LinhaDeConfiguracao.tsx:5` (`LinhaDeConfiguracao`), `src/routes/settings/TetoPorTarefaSection.tsx:39` (`TetoPorTarefaSection`), `src/routes/settings/CabecalhoDaSecao.tsx:5` (`CabecalhoDaSecao`).
- **Teste:** `src/routes/settings/salvar-do-cabecalho.test.tsx` (tudo em série e desfecho parcial nomeado).
- **Origem:** AT-896 lane F (EP-035), ADR 0294; revisada na AT-946 (P18).

<a id="rn-1275"></a>

### RN-1275 — A Caixa de decisões (`/decisions`) lê as cinco filas de todos os projetos numa leitura, sem somá-las, com Pendentes | Decididas {#rn-1275}

- **Regra:** a rota global `/decisions` (S07) lê `GET /workspaces/:workspaceId/decision-inbox?status=pending|decided` UMA vez por intervalo (nenhuma leitura por projeto) e mostra cinco cartões, um por fila (aprovações, PRs, promoções, arquitetura, hipóteses do Psicólogo), cada um com o próprio total e "N+" quando truncada (RN-180); as filas nunca se somam (RN-467). Aprovações e PRs usam o MESMO `ApprovalCard` e os mesmos endpoints, decidindo pelo `sessionId` da própria ação (RN-638); o merge em branch protegida segue manual (RN-418). A arquitetura diz que a data é emprestada da história e, em Decididas, mostra vazio com texto próprio. A sidebar ganha "Caixa de decisões" com ponto de presença (nunca número), lido do cache que o Início e a Caixa já buscaram (sem requisição própria, para não gastar o orçamento da moldura). O chip "Precisa de você" sai do cabeçalho do projeto.
- **Onde:** `src/routes/DecisionsPage.tsx` (`DecisionsPage`), `src/components/CaixaDeDecisoes.tsx` (`CaixaDeDecisoes`), `src/lib/caixa-de-decisoes.ts` (`caixaTemAlgo`), `src/routes/Shell.tsx` (`ItemDaCaixa`), `src/routes/ProjectPage.tsx`.
- **Teste:** `src/routes/DecisionsPage.test.tsx`, `src/routes/DecisionsPage.orcamento.test.tsx`.
- **Origem:** AT-889 (EP-035), ADR 0294, contrato da AT-928.

<a id="rn-1270"></a>

### RN-1270 — Instruções e ferramentas dos agentes moram em Configurações › Modelos, só leitura, e saem do cartão {#rn-1270}

- **Regra:** desde a AT-937 o catálogo de cada agente (identidade, instrução vigente do projeto e lista de ferramentas) é a seção `agent-catalog` do grupo Modelos, lida de `GET /projects/:projectId/agent-catalog` (`viewer`, sem controle de escrita nem `disabled` por papel, RN-102). A leitura só liga ao abrir um agente (RN-645) e usa a mesma `queryKey ['agent-catalog', projectId]` do composer. O histórico e a reversão de instruções continuam em Avançado (`maintainer`), com um botão na seção que leva até lá. O `AgentCard` perdeu os dois blocos, na Visão geral e na Executores (decisão do dono de 12/11/2026). Sem prévia nova: a divergência da v9 (que não tem a tela de Modelos) fica registrada na AT-897.
- **Onde:** `src/routes/settings/AgentCatalogSection.tsx:18` (`AgentCatalogSection`), `src/routes/settings/sumario.ts` (`SECOES_DE_CONFIGURACOES`), `src/routes/ProjectSettingsTab.tsx` (`ProjectSettingsTab`), `src/components/AgentCard.tsx` (`AgentCard`).
- **Teste:** `src/routes/settings/AgentCatalogSection.test.tsx` (lê só ao abrir; `ferramentas: null` não vira "sem ferramentas").
- **Origem:** AT-937 (EP-035), depende da AT-896 lane F.

<a id="rn-1280"></a>

### RN-1280 — A Visão geral abre com o que precisa de você e resume cada turno numa linha {#rn-1280}

- **Regra:** a Visão geral abre com a `FaixaPrecisaDeVoce`: o item mais urgente (primeira fila com itens de `montarFilas`) com o MESMO `ApprovalCard` e os mesmos endpoints, e as cinco filas em chips SEPARADOS, nunca somados (RN-467), lidas pela fila do PROJETO (RN-638). "O que aconteceu" alterna Turnos | Eventos: cada turno (`agent.response`) é um `ResumoDeTurno` com o "Gravado neste turno" do engine (RN-731), nunca o texto do modelo; sem `gravadoNoTurno` não há texto e sem `custoMicros` o custo é traço, nunca zero. O Próximo passo e o resumo de arquitetura moram na coluna lateral. A `ExecutionSection`, a árvore da linha do tempo e o `Ajuda` dela saíram (as ações de execução moram em Executores, AT-894).
- **Onde:** `src/components/FaixaPrecisaDeVoce.tsx` (`FaixaPrecisaDeVoce`), `src/routes/ProjectOverviewTab.tsx` (`ProjectOverviewTab`), `src/components/ResumoDeTurno.tsx` (`ResumoDeTurno`).
- **Teste:** `src/routes/ProjectOverviewTab.test.tsx` (faixa presente; turno sem `gravadoNoTurno` mostra traço).
- **Origem:** AT-890 (EP-035), ADR 0294.

<a id="rn-1300"></a>

### RN-1300 — Sem container `running`, o "Ativar execução" do Trabalho fica inerte e diz o motivo {#rn-1300}

- **Regra:** o `AtivarExecucao` lê o ciclo de vida do container (`getContainerLifecycle`, mesma `queryKey` do painel de código, sem leitura a mais). Com a leitura confirmando status diferente de `running` (inclusive sem registro), o botão fica desabilitado com o motivo em texto e o link para Containers. Leitura em curso ou com erro não tranca: quem decide é a api, e o 409 `execucao_sem_container` (RN-1101) aparece com a frase dela.
- **Onde:** `src/components/AtivarExecucao.tsx` (`AtivarExecucao`).
- **Teste:** `src/components/AtivarExecucao.test.tsx` (inerte sem `running`, habilitado com `running`, frase do 409).
- **Origem:** AT-899 (EP-036).

<a id="rn-1329"></a>

### RN-1329 — A sidebar mostra um projeto por vez: fora de projeto, PROJETOS é lista plana; dentro, o seletor e as oito seções do escolhido {#rn-1329}

- **Regra:** fora de projeto, PROJETOS é uma lista plana (ponto de status, nome, badge de aprovações pendentes e "+ Novo projeto"). Dentro de projeto, PROJETO traz o seletor com os projetos e "Novo projeto", e as oito seções do projeto escolhido logo abaixo; escolher outro projeto abre a aba padrão dele. Não há estado de expansão por projeto: `brabo.sidebar.open` não é mais lida. O recolhimento (RN-195) segue. O topo traz o chip do ambiente (`VITE_BRABO_AMBIENTE`), o atalho ⌘K/Ctrl K no Buscar e o item "Início". Revoga a RN-196 e a RN-729 (a parte "a sidebar abre só o projeto aberto"); a RN-1205 perde o "ver todos" de Agentes agora. Com altura útil abaixo de 800 px (`matchMedia('(max-height: 799px)')`, AT-964) e a sidebar expandida, os quatro links de Workspace viram uma linha "Workspace" que abre um menu com os quatro e "Recolher menu", o rótulo PROJETO some quando há projeto aberto, e Agentes agora lista só quem trabalha, espera ou falhou, mais "+ N parados · ver todos" (leva a Executores). O corpo da sidebar rola, com esmaecido de 20 px embaixo enquanto houver conteúdo abaixo e barra de rolagem ao passar o mouse; recolhida (48 px) não muda.
- **Onde:** `src/routes/Shell.tsx:329` (`SeletorDeProjeto`), `src/routes/Shell.tsx:377` (`Shell`), `src/lib/sidebar-state.ts:57` (`lerProjetoAtivo`).
- **Teste:** `src/routes/Shell.test.tsx` (lista plana fora de projeto, seletor e oito seções dentro, sem "ver todos"). Altura baixa e normal em `Shell — sidebar em altura baixa (AT-964)`.
- **Origem:** AT-939 (v9), decisão do dono de 13/11/2026.

<a id="rn-1331"></a>

### RN-1331 — A seção do roteador de ferramentas mostra o estado do Laya nomeado, com o "desde", e a opção Laya só ativa com `proficiente` {#rn-1331}

- **Regra:** Configurações › Modelos › Roteador de ferramentas é escolha do WORKSPACE (vale para todos os projetos) entre Jev (padrão), Laya e Desligado, gravada na hora; só `owner` troca, os outros veem a seção inerte com o motivo em texto. O estado do Laya aparece NOMEADO (nunca colapsado em ligado/desligado), com o texto do motivo quando a api o dá, o código bruto quando não o conhecemos e sempre "visto assim desde …" (o `desde` é de quando a api percebeu, não da queda); nunca bolinha verde. A opção Laya fica inerte fora de `proficiente`. Com `laya` escolhido e estado diferente de `proficiente`, um aviso fixo diz que cada passo usa o catálogo inteiro de ferramentas (RN-1302), nunca "voltou ao Jev". O 409 `roteador_local_indisponivel` vira toast com a frase da api e a tela relê o estado. A seção não polla (`FRESCOR_DA_CONFIGURACAO_MS`).
- **Onde:** `src/routes/settings/RoteadorDeFerramentasSection.tsx` (`RoteadorDeFerramentasSection`), `src/lib/api-client.ts` (`getWorkspaceToolRouter`, `setWorkspaceToolRouter`).
- **Teste:** `src/routes/settings/RoteadorDeFerramentasSection.test.tsx` (um caso por estado e motivo, não-owner, PUT, 409, aviso de queda).
- **Origem:** AT-626 (Rodada C), decisão do dono de 13/11/2026.

<a id="rn-1332"></a>

### RN-1332 — O cartão do QA e do SecOps diz o estado real do gate: tarefa bloqueada ou de volta na fila do dev nunca aparece como "Julgando" {#rn-1332}

- **Regra:** o `markBlocked` mantém `gate_status = awaiting_qa` sem emitir `pr.gate_changed`, então o último parecer não basta. (a) Um `backlog.task_blocked` da MESMA `taskId` depois do último `pr.gate_changed`/`infra.gate_changed` encerra o "trabalhando" do gate (`gateStatus` devolve `ocioso`; o carrossel e a aba Executores usam a mesma função), com o texto "A tarefa bloqueou: o gate espera a correção". (b) Se o backlog tem tarefa `todo` com `gateStatus` aberto do gate (`awaiting_qa` no QA, `awaiting_secops` no SecOps), o cartão diz "A PR #N espera voltar ao QA: a tarefa está na fila do dev" ou, com `blocked`, "… a tarefa está bloqueada"; esse estado vale mais que o último parecer. Os campos novos da api (`origin`, `blockedBy`) não são exigidos. O texto do dev travado aponta o botão que existe: "Use Rearmar aqui nas pendências ou em Executores."
- **Onde:** `src/lib/agent-status.ts` (`gateStatus`, `gateParadoPorBloqueio`), `src/lib/executores-ao-vivo.ts` (`cartaoDoGate`), `src/locales/*/executors.json` (`gateEsperaVolta*`, `gateEsperaDesbloqueio*`, `gateTarefaBloqueada`, `travado`).
- **Teste:** `src/lib/agent-status.test.ts`, `src/lib/executores-ao-vivo.test.ts`.
- **Origem:** AT-982 (achado 44), AT-985 (achado 34) e AT-984 (passo 8); Rodada 382.

<a id="rn-1333"></a>

### RN-1333 — Nenhum texto fica abaixo de 11 px e links e cabeçalhos de ordenação têm alvo de pelo menos 24 px {#rn-1333}

- **Regra:** o piso tipográfico é `--fs-label` (11 px); não existe token menor. Todo `font-size` dos `*.module.css` usa os tokens `--fs-*` (nenhum literal em px de 14,5 px para baixo), e as utilidades do kit (`text-[…px]`) e o texto do canvas seguem o mesmo piso. Links de texto ("Ver todas →") e cabeçalhos de ordenação das tabelas têm `min-height: 24px`, sem mudar o tamanho visual do texto.
- **Onde:** `src/tipografia-minima.test.ts` (`violacoes`), `src/components/FaixaPrecisaDeVoce.module.css` (`.verTodas`), `src/components/ui/Table.module.css` (`.ordenar`), `design/tokens.css` (`--fs-label`).
- **Teste:** `src/tipografia-minima.test.ts` (reprova `font-size` literal abaixo de 15 px nos módulos).
- **Origem:** AT-977 (EP-035), v11 de 14/11/2026.

<a id="rn-1353"></a>

### RN-1353 — O painel da sessão é UM só, com as abas Contexto, Executores e Pendências; abaixo de 1024 px ele é o Sheet {#rn-1353}

- **Regra:** o lado direito da sessão é um painel único de 360 px com `Tabs`: **Contexto** (o `ContextAside`, sem mudar o conteúdo), **Executores** (a lista da [RN-1303](#rn-1303); só em sessão criativa) e **Pendências** (o corpo de `PendenciasDeOutrasSessoes`, [RN-626](parte-05.md#rn-626), com o contador na aba). As filas continuam separadas dentro da aba e o contador não soma filas ([RN-467](parte-03.md#rn-467)); a aba mostra uma pergunta por vez, como o Sheet de antes. O contador "Pendências N" do cabeçalho e a faixa abrem o painel na aba certa. Abaixo de 1024 px (consulta própria `(max-width: 1023px)`; o corte da sidebar da [RN-643](parte-05.md#rn-643), 767 px, não muda) o painel é o `Sheet` do chat compacto, com as mesmas três abas, e nasce fechado. **Sempre montado:** recolhido, o painel segue montado (`hidden` no desktop, `keepMounted` no Sheet) e a aba Pendências mantém os ouvintes de `brabo:abrir-fila`/`brabo:abrir-perguntas` (que abrem o painel na aba Pendências, na fila pedida), o contador e o registro do cartão de merge no fio ([RN-843](parte-06.md#rn-843)); Contexto e Executores só montam com o painel aberto, sem leitura nova na rede. O `data-modo` do painel diz `aba` (desktop) ou `sheet`.
- **Onde:** `src/routes/PainelDaSessao.tsx` (`PainelDaSessao`), `src/lib/layout-movel.ts` (`usePainelEmSheet`), `src/components/PendenciasDeOutrasSessoes.tsx` (`modo="painel"`), `src/components/shadcn/sheet.tsx` (`keepMounted`), `src/routes/SessionPage.tsx` (montagem).
- **Teste:** `src/routes/PainelDaSessao.test.tsx`, `src/components/PendenciasDeOutrasSessoes.test.tsx`.
- **Origem:** AT-957 (EP-035), v10 de 14/11/2026; decisão do dono de 14/11/2026 na AT-954.

<a id="rn-1354"></a>

### RN-1354 — A execução vigente é uma faixa de 40 px que nunca cresce: progresso, quantos esperam e custo {#rn-1354}

- **Regra:** em sessão criativa com execução vigente, uma linha de 40 px fixos acima do fio mostra "x de N tarefas" (`role="progressbar"`, mesmo conjunto da [RN-794](parte-06.md#rn-794)), quantos executores esperam (aguardando, ocioso, bloqueado ou travado) e o custo total; o botão "Executores" abre o painel na aba Executores. Ela reforça a [RN-816](parte-06.md#rn-816): a coluna do chat não ganha altura com o número de executores. A região viva (`role="status"`) é só a contagem de espera.
- **Onde:** `src/routes/FaixaDeEstado.tsx` (`FaixaDeEstado`), `src/routes/FaixaDeEstado.module.css` (`.faixa`).
- **Teste:** `src/routes/FaixaEListaDeExecutores.test.tsx`.
- **Origem:** AT-957 (EP-035), v10 de 14/11/2026.

<a id="rn-1357"></a>

### RN-1357 — O composer é uma caixa só: o "Para" mora na barra de baixo, entre o "+" e o Enviar {#rn-1357}

- **Regra:** o composer da conversa é um único `InputGroup`: o campo em cima e, na barra de baixo, o "+" (menu de ações e "Endereçar handoff…"), o anexo, o destinatário ("Para: <agente>") e Parar/Enviar. A linha "Para" própria (51 px) deixou de existir; a doca (aviso + composer) cabe em 168 px com o aviso e 124 px sem. A regra do destinatário ([RN-631](parte-05.md#rn-631)) não muda: continua escolhido e visível, o envio trava sem escolha e o motivo é dito em texto; muda só o lugar. Ordem do Tab: campo, "+", destinatário, enviar. O contrato do E2E são `data-testid="destinatario-do-chat"` (o `select`) e `data-testid="enviar-mensagem"`.
- **Onde:** `src/routes/SessionComposer.tsx` (`PromptInputToolbar`), `src/routes/SessionComposer.module.css`.
- **Teste:** `src/routes/SessionPage.sugestoes-no-chat.test.tsx`, `src/routes/SessionComposer.ancora.test.ts`.
- **Origem:** AT-960 (EP-035), v10 de 14/11/2026.

<a id="rn-1358"></a>

### RN-1358 — O "Mergear" confirma num Popover do próprio botão, e o merge segue gesto humano {#rn-1358}

- **Regra:** o botão "Mergear" do `MergearNoChat` (aviso de PR pronta, fila de prontas e cartão da PR) abre um `Popover` com "Mergear #N em <alvo>?", Confirmar e Cancelar; Esc fecha e o foco volta ao botão. Confirmar propõe o `git_merge` (ator `user`) e o aprova no mesmo gesto, pelos mesmos endpoints; nada muda na proposição ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418), [RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)).
- **Onde:** `src/routes/MergearNoChat.tsx`.
- **Teste:** `src/routes/MergearNoChat.test.tsx` ("Popover; Esc fecha").
- **Origem:** AT-960 (EP-035), v10 de 14/11/2026.

<a id="rn-1387"></a>

### RN-1387 — A aba Arquitetura mostra os contratos vigentes por módulo, com o tipo de cada item {#rn-1387}

- **Regra:** abaixo do diagrama C4 e dos ADRs, a seção "Contratos entre módulos" lista, por módulo, o que ele expõe (`contratos` de `GET /projects/:id/backlog/architecture`, [RN-684](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-684)): o tipo (`funcao`, `rota`, `evento`, `dado`, `tabela`, `identidade`), a assinatura e a descrição. `tabela` e `identidade` levam o Badge de destaque. Sem contrato declarado, a seção diz que o Arquiteto ainda não declarou; erro e carga seguem os estados da aba ([RN-088](parte-01.md#rn-088)). Só leitura.
- **Onde:** `src/routes/ProjectArchitectureTab.tsx`, `src/routes/ProjectArchitectureTab.module.css`.
- **Teste:** `src/routes/ProjectArchitectureTab.test.tsx` ("tabela agendamento sob agenda").
- **Origem:** AT-981 (EP-036).

<a id="rn-1388"></a>

### RN-1388 — O evento `artifact.module_contracts` aparece na timeline com rótulo próprio {#rn-1388}

- **Regra:** o fio da sessão rotula o evento do contrato declarado ("declarou o contrato entre módulos") e o cartão de artefato lista os módulos do contrato (`contratos[].modulo`); antes o evento caía sem rótulo. A recusa do contrato é erro da ferramenta, não evento, e não ganha rótulo.
- **Onde:** `src/lib/timeline-tree.ts`, `src/lib/artefato-do-fio.ts`, `src/locales/*/executors.json` (`artifactModuleContracts`).
- **Teste:** `src/lib/artefato-do-fio.test.ts`.
- **Origem:** AT-981 (EP-036).

<a id="rn-1392"></a>

### RN-1392 — Cada turno mostra UMA linha de trabalho que abre no lugar: raciocínio, consultas e passos dentro {#rn-1392}

- **Regra:** o `agent.response` encerrado ganha, depois da bolha, um só `Trace` recolhido ("Trabalhou 14,0 s · 5 passos") no lugar dos três blocos separados (passos, raciocínio, "Consultado neste turno"). Ao abrir, mostra nessa ordem o `Reasoning` (`data-testid` `raciocinio-do-turno`), o "Consultado neste turno" e os passos (`PassosDoTurno`, com o seletor da RN-1185). A duração é o `duracaoMs` do fecho do turno, nunca relógio da tela; sem o campo o título diz "Trabalhou · N passos", sem "0 s". Turno sem passos, raciocínio nem fontes não gera linha. O raciocínio só chega a quem a api autoriza (ADR 0249, RN-993): o web mostra o que vier. A linha não conta no corte do fio (RN-974, RN-644) e a chave é `${event.id}-trabalho`.
- **Onde:** `src/components/ai-elements/linha-de-trabalho.tsx:21` (`LinhaDeTrabalho`), `src/routes/session-timeline-montagem.tsx:1033` (`LinhaDeTrabalho`).
- **Teste:** `src/components/ai-elements/linha-de-trabalho.test.tsx`, `src/routes/session-timeline-montagem.raciocinio.test.tsx`.
- **Origem:** AT-958 (EP-035), v10 (K02).

<a id="rn-1393"></a>

### RN-1393 — Durante o turno a linha de trabalho nasce aberta, com o título em brilho e sem segundos {#rn-1393}

- **Regra:** a faixa do turno (`TurnActivityStrip`) põe o raciocínio em curso, o plano (RN-967) e os passos dentro da MESMA `LinhaDeTrabalho`, aberta, "Trabalhando · N passos". Não há duração em curso (a fonte é o `duracaoMs` do fecho), então o "9 s" da prancha não existe. O brilho é o `Shimmer` e respeita `prefers-reduced-motion`. A faixa continua montada acima da doca; levá-la ao fio é da AT-959. Quando a resposta chega, a faixa some e o turno passa a ter a linha fechada da RN-1392.
- **Onde:** `src/components/TurnActivityStrip.tsx:49` (`TurnActivityStrip`), `src/components/ai-elements/linha-de-trabalho.tsx:21` (`LinhaDeTrabalho`).
- **Teste:** `src/components/ai-elements/linha-de-trabalho.test.tsx`, `src/components/TurnActivityStrip.test.tsx`.
- **Origem:** AT-958 (EP-035).

<a id="rn-1395"></a>

### RN-1395 — Com chave de nuvem, o time no modelo local não é "modelo aplicado" {#rn-1395}

- **Regra:** no passo `modelo` dos Primeiros passos (RN-708), o time no modelo LOCAL (o `modelId` do Criativo está em `modelsByCategory.local`, da mesma `['models', projectId]` que a Visão geral já lê) só conta como feito quando a conta NÃO tem credencial de nuvem. Com chave de nuvem, o passo fica pendente: "O time está no modelo local ‹nome›. Escolha um modelo do seu provedor.", com "Escolher o modelo" e o botão "Aplicar ‹Haiku› ao time · ‹preço›" (o Haiku APTO mais barato do catálogo ativo: com chamada de ferramentas, RN-040, e disponível; preço desconhecido, RN-470, vai para o fim; o preço no botão vem de `formatarPreco`; AT-1024), que grava o modelo do PROJETO (`PUT /projects/:id/model-binding`, `maintainer`, RN-102). Sem o papel, ou sem o Haiku ativo no catálogo (RN-043), o botão fica inerte com o motivo visível; falha da api é dita ao lado. A leitura de credenciais passa a ligar também com o time no modelo local (com modelo de nuvem segue desligada, orçamento da Visão geral). Sem a lista de modelos lida, o cartão espera (RN-470).
- **Onde:** `src/lib/primeiros-passos.ts` (`derivarPrimeirosPassos`), `src/components/PrimeirosPassos.helpers.ts` (`useModeloDoTime`), `src/components/PrimeirosPassos.tsx`.
- **Teste:** `src/lib/primeiros-passos.test.ts`, `src/routes/ProjectOverviewTab.test.tsx` ("time no modelo local").
- **Origem:** AT-986 (EP-035), decisão do dono de 17/11 (P1 = A).

<a id="rn-1396"></a>

### RN-1396 — "Começar a ideação" cria e abre a sessão do Criativo {#rn-1396}

- **Regra:** o passo `ideacao` dos Primeiros passos e o "Próximo passo" que o reusa deixam de ser link para a lista de sessões: o botão "Começar a ideação" cria, ativa e abre a sessão `criativa` pelo `useCriarSessao` (a régua única da RN-1210), desabilitado enquanto cria. Papel mínimo `developer` (RN-102); sem ele o botão fica inerte com o motivo visível.
- **Onde:** `src/components/ComecarIdeacao.tsx`, `src/components/PrimeirosPassos.tsx`, `src/components/ProximoPasso.tsx`.
- **Teste:** `src/routes/ProjectOverviewTab.test.tsx` ("Começar a ideação" cria, ativa e abre a sessão).
- **Origem:** AT-986 (EP-035).

<a id="rn-1397"></a>

### RN-1397 — "Tarefas sem módulo" e `ligar_modulo` só valem com a execução ativa {#rn-1397}

- **Regra:** antes do plano do Dev Lead (sem execução ativa) atribuir o módulo da tarefa é trabalho dele (RN-678), não pendência do dono. A fila "Tarefas sem módulo" (RN-1085) só aparece com a execução ativa, e o próximo passo `ligar_modulo` (RN-1162) só vale com `execucaoAtiva`. Sem execução, a fila e o passo somem, sem texto no lugar.
- **Onde:** `src/components/PendenciasDeOutrasSessoes.tsx` (`semModulo`), `src/lib/proximo-passo.ts` (`PASSOS`).
- **Teste:** `src/lib/proximo-passo.test.ts`, `src/components/PendenciasDeOutrasSessoes.test.tsx` (RN-1397).
- **Origem:** AT-986 (EP-035), decisão do dono de 17/11 (P2 = A).

<a id="rn-1389"></a>

### RN-1389 — A Sessão ocupa a janela: só o fio rola {#rn-1389}

- **Regra:** a página da sessão tem a altura da janela e não rola; barra, faixa de estado, avisos e doca (aviso de PR, fila e composer) têm altura de conteúdo e não encolhem, e o fio (`role="log"`) é o único elemento com rolagem vertical. O composer nunca fica cortado ([RN-751](parte-06.md#rn-751), item 1, não muda).
- **Onde:** `src/routes/SessionPage.module.css` (`.wrapper`, `.chatColumn`, `.messages`).
- **Teste:** `src/routes/SessionPage.altura-fixa.test.ts` (estrutura do CSS; a altura medida é do Playwright).
- **Origem:** AT-956 (EP-035), v10 de 14/11/2026.

<a id="rn-1390"></a>

### RN-1390 — A barra da sessão tem 56 px {#rn-1390}

- **Regra:** no desktop a barra da sessão tem 56 px (eram 60); abaixo de 1024 px ela quebra linha e fica com altura automática, como antes.
- **Onde:** `src/routes/SessionPage.module.css` (`.topbar`).
- **Teste:** `src/routes/SessionPage.altura-fixa.test.ts`.
- **Origem:** AT-956 (EP-035).

<a id="rn-1391"></a>

### RN-1391 — Com pendência, execução e aviso de PR, o fio tem ao menos 70% da coluna em 1366 × 768 {#rn-1391}

- **Regra:** o orçamento da coluna do chat em 1366 × 768 é 768 − 56 (barra) = 712; faixa de 40, aviso de PR de 44 e composer de 124 deixam 504 px para o fio (70,8%). Revê o critério de 70% da AT-950 sem afrouxar. Se o `ModoAutomaticoNoChat` estourar a folga, ele vai para o topo da aba Executores, com o mesmo predicado.
- **Onde:** `src/routes/SessionPage.module.css`; medida em `brabo-qa` (`sessao-e-canal-altura`, AT-956).
- **Teste:** `src/routes/SessionPage.altura-fixa.test.ts` (conta do orçamento).
- **Origem:** AT-956 (EP-035).

<a id="rn-1408"></a>

### RN-1408 — A aba Executores agrupa as tarefas por rodada, calculada no web {#rn-1408}

- **Regra:** quando alguma tarefa não arquivada depende de outra (`Task.dependeDe`, RN-1372), a aba Executores mostra o plano da execução em grupos "Rodada N de M". Só a rodada em curso (a primeira com lane não mergeada) nasce aberta; as outras são uma linha ("Rodada 1 · 3 mergeadas") que abre no clique. O nível de uma tarefa é 1 mais o maior nível das suas dependências (sem dependência, 1); a api não manda nível. Sem dependência nenhuma, ou só com tarefa arquivada, o plano não aparece (é uma rodada só).
- **Onde:** `src/lib/plano-por-rodada.ts` (`planoPorRodada`), `src/routes/ListaDeExecutores.tsx`.
- **Teste:** `src/lib/plano-por-rodada.test.ts`, `src/routes/FaixaEListaDeExecutores.test.tsx`.
- **Origem:** AT-993 (EP-035, AT-952 desenho 5).

<a id="rn-1409"></a>

### RN-1409 — Cada lane diz a etapa {#rn-1409}

- **Regra:** a etapa vem de `status` e `gateStatus`: `done` = mergeada; `in_progress` = implementando; `in_review` com gate aberto = no gate; `in_review` sem gate = pronta; `todo` = esperando (há dependência não mergeada) ou na fila. Cor só no que pede ação: verde mergeada, amarelo esperando, azul (`--ag-infra`) pronta (espera o merge de quem decide) e no gate; implementando e na fila ficam neutros. A linha diz o agente que executa (`assignedTo`, ou o dev do módulo). Filas não são somadas num número só (RN-467).
- **Onde:** `src/lib/plano-por-rodada.ts` (`etapaDaTarefa`, `agente`), `src/routes/ListaDeExecutores.tsx` (`TOM_DA_ETAPA`).
- **Teste:** `src/lib/plano-por-rodada.test.ts`.
- **Origem:** AT-993 (EP-035).

<a id="rn-1410"></a>

### RN-1410 — A lane que espera diz por quê, e a rodada é só visão {#rn-1410}

- **Regra:** a lane com dependência não mergeada mostra o que falta: "Espera `criarAcesso` da tarefa «título» entrar na main", com os símbolos de `levantamento.expoe` da dependência (os que a lane consome, de `levantamento.consome`, quando casam); sem levantamento, "Espera «título» entrar na main"; com mais de uma, o primeiro título e a contagem. A rodada não tem botão nem barreira: nada de "fechar rodada"; a única barreira é a rodada de integração, que não é desenhada aqui (RN-1005 segue valendo no claim).
- **Onde:** `src/routes/ListaDeExecutores.tsx` (`plano-por-rodada`).
- **Teste:** `src/routes/FaixaEListaDeExecutores.test.tsx`.
- **Origem:** AT-993 (EP-035), decisão 3 da AT-951/952 (14/11).

<a id="rn-1405"></a>

### RN-1405 — "Ir ao fim · N novas" e a âncora ao enviar {#rn-1405}

- **Regra:** revisa a [RN-977](parte-06.md#rn-977), que mantém limiar de 80 px, pausa, gatilhos e `?highlightEvent`. Com o fio pausado, o botão diz "Ir ao fim · N novas", onde N é o número de mensagens (`chat.message` e `agent.response`) com `seq` maior que o do último evento visto quando a pessoa subiu; o clique, ou a volta ao fim, zera. Ao ENVIAR uma mensagem (não ao enfileirar), o fio retoma o acompanhamento e sobe o turno do usuário (`[data-autor="voce"]`) ao topo da janela; quando a resposta passa da janela vale o "segue no fim". A casca é o Message Scroller do kit, sem `use-stick-to-bottom`: quem decide seguir ou pausar continua sendo `useRolagemDoFio`.
- **Onde:** `src/lib/session-rolagem.ts` (`useRolagemDoFio`, `novasDepoisDe`, `ancorarNoEnvio`), `src/components/shadcn/message-scroller.tsx`, `src/routes/SessionPage.tsx` (`enviarMensagem`).
- **Teste:** `src/lib/session-rolagem.test.tsx` (novas, âncora).
- **Origem:** AT-959 (EP-035), v10 de 14/11/2026.

<a id="rn-1406"></a>

### RN-1406 — O turno antigo fica em 3 linhas {#rn-1406}

- **Regra:** revisa a [RN-1185](#rn-1185) no trecho da mensagem inteira. Toda `agent.response` que não é a última do fio fica recolhida em 3 linhas (`line-clamp` por CSS, o próprio texto, sem resumo gerado) e tem "Ver resposta inteira" quando passa de 240 caracteres ou de 3 linhas; o texto inteiro permanece no DOM. A última resposta não recolhe (RN-138).
- **Onde:** `src/routes/TextoDoAgente.tsx`, `src/routes/session-timeline-montagem.tsx` (`ultimaRespostaId`).
- **Teste:** `src/routes/TextoDoAgente.test.tsx`.
- **Origem:** AT-959 (EP-035), decisão do dono de 14/11/2026.

<a id="rn-1407"></a>

### RN-1407 — O trilho de turnos mostra só o carregado {#rn-1407}

- **Regra:** à direita do fio, em 28 px, um ponto por mensagem da janela de eventos já baixada (RN-632, nenhuma leitura nova), na cor do agente; âmbar quando o agente tem ação `pending`. Passar o mouse mostra o turno (`HoverCard`); clicar leva a ele; cada ponto é um botão com nome acessível. Se a janela não começa no primeiro evento (`events[0].seq > 1`), o trilho marca "…" e diz que mostra só os turnos carregados. Some abaixo de 768 px e com menos de 2 pontos.
- **Emenda (AT-1034):** o trilho cabe no padding lateral do fio (`right: calc(-1 * var(--space-4))`), sem criar rolagem horizontal; antes passava 6 px e o fio rolava de lado. Teste: `src/routes/SessionPage.largura.test.ts`.
- **Onde:** `src/routes/TrilhoDeTurnos.tsx`, `src/lib/trilho-de-turnos.ts` (`pontosDoTrilho`).
- **Teste:** `src/routes/TextoDoAgente.test.tsx` (trilho).
- **Origem:** AT-959 (EP-035).

<a id="rn-1426"></a>

### RN-1426 — "Gasto por agente" lê o resumo da sessão {#rn-1426}

- **Regra:** o bloco "Gasto por agente" do painel de contexto usa a mesma fonte do custo da faixa de execução, o resumo de gasto da sessão (`GET /projects/:projectId/sessions/:sessionId/token-usage`, AT-931), e não a soma do `custoMicros` dos eventos baixados. Só aparecem agentes com custo maior que zero. Nenhuma rota nova.
- **Onde:** `src/routes/ContextAside.tsx` (`aside-gasto`), `src/lib/hooks.ts` (`useSessionTokenUsage`).
- **Teste:** `src/routes/ContextAside.gasto.test.tsx`.
- **Origem:** AT-978 (EP-035), v11 de 14/11/2026.

<a id="rn-1427"></a>

### RN-1427 — "Sem gasto ainda" só quando o resumo veio com zero {#rn-1427}

- **Regra:** enquanto o resumo não chegou o bloco mostra carregando; se a leitura falha, mostra "Não foi possível ler o gasto da sessão" (EP-020: erro nunca vira estado vazio). "Sem gasto ainda" só aparece quando o resumo chegou sem custo. Com gasto de execução acima de zero o texto não está no documento.
- **Onde:** `src/routes/ContextAside.tsx`, `aside.gastoErro` e `aside.gastoVazio` em `sessionPage.json` (4 idiomas).
- **Teste:** `src/routes/ContextAside.gasto.test.tsx`.
- **Origem:** AT-978 (EP-035).

<a id="rn-1428"></a>

### RN-1428 — A sessão de execução usa a página da v10 e se chama "Execução · #hash" {#rn-1428}

- **Regra:** a sessão de execução não tem layout próprio: é a mesma `SessionPage` da v10 (altura fixa RN-1389, faixa de 40 px e painel com abas RN-1353, composer em caixa RN-1357). Sem nome, o título diz o tipo: "Execução · #6fcfa54b"; com nome vale o nome (RN-098); sessão que não é de execução segue "Sessão #hash".
- **Onde:** `src/routes/SessionTopbar.tsx` (`topbar.tituloExecucao`, `TIPO_DE_EXECUCAO`).
- **Teste:** `src/routes/SessionTopbar.test.tsx` (AT-978).
- **Origem:** AT-978 (EP-035).
