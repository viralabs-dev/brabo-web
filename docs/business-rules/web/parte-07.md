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
- **Onde:** `apps/web/src/lib/artefato-do-fio.ts:11` (`camposDoArtefato`), `apps/web/src/routes/session-timeline-montagem.tsx:135` (`ARTEFATOS_DO_FIO`).
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
- **Onde:** `apps/web/src/lib/execution.ts:169` (`execucaoParadaDe`), `apps/web/src/routes/DestravarExecucao.tsx:25` (`DestravarExecucao`), `apps/web/src/lib/activity.ts:218` (`classifyEvent`), `apps/web/src/routes/ProjectExecutorsTab.tsx:201` (`paradaVigente`).
- **Teste:** `apps/web/src/routes/DestravarExecucao.test.tsx`, `apps/web/src/lib/execution.test.ts`, `apps/web/src/lib/activity.test.ts`.
- **Origem:** AT-800 (EP-030), parte web; engine#57.

<a id="rn-1062"></a>

### RN-1062 — O cartão do plano mostra o teto do projeto e das áreas dev/qa, avisa quando a estimativa passa do que resta e ajusta o teto da área dev ali {#rn-1062}

- **Regra:** o "custo esperado" do plano do Dev Lead é o teto POR TAREFA × tarefas ([RN-802](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-802)), não o preço. Enquanto o plano está pendente, logo abaixo dele o cartão mostra o teto do projeto (`GET /projects/:id/budget`, `maintainer`; para papel abaixo a linha do projeto some) e o das áreas `dev` e `qa` (`GET .../agent-areas`), cada um com o gasto, ou "sem teto" ([RN-443](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-443)). Quando a estimativa passa do que resta (`limite − gasto`, nunca negativo) do MENOR teto aplicável, entre o do projeto (só com política `block`; `allow` não para nada) e o da área `dev`, aparece um aviso `warning` com o que resta e a frase "a execução para quando o teto for atingido; a estimativa é o teto por tarefa, não o preço". O aviso NÃO trava o Aprovar ([RN-677](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-677)). "Ajustar teto" (ícone e rótulo) abre na própria linha um campo em dólar para o teto da área `dev` só, com Salvar e Cancelar (`setAreaBudget`; vazio = sem teto, como na [RN-980](#rn-980)); abaixo de `maintainer` fica inerte, com o motivo em texto (ADR 0064). "Outros tetos" abre `?section=budget` em outra aba: o teto do projeto, que tem política, segue em Configurações. Reusa as chaves de cache `['budget', projectId]` e `['agent-areas', projectId]`; sem `QueryClient` (teste isolado do card) nada é lido nem mostrado.
- **Onde:** `apps/web/src/components/TetoDoPlano.tsx:33` (`TetoDoPlano`), `apps/web/src/components/TetoDoPlano.helpers.ts:15` (`menorTetoAplicavel`), `apps/web/src/components/ApprovalCard.tsx:432` (`TetoDoPlano`).
- **Teste:** `apps/web/src/components/ApprovalCard.teto-do-plano.test.tsx`.
- **Origem:** AT-808 (EP-031); decisão do dono, 07/11/2026 (ajuste só da área dev; o aviso não trava).

<a id="rn-1063"></a>

### RN-1063 — PR que entra na fila de prontas avisa na borda do fio e no título da aba, com Mergear e o tempo de espera, e se dispensa {#rn-1063}

- **Regra:** estende a [RN-825](parte-06.md#rn-825)/[RN-841](parte-06.md#rn-841). Quando há PR pronta para o dono mergear (a fila `prontas`: gates aprovados, ou PR sem tarefa), um `Alert` accent fica FIXO na borda do fio, entre o fio e o composer (RN-981), com `role="status"`: "PR #3 "título" está pronta para você mergear: os gates passaram", com "Pronta há N min" (sobre o `updatedAt` da tarefa da PR, quando há) e o `MergearNoChat` com a confirmação na linha (AT-753 P1). Com várias: "N PRs prontas para você mergear" e "Ver as N", que abre a aba `prontas` ([RN-975](parte-06.md#rn-975)). "Agora não" dispensa as PRs avisadas; o aviso só volta se ENTRAR uma PR nova. Quando a PR sai da fila (mergeada), o aviso some. O título da aba mostra o contador enquanto houver PR pronta ("(1) Brabo"), mesmo com o aviso dispensado, e volta ao normal quando a fila esvazia. PR que ENTRA na fila (na primeira leitura, as que já esperavam) abre sozinha a aba `prontas` do painel de pendências quando nenhuma está aberta (exceção declarada à "nenhuma aba nasce aberta" da RN-975). Sem evento novo, sem mudança em api ou engine e sem notificação do navegador: o aviso lê as mesmas prontas do painel (`usePrsProntas`, cache compartilhado), pela releitura de 15 s do backlog. O merge segue gesto humano ([RN-418](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-418)/[RN-663](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-663)): o aviso só oferece o `MergearNoChat`.
- **Onde:** `apps/web/src/components/AvisoDePrPronta.tsx:29` (`AvisoDePrPronta`), `apps/web/src/lib/prs-prontas.ts:14` (`usePrsProntas`), `apps/web/src/lib/saidas-da-fila.ts:30` (`entradasDaFila`), `apps/web/src/components/PendenciasDeOutrasSessoes.tsx:172` (`idsDasProntas`), `apps/web/src/routes/SessionPage.tsx:825` (`AvisoDePrPronta`).
- **Teste:** `apps/web/src/components/AvisoDePrPronta.test.tsx`, `apps/web/src/lib/saidas-da-fila.test.ts`, `apps/web/src/components/PendenciasDeOutrasSessoes.test.tsx`.
- **Origem:** AT-810 (EP-031); decisão do dono, 07/11/2026 (aviso fixo na borda do fio; contador no título da aba; sem notificação do navegador).
