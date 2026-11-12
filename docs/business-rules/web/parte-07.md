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
- **Onde:** `apps/web/src/lib/artefato-do-fio.ts:11` (`camposDoArtefato`), `apps/web/src/routes/session-timeline-montagem.tsx:138` (`ARTEFATOS_DO_FIO`).
- **Onde:** `apps/web/src/lib/artefato-do-fio.ts:11` (`camposDoArtefato`), `apps/web/src/routes/session-timeline-montagem.tsx:140` (`ARTEFATOS_DO_FIO`).
- **Teste:** `apps/web/src/lib/artefato-do-fio.test.ts` (um caso por tipo e payload sem campo opcional).
- **Origem:** AT-683 (EP-031).

<a id="rn-980"></a>

### RN-980 — As Configurações do projeto são uma página por grupo, com os grupos como abas dentro da página; só o grupo aberto monta {#rn-980}

- **Regra:** revisa a [RN-645](parte-05.md#rn-645) no item 3. O sumário lateral deixa de existir: cada grupo do registro (`modelos`, `projeto`, `pessoas`, `avancado`) é uma PÁGINA, e os quatro são ABAS numa faixa no topo da página de Configurações (setas, Home e End; `aria-selected`/`aria-controls`); "Configurações" segue UM item só da barra lateral, sem sub-itens (decisão do dono, 03/11). O endereço é `?tab=settings&group=<grupo>`; Modelos é a página padrão. `?section=` continua valendo: abre a página do grupo da seção e rola até ela, e vence um `group` incoerente; chave aposentada ([RN-911](parte-06.md#rn-911)) ou desconhecida abre Modelos no topo. O grupo é derivado do campo `grupo` do registro, nunca de outra lista. Só as seções do grupo aberto montam, então a carga busca só o que é da página (abrindo em Modelos, no máximo 21 requisições, contra 30; teto em `configuracoes.orcamento.test.tsx`). Os itens 1 e 2 da RN-645 (frescor de um minuto, sem poll) não mudam, e trocar de página dentro do minuto não refaz busca. Trocar de página descarta rascunho não salvo, como trocar de aba.
- **Onde:** `apps/web/src/routes/settings/sumario.ts:110` (`grupoDaSecao`), `apps/web/src/routes/settings/sumario.ts:115` (`resolverGrupo`), `apps/web/src/routes/ProjectSettingsTab.tsx:63` (`ProjectSettingsTab`).
- **Teste:** `apps/web/src/routes/settings/paginas-por-grupo.test.tsx` (página só com as seções do grupo; todo `?section=` antigo cai no seu grupo; rola até a seção), `apps/web/src/routes/configuracoes.orcamento.test.tsx` (carga de Modelos não busca o resto), `apps/web/src/routes/settings/paginas-por-grupo.test.tsx` (a faixa de abas e o teclado).
- **Origem:** AT-719 (EP-031).

<a id="rn-981"></a>

### RN-981 — Na Sessão, as caixas de pergunta e de aprovação ficam na borda do fio, e o contexto e o esqueleto de carregamento ganham o tratamento R3 {#rn-981}

- **Regra:** revisa a [RN-171](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-171) e a [RN-173](parte-02.md#rn-173) no alinhamento: a caixa de pergunta estruturada e o contêiner da ação no fio deixam de ser centralizados (`margin: auto`) e ficam encostados na borda esquerda do fio, mantendo o teto de 560px. Decisão do dono (03/11/2026). O resto da RN-171 (texto livre) e da RN-173 (um só `ApprovalCard`) fica. Junto: o botão do contexto tem só ícone, com legenda "Recolher contexto"/"Abrir contexto" e `aria-expanded`; o fio mostra "Carregando sessão…" com esqueleto na mesma condição que adia o convite (RN-131); "Arquivos tocados" é um `Disclosure` com a contagem; a faixa de sessão encerrada tem ícone, título e explicação, e "Reabrir sessão" segue com a regra de papel da RN-650.
- **Onde:** `apps/web/src/routes/SessionPage.module.css:1261` (`.acaoNoFio`), `apps/web/src/routes/SessionFio.tsx:59` (`SessionFio`), `apps/web/src/routes/SessionTopbar.tsx:101` (`SessionTopbar`).
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
- **Onde:** `apps/web/src/routes/session-timeline-montagem.tsx:151` (`montarTimeline`).
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

- **Regra:** o `execution.stalled` que o engine grava ([RN-1059](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-1059): todos os dev agents parados, tarefa pendente atrás de tarefa bloqueada ou de agente travado) aparece em vermelho no feed de atividade, nomeando as tarefas e os agentes que seguram a execução. Na sessão de execução ele vira uma mensagem do fio (`data-testid="execucao-parada"`) e, acima do time, na aba Executores, o mesmo aviso. Sob ele, `DestravarExecucao` traz um **Rearmar** por agente travado (`rearmDevAgent`, [RN-047](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-047)) e um **Desbloquear** por tarefa bloqueada (`unblockTask`, [RN-826](parte-06.md#rn-826)), com as mesmas rotas dos atalhos do chat. Os botões só existem enquanto a parada é VIGENTE: o último evento entre `execution.stalled`, `dev.working`, `dev.rearmed` e `backlog.task_unblocked` é um `execution.stalled`; depois do destrave o aviso fica no histórico, sem botões. Papel abaixo de `developer` vê os botões inertes e o motivo em texto; a recusa da api vira toast com a frase dela. A web não decide nada: só lê o payload do engine.
- **Onde:** `apps/web/src/lib/execution.ts:169` (`execucaoParadaDe`), `apps/web/src/routes/DestravarExecucao.tsx:25` (`DestravarExecucao`), `apps/web/src/lib/activity.ts:218` (`classifyEvent`), `apps/web/src/routes/ProjectExecutorsTab.tsx:204` (`paradaVigente`).
- **Teste:** `apps/web/src/routes/DestravarExecucao.test.tsx`, `apps/web/src/lib/execution.test.ts`, `apps/web/src/lib/activity.test.ts`.
- **Origem:** AT-800 (EP-030), parte web; engine#57.

<a id="rn-1062"></a>

### RN-1062 — O cartão do plano mostra o teto do projeto e das áreas dev/qa, avisa quando a estimativa passa do que resta e ajusta o teto da área dev ali {#rn-1062}

- **Regra:** o "custo esperado" do plano do Dev Lead é o teto POR TAREFA × tarefas ([RN-802](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-802)), não o preço. Enquanto o plano está pendente, logo abaixo dele o cartão mostra o teto do projeto (`GET /projects/:id/budget`, `maintainer`; para papel abaixo a linha do projeto some) e o das áreas `dev` e `qa` (`GET .../agent-areas`), cada um com o gasto, ou "sem teto" ([RN-443](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-443)). Quando a estimativa passa do que resta (`limite − gasto`, nunca negativo) do MENOR teto aplicável, entre o do projeto (só com política `block`; `allow` não para nada) e o da área `dev`, aparece um aviso `warning` com o que resta e a frase "a execução para quando o teto for atingido; a estimativa é o teto por tarefa, não o preço". O aviso NÃO trava o Aprovar ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)). "Ajustar teto" (ícone e rótulo) abre na própria linha um campo em dólar para o teto da área `dev` só, com Salvar e Cancelar (`setAreaBudget`; vazio = sem teto, como na [RN-980](#rn-980)); abaixo de `maintainer` fica inerte, com o motivo em texto (ADR 0064). "Outros tetos" abre `?section=budget` em outra aba: o teto do projeto, que tem política, segue em Configurações. Reusa as chaves de cache `['budget', projectId]` e `['agent-areas', projectId]`; sem `QueryClient` (teste isolado do card) nada é lido nem mostrado.
- **Onde:** `apps/web/src/components/TetoDoPlano.tsx:33` (`TetoDoPlano`), `apps/web/src/components/TetoDoPlano.helpers.ts:15` (`menorTetoAplicavel`), `apps/web/src/components/ApprovalCard.tsx:436` (`TetoDoPlano`).
- **Teste:** `apps/web/src/components/ApprovalCard.teto-do-plano.test.tsx`.
- **Origem:** AT-808 (EP-031); decisão do dono, 07/11/2026 (ajuste só da área dev; o aviso não trava).

<a id="rn-1063"></a>

### RN-1063 — PR que entra na fila de prontas avisa na borda do fio e no título da aba, com Mergear e o tempo de espera, e se dispensa {#rn-1063}

- **Regra:** estende a [RN-825](parte-06.md#rn-825)/[RN-841](parte-06.md#rn-841). Quando há PR pronta para o dono mergear (a fila `prontas`: gates aprovados, ou PR sem tarefa), um `Alert` accent fica FIXO na borda do fio, entre o fio e o composer (RN-981), com `role="status"`: "PR #3 "título" está pronta para você mergear: os gates passaram", com "Pronta há N min" (sobre o `updatedAt` da tarefa da PR, quando há) e o `MergearNoChat` com a confirmação na linha (AT-753 P1). Com várias: "N PRs prontas para você mergear" e "Ver as N", que abre a aba `prontas` ([RN-975](parte-06.md#rn-975)). "Agora não" dispensa as PRs avisadas; o aviso só volta se ENTRAR uma PR nova. Quando a PR sai da fila (mergeada), o aviso some. O título da aba mostra o contador enquanto houver PR pronta ("(1) Brabo"), mesmo com o aviso dispensado, e volta ao normal quando a fila esvazia. PR que ENTRA na fila (na primeira leitura, as que já esperavam) abre sozinha a aba `prontas` do painel de pendências quando nenhuma está aberta (exceção declarada à "nenhuma aba nasce aberta" da RN-975). Sem evento novo, sem mudança em api ou engine e sem notificação do navegador: o aviso lê as mesmas prontas do painel (`usePrsProntas`, cache compartilhado), pela releitura de 15 s do backlog. O merge segue gesto humano ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418)/[RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)): o aviso só oferece o `MergearNoChat`.
- **Onde:** `apps/web/src/components/AvisoDePrPronta.tsx:29` (`AvisoDePrPronta`), `apps/web/src/lib/prs-prontas.ts:14` (`usePrsProntas`), `apps/web/src/lib/saidas-da-fila.ts:30` (`entradasDaFila`), `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:172` (`idsDasProntas`), `apps/web/src/routes/SessionPage.tsx:825` (`AvisoDePrPronta`).
- **Teste:** `apps/web/src/components/AvisoDePrPronta.test.tsx`, `apps/web/src/lib/saidas-da-fila.test.ts`, `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`.
- **Origem:** AT-810 (EP-031); decisão do dono, 07/11/2026 (aviso fixo na borda do fio; contador no título da aba; sem notificação do navegador).

<a id="rn-1072"></a>

### RN-1072 — O chat de sessão criativa mostra os executores da execução vigente num carrossel manual acima do fio, que se minimiza e some quando a execução termina {#rn-1072}

- **Regra:** quando a sessão aberta é `kind=criativa` e há execução vigente ([RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139)) com `module_map`, uma faixa FIXA acima do fio (RN-816), logo abaixo das pendências de outras sessões, mostra um cartão por executor: os dev agents (um por módulo) e, com evidência (`pr.gate_changed`, `artifact.qa_verdict`/`artifact.secops_verdict`, `delegation.*`), QA e SecOps em cartões próprios, com o gate que julgam, a PR, o último veredito e há quanto tempo. A lista lê a sessão de execução (outra sessão, mesmas chaves de cache de `useAgentesTravados`) e se mantém viva pelo heartbeat dela; sem endpoint nem evento novo. O cabeçalho traz "x de N tarefas" (`done` sobre o backlog vigente, mesmo conjunto da [RN-794](parte-06.md#rn-794)) com barra `role="progressbar"`, a contagem por estado, o custo total e o link para Executores. O casco é o `ui/Carousel` ([RN-148](parte-02.md#rn-148)) com páginas de 3 cartões (1 no celular), SEM autoplay (decisão do dono), e `anunciar={false}` para não falar a cada evento: só o resumo tem `role="status"`. A ordem é a de atenção primeiro: travado, bloqueado, falhou, trabalhando, aguardando, ocioso, concluído, e dentro do estado a do `module_map`. Cada cartão mostra o estado (badge), a tarefa, o texto do estado, a última ação, o tempo (minutos, sem tique), o custo (`token-usage` da execução) e "Ver no fio" (`?highlightEvent=` do último evento). **Minimizar:** um botão com `aria-expanded` reduz cada executor a um chip com nome, estado, tempo e gasto (somem tarefa, última ação, motivo e link do fio) e a barra continua; a escolha fica em `localStorage` (`brabo:carrossel-de-executores:minimizado`, em try/catch) e vale ao recarregar; sem escolha salva, o celular abre minimizado (o "recolhido" do levantamento é o mesmo estado). **Fim:** quando a execução deixa de ser a vigente, a faixa vira uma linha de resumo ("execução concluída" com todas as tarefas `done`, senão "execução parada") com o "x de N", o custo e "Ver Executores", dispensável no ×.
- **Onde:** `apps/web/src/components/CarrosselDeExecutores.tsx:71` (`CarrosselDeExecutores`), `apps/web/src/lib/executores-ao-vivo-query.ts:23` (`useExecutoresAoVivo`), `apps/web/src/lib/executores-ao-vivo.ts:212` (`cartoesDaExecucao`), `apps/web/src/components/ui/Carousel.tsx:47` (`anunciar`, Home/End), `apps/web/src/routes/SessionPage.tsx:775` (montagem).
- **Teste:** `apps/web/src/components/CarrosselDeExecutores.test.tsx`, `apps/web/src/lib/executores-ao-vivo.test.ts`, `apps/web/src/components/ui/Carousel.test.tsx`.
- **Origem:** AT-880 (EP-031); decisão do dono, 09/11/2026 (carrossel manual, resumo no fim, atenção primeiro, devs + QA + SecOps, minimizar).

<a id="rn-1073"></a>

### RN-1073 — O motivo do ócio do dev agent é derivado no web do `module_map` e do backlog, com o predicado da RN-1005; sem causa achada, diz "sem tarefa disponível agora" {#rn-1073}

- **Regra:** o `dev.idle` do engine só diz "sem task pegável" (ou a pausa de rede, [RN-864](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules.md#rn-864)), e o claim vazio é decidido na api por [RN-1005](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1005): a tarefa do módulo só sai enquanto nenhum módulo do `dependsOn` DIRETO tiver tarefa aberta. O web relê esse predicado para o cartão, em ordem: (a) pausa de rede: o próprio `reason`; (b) o módulo não tem tarefa aberta: concluído; (c) o módulo tem tarefa aberta e algum `dependsOn` tem tarefa ≠ `done`: "esperando a fundação de X" com a PR aberta da tarefa de X (branch `feature/task-<id>`) ou o título da tarefa em andamento, e com várias dependências "esperando N módulos; o primeiro a destravar é X" (o que tem PR); (d) todas as tarefas abertas bloqueadas: "tarefa bloqueada" com o motivo; (e) fora disso, "sem tarefa disponível agora", nunca um motivo inventado. A tarefa ainda não pega não tem `module`: ela herda os `moduleIds` da história (AT-881), que o backlog já manda. `Task.module` já vinha no DTO e passou a existir no tipo do web.
- **Onde:** `apps/web/src/lib/executores-ao-vivo.ts:68` (`motivoDoOcio`), `apps/web/src/lib/api-types.ts:1086` (`Task.module`).
- **Teste:** `apps/web/src/lib/executores-ao-vivo.test.ts`.
- **Origem:** AT-880 (EP-031); levantamento de 09/11/2026 (TP-01 28ª).

<a id="rn-1162"></a>

### RN-1162 — A Visão geral diz UM próximo passo do projeto, tirado de uma tabela tipada e ordenada; sem situação verdadeira, o cartão some {#rn-1162}

- **Regra:** depois dos "Primeiros passos" (RN-708) a Visão geral não dizia mais o que fazer. Desde a AT-936 o cartão "Próximo passo" mostra UMA situação, a primeira verdadeira de uma tabela ordenada: (1) primeiro passo pendente da RN-708, (2) agente conversacional trabalhando, (3) continuar a ideação (há sessão e o backlog não tem histórias), (4) confirmar a arquitetura (há histórias e o mapa de módulos falta ou tem pendência), (5) ligar tarefas a um módulo (RN-1085), (6) desbloquear tarefas, (7) ativar a execução (tarefas prontas e execução inativa), (8) acompanhar a execução (execução ativa com tarefa em andamento), (9) rodar o entregável (todas as tarefas não arquivadas concluídas). O passo 1 reusa o texto e o destino da RN-708, sem duplicar a regra. A regra só ORDENA fatos que a aba já lê: nenhuma leitura nova (o orçamento de carga da Visão geral não muda), e insumo ainda não lido é "não sei" (RN-470), então o cartão espera. Decisões pendentes (aprovações, PRs, hipóteses, promoções) ficam de fora de propósito: já são a faixa "Precisa de você" (RN-467). Tarefa arquivada não conta. Sem situação verdadeira o cartão não aparece, sem texto inventado. "Mapa de módulos sem confirmação" não existe como dado no web: vale "mapa ausente ou com pendência".
- **Onde:** `apps/web/src/lib/proximo-passo.ts:46` (`PASSOS`), `apps/web/src/lib/proximo-passo.ts:72` (`derivarProximoPasso`), `apps/web/src/components/ProximoPasso.tsx:18` (`ProximoPasso`), `apps/web/src/routes/ProjectOverviewTab.tsx:310` (montagem logo abaixo dos Primeiros passos).
- **Teste:** `apps/web/src/lib/proximo-passo.test.ts` (um caso por situação, precedência, "nenhuma" e tarefa arquivada), `apps/web/src/routes/ProjectOverviewTab.test.tsx` (describe "próximo passo": fixture da P10, bloqueada, cartão que some).
- **Origem:** AT-936 (EP-035); prévia em `13-design/proximo-passo`. Revisa a RN-708: o primeiro passo pendente dela é a situação 1 desta tabela.

### RN-1200 — O teto do projeto é MENSAL na tela: medidor, dias restantes, previsão e a legenda da virada em UTC {#rn-1200}

- **Regra:** o teto do projeto (`GET/PUT projects/:id/budget`, `maintainer`) passa a ser do mês civil em UTC (api RN-1168..1171): o `spentMicros` é o gasto do mês e a resposta traz `periodo { inicio, fim, diasRestantes, previsaoMicros }`. A aba Gastos chama o bloco de "Teto do mês" e diz "N dias restantes", "Previsão no fim do mês: US$ X" e "O mês vira em <data> (00:00 UTC)". A virada é em UTC; SÓ a legenda é convertida para a hora local do navegador. Os avisos 70/90 e o bloqueio falam "do mês" (a sessão segue acumulada e sem `periodo`). O cartão do plano (RN-1062) compara a estimativa com o que resta do teto do projeto NO MÊS. O motivo `politica` do engine agora também vem do teto do mês; o cartão "Aumentar o teto por tarefa" (AT-917) só vale para o motivo do ToolLoop e deve oferecer "ver o teto do projeto" no motivo `politica`.
- **Onde:** `src/components/TetoDoMes.tsx:27` (`TetoDoMes`), `src/lib/spend.ts:277` (`viradaDoMesLocal`), `src/routes/ProjectSpendTab.tsx:95` (`OrcamentoDoProjeto`).
- **Teste:** `src/routes/ProjectSpendTab.test.tsx` ("mostra dias restantes, previsão e a virada do mês"), `src/lib/spend.test.ts` (`viradaDoMesLocal`).
- **Origem:** AT-934 (EP-035). Revisa a RN-213 (o alerta é do mês).

### RN-1201 — O workspace tem teto de gasto mensal, que só o owner vê e define {#rn-1201}

- **Regra:** a S06 (Gastos) mostra ao `owner` o teto do mês do workspace (`GET/PUT workspaces/:id/budget`, 403 para os demais), com o mesmo medidor, previsão e legenda da RN-1200, e o editor (valor e política `block`/`allow`). Quem não é owner não lê o valor (a api recusa): vê, em texto, que o teto é do owner e que só o conhece quando uma chamada é recusada ("Budget do workspace atingiu o teto do mês"). O controle nunca é oferecido a quem a api não deixa usar (RN-102); erro de leitura de quem não edita é silencioso. O teto do workspace soma todos os projetos e é independente dos de projeto, sessão e área: basta um no limite com `block` para recusar.
- **Onde:** `src/components/TetoDoMes.tsx:27` (`TetoDoMes`), `src/routes/SpendPage.tsx:23` (`SpendPage`), `src/lib/api-client.ts:1346` (`getWorkspaceBudget`).
- **Teste:** `src/components/TetoDoMes.test.tsx` (owner edita; sem papel fica inerte com o motivo; 403 silencioso).
- **Origem:** AT-935 (EP-035).

<a id="rn-1185"></a>

### RN-1185 — Os passos do turno se recolhem numa linha e se agrupam por INTENÇÃO, num mapa tipado; nenhum passo some {#rn-1185}

- **Regra:** `PassosDoTurno` recolhido mostra "N passos", até 3 ferramentas mais usadas com ×N, o custo (`custoMicros` do `agent.response`, RN-1158) e a duração do TURNO (`duracaoMs`); campo ausente (evento antigo ou do `ToolLoop`) é traço ou some, nunca zero. Aberto, o seletor "Agrupados | Em ordem": "Em ordem" é a lista de `passosDoTurno`; "Agrupados" parte o MESMO conjunto por intenção (Leu o contexto, Desenhou, Registrou, Outros) por `GRUPO_DA_FERRAMENTA`, `Record<FerramentaConhecida, Grupo>` exaustivo pelo tipo; ferramenta fora do tipo cai em Outros. O fio não agrupa por origem (RN-644). Os turnos ANTERIORES ao último `agent.response` mostram o bloco de passos como UMA linha (`ResumoDeTurno`: agente, passos, `gravadoNoTurno` do engine, custo) que expande no lugar; a mensagem do agente continua inteira no fio e o texto dela fica em 62ch (ADR 0248). O `Reasoning` mostra "N tokens" quando o fecho traz `raciocinioTokens`, senão a contagem de caracteres. Recorte declarado (RN-180): o texto lateral por passo da prévia não tem fonte estruturada e sai; "iteração N de 14" sai; o papel do raciocínio é filtrado pela api (ADR 0249), não pelo web.
- **Onde:** `src/lib/grupos-de-ferramenta.ts:12` (`GRUPO_DA_FERRAMENTA`), `src/components/ai-elements/passos-do-turno.tsx:11` (`PassosDoTurno`), `src/lib/resumo-de-turno.ts:20` (`gravadoDoPayload`), `src/components/ResumoDeTurno.tsx:17` (`ResumoDeTurno`), `src/routes/session-timeline-montagem.tsx:443` (`ultimaRespostaId`).
- **Teste:** `src/lib/grupos-de-ferramenta.test.ts`, `src/components/ai-elements/passos-do-turno.test.tsx` (seletor Agrupados | Em ordem).
- **Origem:** AT-891 (EP-035), ADR 0290/0294.

<a id="rn-1180"></a>

### RN-1180 — A navegação do projeto tem oito seções; as 12 abas viram sub-abas, e as chaves antigas de `?tab=` continuam abrindo a mesma tela {#rn-1180}

- **Regra:** desde a AT-886 (ADR 0294) a sidebar do projeto tem OITO itens: Visão geral, Sessões, Trabalho, Código, Decisões, Arquitetura, Gastos e Configurações. As 12 chaves de hoje continuam sendo as telas e viram seção ou sub-aba com o mesmo painel (Sessões: `criativo`, `chat`; Trabalho: `backlog`, `executores`; Código: `code`, `prs`; Decisões: `approvals`, `insights`). O item da seção é link para a primeira sub-aba e fica ativo quando qualquer sub-aba dela é a ativa. Seção com mais de uma sub-aba mostra a faixa de sub-abas no topo do conteúdo (`Tabs variant="casa"`, a mesma peça de Configurações); trocar de sub-aba troca a tela e o `?tab=` acompanha. `resolverChaveDeAba` devolve `{ secao, sub }` e resolve as 12 chaves, os aliases `sessions`, `rag` (para `chat`) e `historias` (para `backlog`) e as chaves de seção (`sessoes`, `trabalho`, `codigo`, `decisoes`, que abrem a primeira sub-aba); chave desconhecida é `undefined`. Contadores nunca se somam (RN-467): o item da seção só mostra número quando UMA fila o alimenta (Trabalho: promoções; Código: PRs; Arquitetura: pendências), Decisões (aprovações mais hipóteses) mostra só o ponto de presença, e cada sub-aba traz o número da própria fila na faixa, da mesma fonte (`useContagensDoProjeto`, sem requisição nova). Só entra no registro sub-aba que tem painel: `todas` e `permissoes` entram, uma linha cada, nas AT-893 e AT-895.
- **Onde:** `apps/web/src/routes/project-tabs.ts:411` (`SECOES_DO_PROJETO`), `apps/web/src/routes/project-tabs.ts:433` (`resolverChaveDeAba`), `apps/web/src/routes/AbasDoProjeto.helpers.ts:11` (`itensDasAbas`), `apps/web/src/components/FaixaDeSubAbas.tsx:22` (`FaixaDeSubAbas`), `apps/web/src/routes/ProjectPage.tsx` (`trocarSub`).
- **Teste:** `apps/web/src/routes/project-tabs.test.tsx` (os 15 deep-links, as chaves de seção, desconhecida e a faixa com o selo de cada fila), `apps/web/src/routes/AbasDoProjeto.test.tsx` (8 itens, teclado com volta, Decisões sem número), `apps/web/src/routes/Shell.test.tsx` (sidebar, flyout e gaveta).
- **Origem:** AT-886 (EP-035), ADR 0294. Revisa a RN-196 e o ADR 0211 no que diz respeito aos três grupos: a lista passa a ter oito itens.

<a id="rn-1215"></a>

### RN-1215 — Sessões junta Chat e Criativo: "Todas" é a união das duas listas, e a busca filtra localmente e só consulta o RAG com Enter {#rn-1215}

- **Regra:** a seção Sessões tem as sub-abas Todas, Ideação e Conversa (AT-893). "Todas" lê a MESMA lista de hoje (`useProjectSessions`, sem endpoint novo) e não traz o botão de criar (o tipo é escolhido na sub-aba). A linha mostra tipo (ou "sistema" para a sessão técnica), a cadeia de avatares de `agentes[]`, estado, "N aguardando", passos e custo, todos da lista (RN-1151); custo zero aparece como zero. O resumo de uma linha da P13 não existe (a lista não traz o último "Gravado neste turno"). O campo de busca filtra a lista por título e id, localmente; Enter ou o botão abre o RAG (`ProjectRagTab`, a mesma busca medida das RN-479..481) abaixo, UMA consulta por gesto, nunca a cada tecla. `?tab=rag` abre Sessões › Todas já em modo RAG; `?tab=sessions` abre Conversa. O segmento Conversar/Buscar da antiga aba Chat sai (`ProjectChatShell`).
- **Onde:** `apps/web/src/routes/ProjectSessionsTab.tsx` (`ProjectSessionsTab`, `ProjectTodasTab`, `casaComABusca`), `apps/web/src/routes/ProjectRagTab.tsx` (`consultaInicial`), `apps/web/src/routes/project-tabs.ts` (`REGISTRO`, `ALIASES_DE_ABA`).
- **Teste:** `apps/web/src/routes/ProjectSessionsTab.todas.test.tsx` (união, filtro local sem RAG, Enter com termo curto e longo, `?tab=rag`), `apps/web/src/routes/project-tabs.test.tsx` (deep-links).
- **Origem:** AT-893 (EP-035), decisão do dono de 12/11/2026. Revisa a RN-1180 (a seção ganha a sub-aba `todas`; o alias `rag` aponta para ela).

<a id="rn-1225"></a>

### RN-1225 — Decisões ganha "Decididas recentemente" e a sub-aba Permissões; PRs diz as próximas ações e que o merge é manual {#rn-1225}

- **Regra:** desde a AT-895 (ADR 0294) a sub-aba Aprovações lista, abaixo da fila pendente, o que JÁ foi decidido (`GET /projects/:projectId/actions?status=decided&since=`, RN-1154): aprovadas, negadas com o motivo, automáticas (rotuladas "pela política"), executadas e falhas, mais novas primeiro, 24 h por padrão e "Ver todas" alarga para 30 dias (teto de 100 da api). A leitura não tem poll próprio: a chave começa por `['project-pending-actions', projectId]`, e quem decide invalida o prefixo. Erro da api diz que falhou, nunca "nada decidido" (RN-088), e a lista não soma com a fila pendente (RN-467, RN-638). A tabela do `permissions.json` saiu da aba Aprovações para a sub-aba Permissões (`PermissoesDoProjeto`), sem mudar comportamento. A aba PRs ganha, no vazio, "Ver a aprovação" e "Ativar execução" e o bloco "Como uma PR anda aqui", que diz que o merge em branch protegida é sempre manual: o card só PROPÕE (RN-418 intacta). O rótulo da fila pendente passa de "ordenadas por urgência" para "mais antigas primeiro" (não existe regra de urgência). A frase "o que acontece se aprovar" segue vindo de `FRASE_DA_ACAO` em `lib/aprovacoes.ts`, exaustiva sobre o `ActionType` gerado.
- **Onde:** `src/routes/DecididasRecentemente.tsx:21` (`DecididasRecentemente`), `src/lib/decididas-queries.ts:13` (`useProjectDecidedActions`), `src/routes/PermissoesDoProjeto.tsx:26` (`PermissoesDoProjeto`), `src/routes/project-tabs.ts:258` (registro da sub-aba `permissoes`), `src/routes/code/PrListAndDiff.tsx:62` (`vazioExtra`).
- **Teste:** `src/routes/DecididasRecentemente.test.tsx` (automática com origem, negada com motivo, vazio, "Ver todas", erro), `src/routes/PermissoesDoProjeto.test.tsx` (as três de hoje, extraídas), `src/routes/project-tabs.test.tsx` (13 abas, deep-link `permissoes`), `src/routes/ProjectPrsTab.test.tsx` (vazio e fluxo).
- **Origem:** AT-895 (EP-035), ADR 0294. Fica de fora, declarado: Hipóteses (P17) sem o bloco "Exemplo", "Aprovar e criar regra" (rótulo) e o rodapé "0 agentes editando", que sai.

<a id="rn-1205"></a>

### RN-1205 — A sidebar mostra "Agentes agora" (até 5, por urgência, sem contagem de eventos) no lugar de Atividades, e as cores `--ag-*` do v9 entram nos dois temas {#rn-1205}

- **Regra:** "Atividades" (a árvore de eventos por agente, RN-198) sai; entra "Agentes agora": até 5 agentes do roster do projeto aberto, ordenados por urgência (aguardando, falhou, trabalhando, ocioso), cada um com avatar na cor do papel, nome e ponto de status (`travado` conta como falhou), sem contagem de eventos (RN-467), mais "ver todos" para a sub-aba Executores. Recolhida (48 px), só o avatar com `title`/`aria-label`. O roster sai de `deriveAgentRoster` sobre os eventos que a sidebar já lê, com a moldura do projeto como fonte de pendências e `moduleMap`, sem handoffs e sem requisição nova. WORKSPACE passa a rotular Containers, Providers, Gastos e Status (link novo para `/status`). Os oito `--ag-*` (criativo, po, arquiteto, dev, qa, secops, infra, psi) entram em `design/tokens.css` nos dois temas, com o piso de elemento (3:1) medido; qa passa a verde, infra a azul e dev-backend a teal. A Caixa de decisões fica para a AT-889 e o seletor de projeto para a AT-888.
- **Onde:** `src/lib/agentes-agora.ts` (`agentesAgora`), `src/components/AgentesAgora.tsx` (`AgentesAgora`), `src/routes/Shell.tsx` (`Shell`), `design/tokens.css`, `src/lib/agents.ts` (`AGENTS`).
- **Teste:** `src/lib/agentes-agora.test.ts`, `src/routes/Shell.test.tsx` (Agentes agora), `src/lib/contraste.test.ts`.
- **Origem:** AT-887 (EP-035), ADR 0294. Revoga a RN-198 e a chave `brabo.sidebar.agents`.
