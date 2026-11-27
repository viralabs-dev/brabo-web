---
id: rn-web-parte-08
title: 'Regras de negócio — Web — parte 8 (desde RN-1432)'
sidebar_label: 'Web — parte 8 (desde RN-1432)'
description: 'As RNs hospedadas na raiz web.'
keywords: [regras de negócio, web]
---

# Web — parte 8 (desde RN-1432)

## Achados do TP-01 27ª (RN-1060 a RN-1063)

<a id="rn-1432"></a>

### RN-1432 — No telefone a barra da sessão tem 52 px e uma linha {#rn-1432}

- **Regra:** abaixo de 768 px (`useLayoutMovel`, RN-643) a barra da sessão deixa de quebrar linha: 52 px, com voltar ao projeto, estado, UM título com reticências e o botão do painel. O botão mostra o contador de pendências (`Badge`) e, havendo pendência e o painel fechado, abre o Sheet já na aba Pendências (RN-626). O botão "Pendências N" da barra de desktop não aparece no telefone. Trilha e metadados também saem da barra. Alvos de toque de 40 px.
- **Onde:** `src/routes/SessionTopbar.tsx` (`SessionTopbar`), `src/routes/SessionPage.module.css` (`.topbarMovel`).
- **Teste:** `src/routes/SessionPage.layout-movel.test.tsx`.
- **Origem:** AT-961 (EP-035), v10 prancha K05.

<a id="rn-1433"></a>

### RN-1433 — No telefone os ajustes da sessão moram na aba Contexto {#rn-1433}

- **Regra:** tipo da sessão, modelo, idioma das respostas (RN-620), medidor da janela (RN-969), "Iniciar ideação" e Encerrar saem da barra e ficam no topo da aba Contexto do painel (Sheet), com os mesmos comportamentos e nomes acessíveis. Na faixa de estado, no composer e no Mergear os alvos de toque têm 40 px. Nada some: só muda de lugar.
- **Onde:** `src/routes/SessionTopbar.tsx` (`ControlesDaSessao`), `src/routes/SessionPage.tsx` (`controlesNoPainel`), `src/routes/FaixaDeEstado.module.css`.
- **Teste:** `src/routes/SessionPage.layout-movel.test.tsx`.
- **Origem:** AT-961 (EP-035).

<a id="rn-1447"></a>

### RN-1447 — Os filtros do Backlog ficam numa linha que quebra {#rn-1447}

- **Regra:** a barra de filtros é um `flex` com `gap` de 8 px e `flex-wrap`, na ordem busca (`flex: 1 1 260px`, máximo 420 px), "Com pergunta aberta · N" (uma `Checkbox` do kit com rótulo, não mais um `Chip`), seletor de módulo (`NativeSelect` do kit) e, à direita, "Por épico / Quadro". Nenhum item usa posição absoluta nem margem negativa, então nenhum par de controles se sobrepõe em 1848, 1366 ou 589 px. O rótulo da busca é `placeholder` com `aria-label` igual, e o campo leva a lupa do kit à esquerda (AT-1006).
- **Onde:** `src/routes/ProjectBacklogTab.tsx`, `src/routes/ProjectBacklogTab.module.css` (`.filtros`).
- **Teste:** `src/routes/ProjectBacklogTab.test.tsx`.
- **Origem:** AT-969 (EP-035), prancha L04 da v11.

<a id="rn-1448"></a>

### RN-1448 — O Backlog diz o status por extenso e o épico conta só as concluídas {#rn-1448}

- **Regra:** o selo da história mostra "pronta para executar" (`ready`, tom neutro), "em execução" (`in_progress`) ou "concluída" (`done`); `draft` segue "rascunho". O épico diz "N histórias · N de M concluídas" (AT-1006, como a L04), contando só histórias `done`, com uma barra `Progress` ao lado. O número de tarefas da história não quebra linha.
- **Onde:** `src/routes/ProjectBacklogTab.tsx` (`STATUS_TONE`, `EpicNode`), `src/locales/*/backlog.json` (`statusLabel`, `epico.progresso`).
- **Teste:** `src/routes/ProjectBacklogTab.test.tsx`.
- **Origem:** AT-969 (EP-035).

<a id="rn-1449"></a>

### RN-1449 — A Rastreabilidade vai para baixo da lista no estreito {#rn-1449}

- **Regra:** o contêiner da aba é uma grade `minmax(0, 1fr) 320px` a partir de 1000 px de largura do contêiner (container query; o corte é do contêiner, não da janela: cerca de 1304 px de janela, então em 1366 × 768 a Rastreabilidade fica ao lado) e uma coluna abaixo disso, com a Rastreabilidade depois da lista. As regras da Rastreabilidade são UMA lista (`ul`), uma linha por regra, com "N histórias" à direita (AT-1006).
- **Onde:** `src/routes/ProjectBacklogTab.module.css` (`.pagina`, `.wrapper`).
- **Teste:** `src/routes/ProjectBacklogTab.test.tsx` cobre a estrutura; a largura se confere na captura (CSS de contêiner não roda no jsdom).
- **Origem:** AT-969 (EP-035).

<a id="rn-1434"></a>

### RN-1434 — No telefone o aviso de PR cabe em uma linha {#rn-1434}

- **Regra:** o aviso do PR aberto no fio ("Mergear" + nota) fica em uma linha abaixo de 768 px: a nota é cortada com reticências e o botão Mergear fica sempre visível.
- **Onde:** `src/routes/MergearNoChat.tsx` (`MergearNoChat`), `src/routes/SessionPage.module.css` (`.mergearNoChat`).
- **Teste:** `src/routes/MergearNoChat.test.tsx`.
- **Origem:** AT-961 (EP-035).

<a id="rn-1445"></a>

### RN-1445 — A falha de uma ação de container mostra o motivo no cartão {#rn-1445}

- **Regra:** o cartão de aprovação de uma ação que falhou lê a causa de `executionResult.error` (ações git) OU de `executionResult.motivo` (ações de container, inclusive "o container subiu sem rede: DNS de X falhou"), em texto não vazio: 1ª frase, teto de 160 caracteres, no `Alert` abaixo de "Falhou". Sem nenhum dos dois, fica só "Falhou".
- **Onde:** `src/components/ApprovalCard.tsx` (`causaDaFalha`), `src/lib/api-types.ts` (`ContainerActionResult`).
- **Teste:** `src/components/ApprovalCard.falha-com-causa.test.tsx`.
- **Origem:** AT-980 (EP-036), achado 7c.

<a id="rn-1446"></a>

### RN-1446 — `/containers` mostra a remoção pendente {#rn-1446}

- **Regra:** a página global lê `GET /workspaces/:workspaceId/containers/remocoes-pendentes` (papel `viewer`, poll como a lista) e, havendo pendência, mostra a seção "Remoção pendente": projetos apagados cujos containers ainda serão removidos quando o broker voltar. Cada linha traz o nome (ou o `projectId` encurtado em 8 caracteres quando `projetoNome` é nulo), os recursos, as tentativas, quando e o motivo. Sem pendência, a seção não aparece.
- **Onde:** `src/routes/ContainersPage.tsx`, `src/lib/hooks.ts` (`useRemocoesPendentes`), `src/lib/api-client.ts` (`getRemocoesPendentes`), `src/locales/*/containers.json` (`remocoes`).
- **Teste:** `src/routes/ContainersPage.test.tsx`.
- **Origem:** AT-980 (EP-036), lane L8.

<a id="rn-1442"></a>

### RN-1442 — A oferta de "fazer sozinho" aparece no chat e vira estado respondido {#rn-1442}

- **Regra:** o evento `automacao.oferecida` vira um cartão no fio com o texto da categoria (aprovação, passagem ou desbloqueio), onde se desfazer (link para `?tab=settings&group=projeto&section=regras-de-oferta`, montado na web; o `comoDesfazer` do payload é um `DELETE` e não é mostrado) e duas ações visíveis: "Fazer sozinho daqui em diante" (`POST /projects/:id/automacoes` com `decisao: 'aceitar'`) e "Não, continue perguntando" (`recusar`). Só `maintainer` responde; os demais veem os botões inertes com o motivo em texto. O cartão deixa de pedir clique quando `automacao.aceita` ou `automacao.recusada` da mesma categoria e chave o segue no fio, e passa a dizer só o desfecho.
- **Onde:** `src/routes/OfertaDeAutomacao.tsx`, `src/lib/automacao-oferta.ts` (`respostaDaOferta`), `src/routes/session-timeline-montagem.tsx`.
- **Teste:** `src/routes/OfertaDeAutomacao.test.tsx`, `src/lib/automacao-oferta.test.ts`.
- **Origem:** AT-999 (EP-035, AT-953).

<a id="rn-1443"></a>

### RN-1443 — As regras de oferta se desfazem em Configurações › Projeto {#rn-1443}

- **Regra:** abaixo de "Passagens entre agentes sem clique", a seção "Regras de fazer sozinho" lista as regras com origem `oferta` (`GET /projects/:id/automacoes`), cada uma com "Desfazer" (`DELETE /projects/:id/automacoes/:categoria/:chave`; na aprovação a chave é `<tipo>@<agente>`). Só `maintainer` desfaz; os demais veem o botão inerte com o motivo. Sem regra de oferta, a seção não aparece. As saídas do `automacao.outro_caminho` (RN-1444) ainda são só texto, não clicáveis.
- **Onde:** `src/routes/settings/RegrasDeOfertaSection.tsx`.
- **Teste:** `src/routes/settings/RegrasDeOfertaSection.test.tsx`.
- **Origem:** AT-999 (EP-035).

<a id="rn-1444"></a>

### RN-1444 — O fio narra o que a regra fez e o anti-laço não oferece automatizar {#rn-1444}

- **Regra:** `automacao.aplicada` vira a linha "Feito sozinho pela regra de …, desde … · desfazer", e "desfazer" é o link para Configurações › Projeto, seção "Regras de fazer sozinho". `automacao.outro_caminho` diz que a decisão já repetiu sem resolver e lista as saídas (trocar o modelo da tarefa, pedir ao Dev Lead, arquivar), sem o botão de automatizar.
- **Onde:** `src/routes/session-timeline-montagem.tsx`.
- **Teste:** `src/routes/OfertaDeAutomacao.test.tsx` (montagem do fio).
- **Origem:** AT-999 (EP-035).

<a id="rn-1450"></a>

### RN-1450 — O teto do mês tem um lugar só: o cartão `#teto` dos Gastos {#rn-1450}

> **Revisada pela [RN-1487](#rn-1487) (AT-1005):** o cartão deixou de ficar ao lado dos indicadores. Os indicadores ocupam a largura inteira e o cartão fica ao lado do gráfico por dia, na faixa de baixo; fechado, ele resume a previsão e a virada do mês numa linha só.

- **Regra:** o teto do mês mora no cartão compacto `id="teto"` da aba Gastos do projeto e da página Gastos do workspace, à direita do gráfico por dia (320 px; abaixo de 1100 px, abaixo dos indicadores). Com teto, mostra o título, o medidor compacto (valor e barra, sem marcadores de 90%/100% nem linha em R$), a previsão e "Editar"; sem teto, mostra "Sem teto do mês" e "Definir". O botão abre o formulário (valor, "Ao atingir o teto", "Salvar teto" com rótulos e texto visíveis) dentro do próprio cartão, sem Popover, para a âncora continuar caindo nele; quem não edita vê o motivo em texto, sem botão. `?tab=spend#teto` (o "Definir teto do mês" do cabeçalho, RN-1210) rola até o cartão quando ele monta e, para quem pode editar, o formulário já chega aberto (sem segundo clique; vale também para o "definir" do cartão do projeto e para "Editar em Gastos"; AT-1024). O cartão existe mesmo se o relatório de gasto falhar. As regras do teto (bloquear ou só avisar, RN-1200) não mudam.
- **Onde:** `src/components/TetoDoMes.tsx` (`CartaoDoTeto`), `src/components/SpendPaineis.tsx` (`GastoDoWorkspace`, prop `teto`), `src/routes/ProjectSpendTab.tsx`, `src/routes/SpendPage.tsx`.
- **Teste:** `src/routes/ProjectSpendTab.test.tsx` (`#teto` rola até o cartão).
- **Origem:** AT-973 (EP-035), decisão do dono de 17/11. Muda a RN-1265.

<a id="rn-1451"></a>

### RN-1451 — Os Gastos mostram quatro indicadores e o período real {#rn-1451}

> **Complementada pela [RN-1487](#rn-1487) (AT-1005):** Total e Chamadas ganham uma segunda linha ("desde 26/10", "<modelo> em N%"), as notas de tokens também são abreviadas e "Ver os N agentes" é um link.

- **Regra:** Total, Chamadas, Tokens e Custo médio por chamada, em grade de quatro. Tokens abreviados a partir de mil ("41,1 mi") com o número inteiro no `title`; custo médio abaixo de 1 centavo mostra 4 casas ("US$ 0,0012"). O seletor de período do owner ganha "Desde o início · N dias" quando o primeiro gasto tem menos de 30 dias (lido da série densa de 30 dias), e ele é o padrão; o eixo do gráfico começa no primeiro dia com gasto. O gráfico nunca passa da largura do cartão. Sem gasto na janela o gráfico diz "Nenhum gasto nos últimos N dias." (N é a janela escolhida) e não oferece "Ver como tabela", e "Onde foi o gasto" vira uma linha no lugar dos rankings. "O meu consumo" do membro usa os mesmos tokens abreviados. Na visão do time, "Por agente" mostra os 3 maiores e "Ver os N agentes".
- **Onde:** `src/components/SpendPaineis.tsx` (`DestaquesDoTotal`, `SeletorDeJanela`, `GastoDoWorkspace`), `src/lib/spend.ts` (`janelaDesdeOInicio`, `abreviarTokens`), `src/components/CredentialSpendSection.helpers.ts` (`formatarCustoMedio`), `src/components/GraficoDeGastoPorDia.tsx`.
- **Teste:** `src/routes/ProjectSpendTab.test.tsx`, `src/components/GraficoDeGastoPorDia.test.tsx`.
- **Origem:** AT-973 (EP-035), prancha L08 da v11.

<a id="rn-1452"></a>

### RN-1452 — "Por sessão" diz o nome (ou o tipo) antes da hashtag {#rn-1452}

- **Regra:** o ranking por sessão dos Gastos mostra "<nome> · #hash"; sessão sem nome mostra o tipo ("Criativa · #hash"). O relatório só traz o id, então o nome vem da lista de sessões do projeto; sem ela (carga ou erro) a linha cai na hashtag sozinha, sem inventar nome (EP-020).
- **Onde:** `src/components/SpendPaineis.tsx` (`useRotuloDaSessao`), `src/routes/ProjectSpendTab.tsx`.
- **Teste:** `src/routes/ProjectSpendTab.test.tsx`.
- **Origem:** AT-973 (EP-035), prancha L08 da v11.

<a id="rn-1504"></a>

### RN-1504 — O convite de membro do projeto é por e-mail {#rn-1504}

- **Regra:** em Configurações › Pessoas e acesso o campo do convite é "E-mail" (antes pedia o UUID do usuário); a tela envia `{ email, role }` e a api resolve o e-mail entre os membros do workspace do projeto. E-mail de fora devolve 404 com a frase da api, mostrada na linha do convite. Tabelas vazias de membros, tokens e chaves mostram uma frase só, sem cabeçalho de colunas. Par da RN-1453 da api (`brabo-api`).
- **Onde:** `src/routes/settings/MembersSection.tsx` (`handleInvite`), `src/components/ui/Table.tsx` (`semCabecalhoSeVazia`), `src/lib/api-client.ts` (`addProjectMember`).
- **Teste:** `src/routes/settings/papel-na-secao-de-membros.test.tsx`.
- **Origem:** AT-974 (EP-035), prancha L09 da v11.

<a id="rn-1454"></a>

### RN-1454 — Em Modelos por agente a linha diz só a origem; a cadeia e o fallback abrem num Popover e o aviso de roteamento vem uma vez {#rn-1454}

> **Revisada pela [RN-1488](#rn-1488) (AT-1005):** o Popover usa a fonte do texto (só o identificador do modelo é mono), a faixa de roteamento mostra a frase curta e "O que isso muda" abre a inteira num Popover, e o custo estimado entra no título da tabela. A altura da linha segue a da L09 (~55 px).

- **Regra:** a tabela tem quatro colunas: Agente, Modelo vigente, "De onde vem" e Est. mês (a coluna Fallback saiu). "De onde vem" é um chip: "herda do Criativo", "herda do projeto/workspace/área" ou "definido neste agente" (este com "voltar a herdar" ao lado). A cadeia da cascata (RN-470) e o fallback ("Se perder o modelo próprio, vale: X", ou "não há nível abaixo") abrem num Popover do chip. Os agentes com gasto no mês vêm primeiro, do maior para o menor gasto, e os demais ficam atrás de "Mostrar os outros N agentes" (sem a leitura de custos, ou sem nenhum agente com gasto, a tabela mostra todos). A caixa "Valer para a área" do lead fica na mesma linha do seletor, sem dobrar a altura da linha. O sobretítulo "binding vigente por cascata" saiu e a explicação da cascata fica visível em linha. O aviso "Roteamento: não provado em <provider>" sai das linhas e vem uma única vez, numa faixa de aviso (`Alert` com ícone e borda) acima da tabela, com "O que isso muda". A `LinhaDeConfiguracao` é uma grade `minmax(220px, 340px) minmax(0, 520px)` com `gap: 32px` (o critério de 32 px vale entre as colunas). O erro do convite (RN-1504) usa o `Alert` de erro e "Editar em Gastos" (RN-1455) é o `Link` do roteador.
- **Onde:** `src/routes/settings/ModelsSection.tsx`, `src/routes/settings/PreferenciaDeRoteamento.tsx` (`semAvisoDeCapability`), `src/routes/settings/LinhaDeConfiguracao.module.css`.
- **Teste:** `src/routes/settings/cascata.test.tsx`, `src/routes/settings/bindings-em-lote.test.tsx`.
- **Origem:** AT-974 (EP-035), prancha L09 da v11; decisão do dono de 17/11 (v11 vale sobre a revisão visual).

<a id="rn-1455"></a>

### RN-1455 — Em Configurações o teto do mês é só o valor e o caminho para Gastos {#rn-1455}

> **Conferida na AT-1005 ([RN-1489](#rn-1489)):** o `Link` do roteador já estava na `dev`; o teste `teto-so-em-gastos.test.tsx` garante que não recarrega a página.

- **Regra:** o teto do mês mora só em Gastos ([RN-1450](#rn-1450)). Em Configurações › Projeto e execução a linha "Teto de gasto do mês" mostra apenas "<gasto> de <teto> · N%" (ou "Sem teto neste mês", ou "Não foi possível ler o teto") e o link "Editar em Gastos", que é o `Link` do roteador para `?tab=spend#teto` (sem roteador no contexto cai no `<a href>`). Não há formulário nesta tela.
- **Onde:** `src/routes/settings/ExecutionSection.tsx`.
- **Teste:** `src/routes/settings/teto-so-em-gastos.test.tsx`, `src/routes/ProjectSettingsTab.test.tsx` (ExecutionSection).
- **Origem:** AT-974 (EP-035), decisão do dono de 17/11.

<a id="rn-1460"></a>

### RN-1460 — O cartão do projeto tem o nome na primeira linha, os agentes por extenso e "sem teto do mês · definir"; a grade filtra Ativos, Parados e Todos {#rn-1460}

> **Revisada pela [RN-1490](#rn-1490) (AT-1007):** o cartão parado ganha o chip "parado" e o rodapé não repete "atividade em ‹ator›".

> **Revisa** a regra do botão "Definir orçamento" do cartão ([RN-963](parte-06.md#rn-963), item 3, e [RN-212](parte-02.md#rn-212)): o botão sai; o `?tab=spend` virou `?tab=spend#teto` ([RN-1450](#rn-1450)).

- **Regra:** no `ProjectCard` o nome ocupa a linha inteira ao lado do ícone do provider (só se corta com reticências quando passa da largura do cartão), e os chips (aprovações, "<agente> aguardando você", "N online", provisionamento) descem para uma linha própria, que não existe sem chip. Os agentes do roster (até 4, o resto como "+N") mostram o nome por extenso ao lado do avatar, não só no `title`; o web não afirma "trabalhando" por agente porque o resumo da grade só traz a contagem de online. Projeto sem teto do mês (resumo lido e `budget` nulo) mostra o texto "sem teto do mês · definir", com "definir" como link (`role="link"`) para `/projects/:id?tab=spend#teto`; nenhum botão "Definir orçamento" existe na página. Acima da grade um `ToggleGroup` com "Ativos · N", "Parados · N" e "Todos". **Parado** é o projeto cujo último evento tem mais de 30 dias (fixo, `DIAS_PARADO`); sem evento vale a data de criação do projeto; **sem o resumo da grade lido (carregando ou erro) ninguém é dado como parado**, porque a tela não afirma o que não leu (EP-020). O padrão é Ativos e a escolha fica em `localStorage` (`brabo.inicio.filtro`, com `try/catch`). A busca atua dentro do filtro; filtro sem resultado diz "Nenhum projeto ativo" ou "Nenhum projeto parado" e o seletor continua na tela. O cartão "Novo projeto" segue como último item da grade.
- **Onde:** `src/components/ProjectCard.tsx`, `src/components/TokenMeter.tsx` (`compact` + `noBudget`), `src/lib/projetos-parados.ts`, `src/routes/Dashboard.tsx`.
- **Teste:** `src/components/ProjectCard.test.tsx`, `src/components/TokenMeter.test.tsx`, `src/lib/projetos-parados.test.ts`, `src/routes/Dashboard.test.tsx`.
- **Origem:** AT-967 (EP-035), prancha L02 da v11 e itens 16 da AT-1000; decisão do dono de 17/11 (o teto tem um lugar só, Gastos).

<a id="rn-1461"></a>

### RN-1461 — Os indicadores do Início contam só o que foi lido: "Projetos ativos" sem os parados e a Caixa com a idade do item mais antigo {#rn-1461}

- **Regra:** "Projetos ativos" é a contagem de projetos NÃO parados ([RN-1460](#rn-1460)) calculada sobre a lista de projetos e o resumo da grade (não mais o `activeProjects` do resumo do workspace), com a nota "N parados há mais de 30 dias" ("nenhum parado…" com zero). Carregando mostra "…", erro de leitura mostra "indisponível", e sem o resumo da grade a nota some. A "Caixa de decisões" mantém uma contagem por fila, nunca somadas ([RN-467](parte-03.md#rn-467)), e ganha embaixo "a mais antiga espera há X": o menor `createdAt` das ações (aprovações e PRs) ou `desde` (promoções, arquitetura, hipóteses). Só aparece com TODAS as filas inteiras: fila cortada pelo teto (`truncada`) não garante que o mais antigo esteja na lista, e a tela não afirma o que não leu ([RN-180](parte-02.md#rn-180)).
- **Onde:** `src/routes/Dashboard.tsx` (`CartoesDoInicio`, `itemMaisAntigo`).
- **Teste:** `src/routes/Dashboard.test.tsx` (Ativos, Parados e Todos).
- **Origem:** AT-967 (EP-035), prancha L02 da v11.

<a id="rn-1462"></a>

### RN-1462 — "Atividade recente" só lista evento com sujeito e resultado {#rn-1462}

- **Regra:** o evento cujo texto de `classifyEvent` é o fallback "atividade em <ator>" não diz o que aconteceu e não entra na lista (`temSujeitoEResultado`); o projeto cujo último evento é assim sai da lista, sem buscar outro (um evento por projeto, [RN-632](parte-05.md#rn-632)). O rodapé do cartão do projeto segue como estava ([RN-648](parte-05.md#rn-648)).
- **Onde:** `src/lib/activity.ts` (`temSujeitoEResultado`), `src/components/AtividadeRecente.tsx`.
- **Teste:** `src/routes/Dashboard.test.tsx` (Atividade recente só com sujeito e resultado).
- **Origem:** AT-967 (EP-035), prancha L02 da v11.

<a id="rn-1466"></a>

### RN-1466 — A Execução tem uma linha de topo e duas visões, Executores e Linha do tempo, guardadas na URL {#rn-1466}

- **Regra:** com a execução vigente, o topo da aba é uma linha: "Execução", o estado da sessão, a sessão ([RN-139](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-139)), a contagem de agentes e, à direita, um `ToggleGroup` "Executores | Linha do tempo" e "Parar execução" (RN-763). A escolha vai para `?visao=linha-do-tempo` (a visão Executores é a ausência do parâmetro; o `validateSearch` do router a mantém e trocar de sub-aba a apaga). A visão "Linha do tempo" mostra o `AgentTimelineTree` sozinho; a página deixou de empilhar a árvore embaixo dos executores. A faixa de execução parada ([RN-1061](parte-07.md#rn-1061)) segue numa linha, com as ações de `DestravarExecucao`. Com a execução parada o topo continua sendo só o cartão de chamada ([RN-794](parte-06.md#rn-794)).
- **Onde:** `src/routes/ProjectExecutorsTab.tsx`, `src/lib/execucao-tabela.ts` (`resolverVisao`), `src/router.tsx`, `src/routes/ProjectPage.tsx` (`trocarSub`), `src/components/PararExecucao.tsx` (`compacto`).
- **Teste:** `src/routes/ProjectExecutorsTab.test.tsx` (tabela de executores, AT-970), `src/lib/execucao-tabela.test.ts`.
- **Origem:** AT-970 (EP-035), prancha L05 da v11. Revisa a [RN-121](parte-01.md#rn-121): a aba continua isolando dev agent e QA, mas a renderização deixa de ser o `AgentTeamGrid` (que segue na Visão geral).

<a id="rn-1467"></a>

### RN-1467 — Os executores são uma tabela, uma linha por agente, na ordem de atenção {#rn-1467}

- **Regra:** colunas Agente, Estado, Tarefa atual ou última, Modelo (o mesmo seletor do cartão, compacto), Gasto e ações; linha de 44 px. Ordem: lead de área primeiro, depois parados e esperando você, depois trabalhando, por fim ociosos (estável dentro de cada faixa). A coluna de tarefa mostra o motivo quando travado, a tarefa do progresso, ou o desfecho da delegação do subagente. Toda ação do antigo cartão continua: Retomar (rearmar, travado) e "Procurar tarefa de novo" (ocioso) com texto na linha; "Ver no fio" com texto quando trabalhando; autonomia (manual ou automático, só lead e agente solo) e "Ver no fio" no menu "…". A tela só diz o que leu: gasto sem leitura é "—".
- **Onde:** `src/routes/TabelaDeExecutores.tsx`, `src/routes/TabelaDeExecutores.module.css`, `src/lib/execucao-tabela.ts` (`ordenarExecutores`), `src/routes/ProjectExecutorsTab.tsx`.
- **Teste:** `src/routes/ProjectExecutorsTab.test.tsx`, `src/lib/execucao-tabela.test.ts`.
- **Origem:** AT-970 (EP-035), prancha L05 da v11.

<a id="rn-1468"></a>

### RN-1468 — A Execução mostra três indicadores no lugar de "Áreas" e "Fila de tarefas" {#rn-1468}

- **Regra:** com a execução de pé, Tarefas ("N de M" e uma barra), Fila (prontas, bloqueadas e rodando; "Ver a fila" abre num `Popover` a lista das tarefas) e Gasto da execução (soma do gasto por agente da sessão). Tudo vem do backlog em cache e do resumo de gasto, sem leitura nova ([RN-632](parte-05.md#rn-632), [RN-794](parte-06.md#rn-794)); sem leitura o indicador diz "—", nunca zero. Com a execução parada o cartão de chamada, as áreas com o paralelismo e a fila seguem como eram ([RN-1220](parte-07.md#rn-1220)). O indicador só aparece na visão Executores.
- **Onde:** `src/routes/IndicadoresDaExecucao.tsx`, `src/lib/execucao-tabela.ts` (`contarTarefas`), `src/routes/ResumoDaExecucao.tsx` (agora só parada).
- **Teste:** `src/routes/ProjectExecutorsTab.test.tsx`, `src/lib/execucao-tabela.test.ts`.
- **Origem:** AT-970 (EP-035), prancha L05 da v11.

<a id="rn-1463"></a>

### RN-1463 — A linha de aprovação tem título curto, comando recolhido e idade {#rn-1463}

- **Regra:** o título de uma aprovação de terminal é a justificativa do agente quando o payload traz uma (`justificativa`, `justification`, `motivo` ou `rationale`); sem ela, "Terminal · ‹primeiro comando›" (a primeira palavra depois de `cd … &&`, `;` ou variáveis `X=1`). Nenhum título passa de 80 caracteres (corta com reticências, nas outras ações também). O comando inteiro fica numa linha mono cortada com reticências e abre inteiro ao clicar nela (`aria-expanded`). Cada linha mostra a idade num chip; acima de 30 dias o chip é âmbar (`--warning`). A decisão de plano segue só no card (RN-467 e AT-910), sem caixa de seleção.
- **Onde:** `src/lib/caixa-de-decisoes.ts` (`tituloDoTerminal`, `primeiroComando`), `src/components/CaixaDeDecisoes.tsx` (`LinhaDeAprovacao`).
- **Teste:** `src/routes/DecisionsPage.test.tsx`.
- **Origem:** AT-968 (EP-035), prancha L03 da v11.

<a id="rn-1464"></a>

### RN-1464 — As aprovações agrupam por projeto, mais antigas primeiro, e a sessão encerrada não aprova {#rn-1464}

- **Regra:** a fila Aprovações ordena pela idade (a mais antiga primeiro) e agrupa por projeto, com o cabeçalho "‹projeto› · N aprovações". Se a sessão da aprovação está encerrada (`closed` ou `closed_abnormally`, lida de `GET /projects/:id/sessions`), o cabeçalho diz "sessão encerrada há N dias: aprovar não executa mais nada" e a linha perde o "Aprovar"; "Negar" fica. Sem a leitura da sessão a tela não afirma nada: a linha mantém o "Aprovar" (EP-020). O cartão "Aprovações" diz "N esperam há mais de 30 dias" (com "pelo menos" quando a fila vem truncada, porque só as lidas são contadas); as cinco filas continuam sem soma (RN-467).
- **Onde:** `src/components/CaixaDeDecisoes.tsx`.
- **Teste:** `src/routes/DecisionsPage.test.tsx`.
- **Origem:** AT-968 (EP-035), prancha L03 da v11.

<a id="rn-1465"></a>

### RN-1465 — Negar em lote pede um motivo único e chama a negação existente uma vez por item {#rn-1465}

- **Regra:** cada linha decidível das Aprovações tem caixa de seleção. Com uma ou mais marcadas aparecem "N selecionadas" e "Negar selecionadas…", que abre um diálogo com os títulos e um motivo obrigatório e único; confirmar chama `denyAction` uma vez por item (`allSettled`): as negadas saem da seleção e da lista, as que falharem ficam marcadas e o diálogo diz quantas. "Selecionar as de mais de 30 dias" marca as antigas. NÃO existe "Aprovar selecionadas", de propósito. Nenhuma rota nova na api. O kit não tem `AlertDialog`; o diálogo usa o `Modal` (Dialog do shadcn).
- **Onde:** `src/components/CaixaDeDecisoes.tsx` (`NegarEmLote`).
- **Teste:** `src/routes/DecisionsPage.test.tsx`.
- **Origem:** AT-968 (EP-035), prancha L03 da v11.

<a id="rn-1472"></a>

### RN-1472 — O explorador de arquivos tem linhas de 28 px com ícone e nome juntos, e a faixa do Código não deixa coluna vazia {#rn-1472}

- **Regra:** cada linha do explorador (pasta ou arquivo) é uma linha `flex` de 28 px de altura, com o ícone de 14 px e o nome na mesma linha, e o recuo é de 18 px por nível (antes 13 px; o nome do arquivo alinha com o da pasta do mesmo nível). A pasta antes deixava o ícone numa linha acima do nome, porque o título do `Disclosure` é um bloco. Na página do projeto, uma aba que desenha até a borda e tem sub-abas (só o Código: Arquivos, PRs) empilha a faixa de sub-abas EM CIMA do painel; antes elas ficavam lado a lado e sobrava uma coluna vazia de cerca de 134 px entre a sidebar e a trilha do explorador, que agora fica colada na borda da área de conteúdo.
- **Onde:** `src/routes/code/CodeExplorer.tsx` e `.module.css` (`.linha`, `.tituloPasta`, `RECUO_POR_NIVEL`), `src/routes/ProjectPage.tsx` e `.module.css` (`.colunaComSubAbas`).
- **Teste:** `src/routes/code/CodeExplorer.test.tsx` ("a linha é uma só").
- **Origem:** AT-971 (EP-035), prancha L06 da v11. Altura não medida em jsdom: a prévia `13-design/codigo-v11/` traz as medidas no navegador.

<a id="rn-1473"></a>

### RN-1473 — Sem arquivo escolhido, o editor abre o README.md da raiz {#rn-1473}

- **Regra:** ao carregar a raiz da ref, se nenhum arquivo foi aberto ainda e a raiz tem um arquivo `README.md`, ele abre numa aba e fica ativo. Vale uma vez por ref: fechar todas as abas depois NÃO o reabre, e um README em subpasta não conta. Sem README, o editor mostra o estado vazio do kit (`Empty`) com "Escolha um arquivo no explorador." (texto novo nos quatro idiomas; a menção à aba Buscar saiu). A leitura da raiz usa a MESMA `queryKey` do explorador (sem requisição a mais); erro de carga da raiz não abre nada e o explorador segue mostrando o erro.
- **Onde:** `src/routes/code/CodeShell.tsx` (`raizQuery`, `readmeVistoNaRef`), `src/routes/code/CodeEditor.tsx` (`Empty`).
- **Teste:** `src/routes/code/CodeShell.test.tsx` ("AT-971 (RN-1473)").
- **Origem:** AT-971 (EP-035), prancha L06 da v11. O rótulo "aberto por padrão" veio na [RN-1494](#rn-1494).

<a id="rn-1474"></a>

### RN-1474 — Uma PR é uma linha, com os portões D, Q, S e V; o Merge só aparece com D, Q e S verdes {#rn-1474}

- **Regra:** na lista de PRs, cada PR é uma linha com número (mono, apagado), título em negrito, autor, branch e data, os quatro portões em linha (D Dev, Q QA, S SecOps, V você, cada um com a cor do estado: verde passou, terracota em curso, vermelho bloqueado, apagado pendente), o selo de estado e as ações. Os portões vêm da TAREFA da branch (`feature/task-…`): sem tarefa (PR de infra ou aberta à mão) não há portão a mostrar e o Merge segue (a tela não afirma o que não leu); PR mesclada mostra os quatro verdes. O motivo é UMA frase sob o título, na ordem: a recusa de merge (RN-705) em âmbar, num único parágrafo (vem primeiro porque, depois de um conflito, a tarefa volta a `in_progress` com o gate pendente, e é o conflito que diz o que destrava); tarefa bloqueada em cor de erro (o motivo gravado da tarefa; sem motivo, o gate pendente, como na RN-768); portão pendente em cor neutra. **Revisa a RN-663 (api) e a RN-768:** o "Merge" só aparece com D, Q e S verdes e a tarefa sem bloqueio; com portão pendente ou falho a ação é a que destrava, "Pedir o parecer de novo" (o `RetomarGateEstacionado` da Sessão, sem a nota ao lado), quando o ciclo do gate da tarefa está estacionado (`gate.rescue_parked` da sessão mais recente), e nada quando não está. O botão desabilitado que flutuava saiu. Enquanto o backlog carrega, a coluna das ações tem o lugar reservado ([RN-816](parte-06.md#rn-816), agora uma caixa de 160 × 24 px). O campo "Já sabe o nº?" virou a busca da lista (número, título, autor ou branch, ignorando `#` e caixa); Enter sem nenhuma PR que combine abre o diff pelo id digitado, como antes. A legenda dos portões fica numa linha abaixo da lista; o diff continua no painel que já existia.
- **Onde:** `src/routes/ProjectPrsTab.tsx`, `src/routes/code/PrListAndDiff.tsx` (`renderItemPortoes`, `renderItemMotivo`, busca), `src/components/PortoesDaPr.tsx`, `src/lib/portoes-da-pr.ts`, `src/routes/RetomarGateEstacionado.tsx` (`rotulo`, `compacto`).
- **Teste:** `src/routes/ProjectPrsTab.test.tsx`, `src/routes/code/CodeDiffPanel.test.tsx`, `src/lib/portoes-da-pr.test.ts`.
- **Origem:** AT-971 (EP-035), prancha L06 da v11. Declarado: "Pedir o parecer de novo" depende do evento de estacionamento estar entre os 200 últimos da sessão mais recente; o "Ver diff" da prancha não foi feito (a linha inteira abre o diff).


<a id="rn-1469"></a>

### RN-1469 — O selo do sino conta só o que precisa de você, e a gaveta lista esses itens primeiro {#rn-1469}

- **Regra:** o selo do sino é a soma dos `total` REAIS das cinco filas da Caixa de decisões (`useDecisionInbox`, o mesmo cache da RN-467; o total vale mesmo com a lista cortada pelo teto), nunca a atividade não lida: com 8.404 eventos e 2 decisões o selo mostra 2, e sem decisões o sino fica sem selo (acima de 99, "99+"). Revisa a contagem antiga (por `seq` mais promoções pendentes) e a [RN-091](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-091) só no que o selo conta; o corte de leitura segue o mesmo. A seção "Precisam de você" lista uma linha por item (sujeito, motivo, projeto, idade e "Abrir", que leva à aba onde a decisão mora). Sem leitura do inbox a seção diz que não conseguiu ler, nunca "nada espera por você" (EP-020). Nenhum endpoint novo. Fora de escopo: eventos de "agente parado" como fonte própria, porque a api não tem sinal distinto além de `agentesAguardando`, já coberto pelas aprovações e PRs.
- **Onde:** `src/lib/notificacoes.ts`, `src/components/NotificationBell.tsx`, `src/routes/Dashboard.tsx`.
- **Teste:** `src/lib/notificacoes.test.ts`, `src/components/NotificationBell.test.tsx`.
- **Origem:** AT-966 (EP-035), prancha L01 da v11.

<a id="rn-1470"></a>

### RN-1470 — A atividade é uma linha por projeto; projetos parados há mais de 30 dias somam numa linha {#rn-1470}

- **Regra:** "Atividade por projeto" mostra uma linha por projeto com a contagem de eventos não lidos e a idade do evento mais recente; clicar abre a Visão geral do projeto. "atividade em ‹ator›" deixa de ser linha individual. Projeto cujo evento mais recente tem mais de 30 dias entra na linha única "N projetos parados há mais de 30 dias · X eventos"; projeto com eventos ainda não carregados nunca é dado como parado, nem ganha idade inventada. Revisa a [RN-100](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-100) do lado do web: a gaveta deixou de listar os eventos e o aviso "+ N mais antigos" saiu, porque a linha do projeto já traz o total.
- **Onde:** `src/lib/notificacoes.ts` (`agruparAtividade`), `src/components/NotificationBell.tsx`.
- **Teste:** `src/lib/notificacoes.test.ts`, `src/components/NotificationBell.test.tsx`.
- **Origem:** AT-966 (EP-035), prancha L01 da v11.

<a id="rn-1471"></a>

### RN-1471 — O painel do sino tem 420 px, sem rolagem horizontal, e o rodapé diz "Marcar atividade como lida" {#rn-1471}

- **Regra:** o painel tem largura fixa de 420 px (menos que a janela em telas estreitas), `scrollWidth === clientWidth` e texto longo quebrando em até 2 linhas. "Marcar atividade como lida" substitui "marcar as N como lidas" e chama o mesmo corte por `seq` de hoje ([RN-091](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-091)); só a atividade é marcada, os itens que precisam de você ficam até serem decididos.
- **Onde:** `src/components/NotificationBell.module.css`, `src/components/NotificationBell.tsx`.
- **Teste:** `src/components/NotificationBell.test.tsx` (a rolagem horizontal é medida na prévia, `13-design/notificacoes-v11`).
- **Origem:** AT-966 (EP-035), prancha L01 da v11.

<a id="rn-1478"></a>

### RN-1478 — Com as cinco filas em zero, "Precisa de você" é uma linha de até 48 px {#rn-1478}

- **Regra:** na Visão geral, com as cinco filas (RN-467) em zero a faixa vira uma linha ("Nada espera por você agora." e o link "Abrir Decisões"), sem os cinco contadores. Com qualquer fila acima de zero volta a faixa de hoje, mas só com os chips das filas que têm item. Fila ainda não lida continua sendo "não sei" (EP-020), como na RN-890. Revisa a RN-890 só na forma; as filas seguem separadas e lidas pelo projeto (RN-638).
- **Onde:** `src/components/FaixaPrecisaDeVoce.tsx`.
- **Teste:** `src/routes/ProjectOverviewTab.test.tsx` (a altura de 48 px é medida na prévia, `13-design/visao-geral-v11`).
- **Origem:** AT-975 (EP-035), prancha L10 da v11.

<a id="rn-1479"></a>

### RN-1479 — A prévia do entregável só existe depois que a porta responde {#rn-1479}

- **Regra:** "Rodar na sua máquina" só monta o `iframe` depois de um `fetch` com `mode: 'no-cors'` à primeira URL local declarada responder em até 3 s. Sem resposta a prévia dá lugar a uma linha: "‹endereço› não respondeu. Suba a aplicação com o comando acima.", com "Tentar de novo" e "Abrir em nova aba". A checagem roda ao abrir a aba e ao clicar em "Tentar de novo"; não há polling. Revisa a RN-855 só na prévia; a nota "declarado pela Infra na PR, não verificado na sua máquina" continua. A resposta opaca do `no-cors` só prova que a porta atende, não que a página está certa.
- **Onde:** `src/components/EntregavelPreview.tsx`.
- **Teste:** `src/components/RodarNaSuaMaquina.test.tsx`.
- **Origem:** AT-975 (EP-035), prancha L10 da v11.

<a id="rn-1480"></a>

### RN-1480 — A atividade da Visão geral agrupa turnos seguidos do mesmo agente e o próximo passo abre a página {#rn-1480}

- **Regra:** em "Atividade", turnos seguidos do mesmo agente viram uma linha ("dev-http-api · 7 turnos, N passos") com a idade do mais recente; no máximo 5 linhas e o link "Ver a linha do tempo inteira". O seletor é um `ToggleGroup` "Turnos | Eventos" e, em Turnos, o contador diz o recorte ("últimos N turnos", a janela da RN-180), não o total de eventos. O "Próximo passo" (RN-1162) sai da coluna lateral e abre a coluna principal, com a ação à direita, e ABSORVE os Primeiros passos (RN-708, revisada): enquanto houver passo pendente é UM cartão com os passos (o atual em destaque, mesmas ações e textos, "Começar a ideação" uma vez só, sem esperar o backlog); com os três feitos volta a ser o Próximo passo de hoje. No "Time de agentes" quem trabalha, parou ou espera você fica à vista e os ociosos somam no cartão "+ N concluídos ou ociosos", que os abre (é nele que mora "Procurar tarefa de novo") e vira "Recolher os ociosos"; sem ninguém ativo todos ficam à vista. Não precisa de dado novo da api. Os passos somam só os `tool.result` que a janela de 200 eventos já tem.
- **Onde:** `src/lib/turnos-agrupados.ts`, `src/routes/ProjectOverviewTab.tsx`, `src/components/ProximoPasso.tsx`, `src/components/PrimeirosPassos.tsx` (variante `integrado`).
- **Teste:** `src/routes/ProjectOverviewTab.test.tsx`.
- **Origem:** AT-975 (EP-035), prancha L10 da v11.

<a id="rn-1475"></a>

### RN-1475 — O diagrama da Arquitetura abre legível: da esquerda para a direita, 300 px, texto de 12,5 px ou mais {#rn-1475}

- **Regra:** o grafo de módulos corre da esquerda para a direita (quem depende fica à esquerda, quem não depende de ninguém à direita), com 300 px de altura (420 px quando a altura útil passa de 1000 px). O zoom inicial é 1 e o texto dos nós tem 12,5 px ou mais (nenhum zoom inicial o encolhe); se o grafo não cabe na largura, ele começa na borda esquerda e se arrasta na horizontal. O botão "Ajustar à largura" fica ao lado dos controles de zoom e encolhe o grafo à área. Os diagramas C4 (Mermaid) entram no tamanho natural do SVG, com o `viewBox` ajustado ao conteúdo real (`getBBox` + 16 px; o título do Mermaid sai da vista), rolagem na horizontal e o mesmo botão no canto direito do cabeçalho (os rótulos de estereótipo `<<person>>` do Mermaid ficam em 12 px, fora do controle da tela). Não troca a biblioteca do diagrama. O Mermaid C4 não tem direção de fluxo: o "esquerda para direita" vale para o grafo de módulos.
- **Onde:** `src/components/ai-elements/canvas.tsx`, `src/components/ai-elements/canvas.helpers.tsx`, `src/components/C4DiagramView.tsx`, `src/components/C4DiagramView.module.css`, `src/lib/svg-largura.ts` (`ajustarAoConteudo`).
- **Teste:** `src/components/ai-elements/canvas.test.tsx`, `src/components/C4DiagramView.test.tsx` (o corpo medido no navegador está em `13-design/arquitetura-v11`).
- **Origem:** AT-972 (EP-035), prancha L07 da v11. Revisa a orientação de baixo para cima da AT-946 (v9).

<a id="rn-1476"></a>

### RN-1476 — Diagrama, ADRs e Pendências são vistas de um ToggleGroup, com a contagem {#rn-1476}

- **Regra:** no topo da Arquitetura, um `ToggleGroup` ("Diagrama", "ADRs · N", "Pendências · N") escolhe a vista; o padrão é Diagrama (grafo de módulos e diagramas C4). ADRs e Pendências só aparecem na própria vista, cada uma com a frase de vazio. A contagem vem da resposta da API e usa o formatador de números do locale. A tabela de módulos e os contratos ficam abaixo, em qualquer vista, e a faixa PROPOSTA continua no topo. Erro de carga segue [RN-088](parte-01.md#rn-088) (AT-965).
- **Onde:** `src/routes/ProjectArchitectureTab.tsx`, `src/routes/ProjectArchitectureTab.module.css`, `src/locales/*/overview.json` (`architectureTab.views`).
- **Teste:** `src/routes/ProjectArchitectureTab.test.tsx`.
- **Origem:** AT-972 (EP-035), prancha L07 da v11. Revisa [RN-1387](parte-07.md#rn-1387): os contratos seguem abaixo da tabela, e os ADRs e as pendências deixam de ser seções soltas.

<a id="rn-1477"></a>

### RN-1477 — A tabela de módulos quebra linha em Stack e Responsabilidade e não rola na horizontal {#rn-1477}

- **Regra:** as colunas Stack e Responsabilidade usam `white-space: normal` (classe `celulaQuebra`, que anula o `nowrap` do kit, e quebram palavras longas), de modo que `scrollWidth === clientWidth` na tabela a partir de 1100 px de janela (1366 px medido). A coluna Histórias usa o formatador de números do locale.
- **Onde:** `src/routes/ProjectArchitectureTab.tsx`.
- **Teste:** `src/routes/ProjectArchitectureTab.test.tsx` (classe `celulaQuebra`; a rolagem é medida na prévia).
- **Origem:** AT-972 (EP-035), prancha L07 da v11.

<a id="rn-1487"></a>

### RN-1487 — Nos Gastos do owner o gráfico fica ao lado do cartão do teto, e os indicadores dizem desde quando e quanto {#rn-1487}

> **Revisa** a posição do cartão da [RN-1450](#rn-1450) e completa a [RN-1451](#rn-1451).

- **Regra:** na aba Gastos do projeto e na página Gastos do workspace do owner, os indicadores ocupam a largura inteira e a faixa seguinte é uma grade de duas colunas: o gráfico por dia à esquerda e o cartão `#teto` (320 px) à direita, com o mesmo topo (diferença de até 4 px) e até 160 px de altura com o cartão fechado. Abaixo de 1100 px o cartão desce para baixo dos indicadores. O cartão fechado resume a previsão e a virada do mês numa linha só ("Previsão US$ 41,20 · o mês vira 01/12"); os dias restantes e a frase inteira vão no `title` e em texto para leitor de tela. Total ganha "desde dd/mm", o primeiro dia com gasto da série densa de 30 dias; Chamadas ganha "<modelo> em N%" (o modelo com mais chamadas), e só quando a aba já leu o gasto por modelo, senão fica sem nota (a tela não afirma o que não leu, RN-180). As notas de tokens ("N entrada · N saída") usam os mesmos tokens abreviados, com os inteiros no `title`, em "O meu consumo" do membro e nos indicadores do workspace; nenhum número de mais de 6 dígitos fica visível. "Ver os N agentes" é um link do kit (sublinhado, à esquerda, cor `--text-primary`, que passa AA nos dois temas), não um botão neutro centralizado. O custo médio abaixo de 1 centavo segue com 4 casas ("US$ 0,0012").
- **Onde:** `src/components/SpendPaineis.tsx` (`GastoDoWorkspace`, `DestaquesDoTotal`, `DetalheDeTokens`), `src/components/TetoDoMes.tsx`, `src/routes/ProjectSpendTab.module.css` (`comTeto`), `src/lib/spend.ts` (`primeiroDiaComGasto`), `src/components/ui/BotaoLink.tsx`.
- **Teste:** `src/routes/ProjectSpendTab.test.tsx` (as sobras da v11), `src/components/CredentialSpendSection.helpers.test.ts`.
- **Origem:** AT-1005 (EP-035), prancha L08 da v11 e itens 1, 8 e 14 da AT-1000.

<a id="rn-1488"></a>

### RN-1488 — Em Modelos e Pessoas o Popover usa a fonte do texto, o roteamento tem uma ação e as tabelas vazias são uma linha {#rn-1488}

> **Revisa** a [RN-1454](#rn-1454) e a [RN-1504](#rn-1504).

- **Regra:** o Popover da cascata ("De onde vem") usa a fonte do texto, não a mono; só o identificador do modelo ("Se perder o modelo próprio, vale: `X`") fica em mono. "Mostrar os outros N agentes" é um link do kit ([RN-1487](#rn-1487)). A faixa de aviso de roteamento mostra a frase curta ("Roteamento: não provado em <provider>.") e, à direita, "O que isso muda", que abre a frase inteira num Popover. O cabeçalho "Custo estimado mensal do time" deixa de ser uma faixa à parte e entra no título da tabela ("N agentes · US$ X estimado por mês", com a base de 30 dias no `title`). A linha de Modelos segue com cerca de 55 px, a medida da L09 (decisão do dono de 20/11). O erro do convite tem ícone de erro e o texto na cor de erro (`--danger`). As tabelas vazias de tokens e de chaves de dispositivo são uma linha de até 48 px, e a frase de "Tokens de acesso" não se repete em "Todos os tokens do projeto" (que diz "Ninguém neste projeto emitiu token.").
- **Onde:** `src/routes/settings/ModelsSection.tsx`, `src/routes/ProjectSettingsTab.module.css` (`cadeiaNoPopover`, `idDoModelo`), `src/routes/settings/MembersSection.tsx`, `src/components/ui/Table.tsx` (`vaziaEmUmaLinha`), `src/routes/settings/PersonalAccessTokensSection.tsx`, `src/routes/settings/RunnerDeviceKeysSection.tsx`.
- **Teste:** `src/routes/settings/preferencia-de-roteamento.test.tsx`, `src/routes/settings/papel-na-secao-de-membros.test.tsx`, `src/routes/settings/chaves-de-dispositivo.test.tsx`, `src/routes/ProjectSettingsTab.test.tsx`, `test/popover-da-cascata.test.ts`.
- **Origem:** AT-1005 (EP-035), prancha L09 da v11.

<a id="rn-1489"></a>

### RN-1489 — Em Projeto e execução a escada tem rótulos e o Salvar no rodapé, e os controles usam o kit {#rn-1489}

> **Complementa** a [RN-1265](parte-07.md#rn-1265), a [RN-1142](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1142) e a [RN-1316](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1316); confirma a [RN-1455](#rn-1455).

- **Regra:** "Editar em Gastos" é o `Link` do roteador para `?tab=spend#teto` e não recarrega a página. Cada campo da escada de modelos tem um `<label>` visível ligado pelo `for` ("Modelo do degrau N", "Teto do degrau N (US$)"). O Salvar da escada desce para o rodapé da seção, com a contagem de alterações não salvas; o gesto e a confirmação próprios não mudam ([RN-1265](parte-07.md#rn-1265), [RN-469](parte-03.md#rn-469)). O merge automático usa o `Checkbox` do kit ao lado do rótulo "Entrar sozinha", sem `input[role="switch"]` nativo. No teto por área "sem teto" tem um estado só, "sem teto próprio" (sai o trio "Sem valor próprio", "sem teto" e o placeholder). A promoção de histórias entra na `LinhaDeConfiguracao`: rótulo à esquerda e o controle na coluna de 520 px, como os outros controles da seção.
- **Onde:** `src/routes/settings/ExecutionSection.tsx`, `src/routes/settings/TetoPorTarefaSection.tsx`, `src/routes/settings/MergeAutomaticoSection.tsx`, `src/routes/settings/BudgetSection.tsx`, `src/routes/settings/PromotionSection.tsx`.
- **Teste:** `src/routes/settings/teto-e-escada.test.tsx`, `src/routes/settings/teto-so-em-gastos.test.tsx`, `src/routes/settings/MergeAutomaticoSection.test.tsx`, `src/routes/settings/heranca.test.tsx`, `src/routes/ProjectSettingsTab.test.tsx`.
- **Origem:** AT-1005 (EP-035), prancha L09 da v11 e a W3 da AT-1000.

<a id="rn-1484"></a>

### RN-1484 — Moeda e número saem no idioma da interface {#rn-1484}

- **Regra:** a moeda é USD (ADR 0040) e o número de casas é o de cada tela (Execução e turno com 4, aprovações e atividade com 2), mas o separador segue `i18n.language`, lido a cada chamada: em pt-BR "US$ 0,9790", em en "$0.9790". Um formatador só, `formatarUsdCasas` em `lib/currency.ts`, atende `formatMicros`, `dolar`, `formatarCusto`, `dolares` (aprovações) e o teto da atividade; os preços de `lib/models.ts` e do catálogo trocam o `'en-US'` fixo pelo idioma vigente. Os `toLocaleString()` sem argumento e os `'pt-BR'` fixos (gráfico de gasto, janela do agente, Hugging Face, sessões, painel do Código) usam `i18n.language`. O custo médio abaixo de 1 centavo segue com 4 casas (RN-1451).
- **Onde:** `src/lib/currency.ts`, `execution.ts`, `executores-ao-vivo.ts`, `resumo-de-turno.ts`, `activity.ts`, `aprovacoes.ts`, `models.ts` e os componentes citados.
- **Teste:** `src/lib/formatacao-pt-br.test.ts`.
- **Origem:** AT-1004 (EP-035).

<a id="rn-1485"></a>

### RN-1485 — A contagem sai com separador de milhar {#rn-1485}

- **Regra:** as chaves de contagem (eventos, chamadas, tokens, arquivos, linhas, mensagens) usam `{{count, number}}`, a formatação do i18next, que segue o idioma: "8.404 eventos" em pt-BR e "8,404 events" em en. Os plurais continuam decididos pelo `count`. pt-BR, en, ru e zh-Hans mudam juntos, para a paridade. Onde o chamador já passa o valor formatado, a chave fica como está, para não formatar duas vezes.
- **Onde:** `src/locales/*/*.json` (só chaves de contagem).
- **Teste:** `src/lib/formatacao-pt-br.test.ts` (8404 em pt-BR e en).
- **Origem:** AT-1004 (EP-035).

<a id="rn-1486"></a>

### RN-1486 — O Snippet copia com texto e a borda segue o tema {#rn-1486}

- **Regra:** o `Snippet` mostra o rótulo ("Copiar"/"Copiado") ao lado do ícone (RN-102, `AcaoCopiar` com `comTexto`); o copiar só com ícone do fio não muda. A borda sem cor (a `border-b` da `Table`, por exemplo) usa `var(--border)` por uma regra `@layer base` em `shadcn.css`, e não o `currentColor` do preflight.
- **Onde:** `src/components/ai-elements/copiar.tsx`, `snippet.tsx` e `src/shadcn.css`.
- **Teste:** `src/lib/formatacao-pt-br.test.ts`.
- **Origem:** AT-1004 (EP-035).

<a id="rn-1481"></a>

### RN-1481 — Cada linha de Containers tem uma ação com texto, escolhida pelo estado; parar, ver detalhes e remover moram no menu "…" {#rn-1481}

- **Regra:** a coluna Ações tem uma única ação com texto, em variante secundária: container de pé ("rodando" ou "provisionando"), "Abrir" (link para `/containers/$projectId`); projeto sem imagem decidida, "Decidir imagem" (link para o projeto); nos demais casos "Subir de novo" (com registro) ou "Subir container" (sem registro), desabilitada quando o motivo é papel, sessão, broker ou runner, com o motivo no "?" como antes ([RN-646](parte-05.md#rn-646)). "Parar", "Ver detalhes" e "Remover" ficam no menu "…" (botão só de ícone, legenda "Mais ações de ‹projeto›"); "Remover" vem depois de um separador, em variante destrutiva; "Parar" e "Remover" seguem desabilitados quando não há o que parar ou remover. Nenhum botão primário na tabela. O cartão de aprovação de ação pendente, a confirmação por `proposed_action` e a seção "Remoção pendente" ([RN-1446](#rn-1446)) não mudam. Os cabeçalhos ordenáveis têm área de clique de 32 px.
- **Onde:** `src/components/AcoesDoContainer.tsx`, `src/components/ui/Table.module.css` (`.ordenar`), `src/locales/*/containers.json` (`actions.open`, `actions.decideImage`, `actions.menu`, `actions.detalhes`).
- **Teste:** `src/routes/ContainersPage.test.tsx` ("uma ação por linha", menu "…").
- **Origem:** AT-976 (EP-035), prancha L11 da v11. Revisa [RN-646](parte-05.md#rn-646): Parar e Remover deixam de ser botões da linha. Fora: "Subir container" primário no topo da página (não há alvo único para ele) e logs (a tela de detalhe não os tem; o menu leva ao detalhe).

<a id="rn-1482"></a>

### RN-1482 — A matriz de capacidades usa rótulos legíveis e as abas do catálogo mostram só providers com chave {#rn-1482}

- **Regra:** as colunas da matriz "O que cada provider sabe fazer" usam o rótulo de `providers.capabilities.columns.<chave>` (Streaming, Ferramentas, Lista de modelos, Embeddings, Raciocínio, Roteamento, Sessão fixa, Cache de preço, Cache de prompt, Visão), com o identificador da API no `title`; chave nova, ainda sem rótulo, aparece pelo identificador. "provado" continua selo verde; "não provado" é texto simples, sem selo. A tabela rola dentro do próprio contêiner (`max-width: 100%`). No catálogo de modelos só viram aba os providers com chave do titular (ou locais); os sem chave, inclusive com modelo ativo, saem das abas e ficam na linha "N de fora, sem chave do titular" e em "Adicionar provider" (Credenciais).
- **Onde:** `src/routes/ProvidersPage.tsx`, `src/routes/ProvidersPage.module.css`, `src/components/ModelCatalogSection.tsx`, `src/locales/*/providers.json`, `src/locales/*/models.json` (`catalog.tabs.noKey` e `noKeyNote` saíram).
- **Teste:** `src/routes/ProvidersPage.test.tsx`, `src/components/ModelCatalogSection.test.tsx`.
- **Origem:** AT-976 (EP-035), prancha L11 da v11. Revisa [RN-931](parte-06.md#rn-931) e a [RN-043](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md): a aba marcada "sem chave" para desativar modelo ativo deixou de existir na tela do catálogo. O rótulo "Cache de preço" é o da prancha para `priceCeiling` (na API é o teto de preço).

<a id="rn-1483"></a>

### RN-1483 — Na página Status o "Voltar" tem ícone e texto, fica no topo, à esquerda do título {#rn-1483}

- **Regra:** `/status` mostra, antes do `<h1>`, o botão "Voltar" (ícone de seta e texto, variante secundária) que leva ao destino decidido pelo router; o botão só de ícone abaixo da tabela sai. A página continua fora do shell, com a rota pública.
- **Onde:** `src/routes/StatusPage.tsx`.
- **Teste:** `src/routes/StatusPage.test.tsx`.
- **Origem:** AT-976 (EP-035), prancha L11 da v11. Revisa o botão só de ícone da AT-327.

<a id="rn-1490"></a>

### RN-1490 — O Início, o Novo projeto e a Caixa fecham as sobras da v11: chip "parado", passos com nome, título do plano e seta nas linhas {#rn-1490}

- **Regra:** (1) o cartão do projeto parado ganha o chip "parado" (tom neutro), pelo mesmo critério do filtro ([RN-1460](#rn-1460): `estaParado`, último evento há mais de 30 dias); sem o resumo do projeto o chip não aparece. (2) O rodapé do cartão usa a regra da "Atividade recente" ([RN-1462](#rn-1462)): evento genérico ("atividade em ‹ator›") não vira frase e o rodapé fica só com a idade. (3) No Novo projeto o nome de cada passo fica sob o número ("Origem · Onde mora · Revisar") e o passo atual leva `aria-current="step"`; no passo "Onde mora" os modos ficam numa grade de uma linha (2 linhas de texto cada) e o caminho da pasta ocupa a largura toda, sem rolagem interna em 1366 × 768. (4) Na Caixa o plano de execução tem título próprio, "Plano de execução do ‹lead›: N dev agents, um por módulo" (no máximo 80 caracteres, montado dos `modulos` do payload), e a linha de baixo deixa de repetir a frase. (5) A linha do plano troca o link "Abrir" pelo botão "Abrir plano", que leva ao card ([RN-467](parte-03.md#rn-467)); o plano continua fora da seleção em lote. (6) Toda linha da Caixa tem à direita o botão de seta (›) com o nome "Abrir ‹título›", para o mesmo destino do link de antes.
- **Onde:** `src/components/ProjectCard.tsx` (`parado`), `src/routes/Dashboard.tsx` (`lastActivityText`), `src/routes/NewProjectWizard.tsx` e `.module.css` (`stepper`, `modoGrid`), `src/lib/caixa-de-decisoes.ts` (`tituloDoPlano`, `detalheDoPlano`), `src/components/CaixaDeDecisoes.tsx`.
- **Teste:** `src/routes/Dashboard.test.tsx`, `src/routes/NewProjectWizard.test.tsx`, `src/lib/caixa-de-decisoes.test.ts`, `src/routes/DecisionsPage.test.tsx`.
- **Origem:** AT-1007 (EP-035), pranchas L02 e L03 da v11. Revisa [RN-1460](#rn-1460). Declarado: a nota "‹agente› · ‹projeto›" em "Agentes agora" fica fora, porque o Início mostra a seção como contagem e a resposta não traz o projeto de cada agente (sobra de api).

<a id="rn-1491"></a>

### RN-1491 — Na Execução, a faixa de parada é de aviso e as seções abaixo da tabela ficam recolhidas numa linha com a contagem {#rn-1491}

- **Regra:** (1) a faixa de execução parada ([RN-1061](parte-07.md#rn-1061)) usa o tom de aviso (âmbar), não o de perigo, e cabe numa linha em 1848 px; quando um gate estacionado está por trás da parada (`gate.rescue_parked` de uma tarefa bloqueada da parada), a faixa oferece "Pedir o parecer de novo", a mesma ação da linha da PR ([RN-1474](#rn-1474)); os botões de `DestravarExecucao` não mudam. (2) O modo automático do time, as tarefas bloqueadas com as PRs e as pendências de outras sessões ficam abaixo da tabela, cada seção recolhida numa linha com a contagem ("3 agentes em manual · Ver", "2 tarefas bloqueadas · 0 PRs · Ver") e abrem ao clicar; a página cabe em 925 px de altura. (3) Em Indicadores, "Ver a fila" fica na mesma linha do valor da Fila, e com zero tarefas rodando a nota diz "nenhuma rodando". (4) O menu "…" da linha da tabela tem 280 px no mínimo, e a dica do modo automático cabe em 3 linhas.
- **Onde:** `src/routes/ProjectExecutorsTab.tsx`, `src/routes/AcoesDaExecucao.tsx`, `src/components/PendenciasDeOutrasSessoes.tsx` (`padraoAberto={filasDoChat}`), `src/routes/IndicadoresDaExecucao.tsx`, `src/routes/TabelaDeExecutores.tsx` e `.module.css`.
- **Teste:** `src/routes/ProjectExecutorsTab.test.tsx`, `src/routes/AcoesDaExecucao.test.tsx`.
- **Origem:** AT-1007 (EP-035), prancha L05 da v11; decisão do dono de 20/11 (P2). Revisa [RN-1061](parte-07.md#rn-1061), [RN-1466](#rn-1466) e [RN-1468](#rn-1468). Declarado: sem chamadas no resumo, o "Gasto da execução" fica sem nota (sobra de api).

<a id="rn-1492"></a>

### RN-1492 — O cartão do agente da Visão geral mostra o chip "local", a autonomia com texto e as ações num menu {#rn-1492}

- **Regra:** (1) com o modelo local (provider `ollama`, o mesmo critério da categoria `local` do catálogo), o cartão ganha o ponto de atenção e o chip "local" ao lado do nome do modelo; sem o modelo no catálogo o chip não aparece. (2) A autonomia é um `ToggleGroup` com o texto visível "Manual | Piloto automático"; `aria-pressed` e `onAutonomyChange` não mudam. (3) "Procurar tarefa de novo" sai do corpo do cartão e entra no menu "⋯" ("Mais ações de ‹agente›"). (4) O gasto do cartão usa o formato pt-BR, com vírgula. (5) O texto da arquitetura vazia é "Ainda sem arquitetura. O Arquiteto desenha os módulos e as decisões depois das histórias."
- **Onde:** `src/components/AgentCard.tsx`, `src/components/AgentTeamGrid.tsx`, `src/locales/*/overview.json` (`architecture.emptyState`).
- **Teste:** `src/components/AgentCard.test.tsx`, `src/components/AgentTeamGrid.test.tsx`.
- **Origem:** AT-1007 (EP-035), prancha L10 da v11; revisa RN-603 e RN-670 só na forma do controle. O `formatMicros` local do cartão saiu: ele importa o de `lib/execution.ts`, em pt-BR desde a AT-1004 ([RN-1484](#rn-1484)).

<a id="rn-1503"></a>

### RN-1503 — Container que falhou mostra a primeira linha do motivo na lista; o nome do projeto abre o detalhe {#rn-1503}

- **Regra:** em `/containers`, a coluna "Detalhe" sai (a lista tem 7 colunas) e o nome do projeto abre `/containers/$projectId`. Com o registrado `failed` e `motivoDaFalha` (a primeira linha do `failureReason` gravado, vinda da api, [RN-1493 da api](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1493)), o status mostra o motivo numa linha cortada embaixo do selo, com "Ver detalhe"; sem motivo, só "falhou". O nome de imagem longo quebra a linha na coluna Imagem, sem reticências.
- **Onde:** `src/routes/ContainersPage.tsx` (`columns`), `src/routes/ContainersPage.module.css` (`.imagemTexto`, `.motivoDaFalha`), `src/lib/api-types.ts`.
- **Teste:** `src/routes/ContainersPage.test.tsx` ("AT-1006").
- **Origem:** AT-1006 (EP-035), prancha L11 da v11. Revisa a coluna "Detalhe" da AT-976.

<a id="rn-1494"></a>

### RN-1494 — Código: "aberto por padrão", busca e ref no cabeçalho, "Ver diff" por PR e o motivo à vista {#rn-1494}

- **Regra:** (1) quando o README abre sem escolha ([RN-1473](#rn-1473)), a linha do caminho mostra o rótulo apagado "aberto por padrão", que some ao escolher outro arquivo ou fechar uma aba. (2) O cabeçalho do editor tem o campo "Buscar no código", que abre a busca do painel lateral com o termo (mínimo de 2 caracteres); o botão da ref (`CodeBranchPicker`) mora no cabeçalho do explorador e da busca, e a barra "ref" acima do shell saiu. A trilha de ícones fica. (3) Cada PR tem o botão "Ver diff", que abre o mesmo diff; a linha inteira continua clicável. (4) O título "Pull requests do projeto" e a frase ficam na mesma linha. (5) Sem papel `developer`, o motivo do botão "Pedir o parecer de novo" desabilitado fica em texto à vista (RN-102), e não só para o leitor de tela.
- **Onde:** `src/routes/code/CodeShell.tsx`, `CodeEditor.tsx`, `CodeExplorer.tsx`, `CodeSearchPanel.tsx`, `PrListAndDiff.tsx`, `src/routes/ProjectPrsTab.tsx`, `src/routes/RetomarGateEstacionado.tsx`.
- **Teste:** `src/routes/code/CodeEditor.test.tsx`, `CodeShell.test.tsx`, `src/routes/ProjectPrsTab.test.tsx` ("AT-1006").
- **Origem:** AT-1006 (EP-035), prancha L06 da v11. Revisa a RN-768 e a RN-816.

<a id="rn-1495"></a>

### RN-1495 — Arquitetura: chips ao lado do toggle, legenda do grafo e rótulo de relação do C4 de 12 px ou mais {#rn-1495}

- **Regra:** ao lado do `ToggleGroup` entram os chips "módulos · v‹N›" (só com `moduleMap`, com a sua `version`) e "C4 nível 2" (só com o diagrama de contêineres gerado). Acima do grafo, a legenda "‹N› módulos · fluxo da esquerda para a direita" (N = `moduleMap.modules.length`); o fluxo vale só para o grafo, porque o Mermaid C4 não tem direção. O `mermaid.initialize` fixa `c4.messageFontSize` em 12, o piso dos rótulos de relação ("usa"). O título do Mermaid continua fora do quadro C4 (decisão do dono, 20/11).
- **Onde:** `src/routes/ProjectArchitectureTab.tsx`, `src/lib/mermaid-render.ts` (`TAMANHO_MINIMO_DO_ROTULO_C4`).
- **Teste:** `src/routes/ProjectArchitectureTab.test.tsx`, `src/lib/mermaid-render.test.ts`.
- **Origem:** AT-1006 (EP-035), prancha L07 da v11. Completa a [RN-1475](#rn-1475) e a [RN-1476](#rn-1476).

<a id="rn-1496"></a>

### RN-1496 — A Sessão dá 70% ou mais da altura ao fio, e o composer é compacto {#rn-1496}

- **Regra:** na coluna do chat, o fio (a conversa) mede 70% ou mais da altura da janela em 1848 × 925, 1440 × 900 e 1366 × 768. Para isso o composer fica em cerca de 120 px: o campo nasce de uma linha (`rows=1`, `field-sizing: content`, de 44 a 160 px) com a dica numa linha só, e o respiro do composer é de 8 px. Em janela baixa (`max-height: 800px`, a partir de 768 px de largura) a barra da sessão cai para 48 px (sai a linha de metadados), a faixa de estado para 32 px, o respiro do composer para 4 px e o campo para 36 px; o orçamento fixo de 264 px não deixaria o fio passar de 66% a 768 px.
- **Onde:** `src/routes/SessionComposer.tsx`, `SessionComposer.module.css` (`.campo`), `SessionPage.module.css` (`.composer`, bloco `max-height: 800px`), `FaixaDeEstado.module.css`.
- **Teste:** `src/routes/SessionComposer.menu.test.tsx` ("AT-1009"); o percentual é medido no DOM com o harness de `v10-final/fonte/`.
- **Origem:** AT-1009 (EP-035), recaptura da v10 (AT-963). Completa a AT-954 e a AT-960.

<a id="rn-1497"></a>

### RN-1497 — O aviso de PR pronta mostra o título da PR em uma linha {#rn-1497}

- **Regra:** o aviso de PR pronta (RN-1063) é uma linha de 44 px em que o título da PR ("PR #N "título" está pronta…") tem o espaço que sobra, cortado com reticências, e os botões ("Mergear", "Agora não") não quebram o rótulo nem passam de 44 px de altura. Dentro do aviso a nota do merge ("Pede a confirmação aqui mesmo…", `MergearNoChat` com `semNota`) sai da vista e fica só para leitor de tela (`sr-only`); a confirmação segue no `Popover` do Mergear. Sem papel para decidir, a nota continua à vista com o motivo.
- **Onde:** `src/components/AvisoDePrPronta.tsx`, `AvisoDePrPronta.module.css`, `src/routes/MergearNoChat.tsx` (`semNota`).
- **Teste:** `src/components/AvisoDePrPronta.test.tsx` ("AT-1009").
- **Origem:** AT-1009 (EP-035). Completa a RN-1063 e a RN-1434.

<a id="rn-1498"></a>

### RN-1498 — Telefone: o fio com 65% ou mais, nada passa da largura, e a trilha da barra não é cortada {#rn-1498}

- **Regra:** em 390 × 844 o fio mede 65% ou mais da altura e nenhum elemento passa da largura. A barra da sessão tem 48 px; a faixa de estado perde a barra de progresso ("N de M tarefas" diz o mesmo) para o custo e o "Executores" caberem; a barra do composer é uma linha (o aviso "Há mais de um agente…" fica só para leitor de tela, o seletor já diz "Escolha o agente") e o respiro do composer é de 4 px. Em qualquer largura a trilha "Sessões / título" não começa acima do topo (`top` maior ou igual a 0): `.trilha` e `.meta` têm `line-height: 1.2`, e as três linhas do bloco do título cabem nos 55 px da barra.
- **Onde:** `src/routes/FaixaDeEstado.module.css`, `SessionPage.module.css` (`.topbarMovel`, `.trilha`, `.meta`, `.composer[data-layout='movel']`), `src/components/AvisoDePrPronta.module.css`.
- **Teste:** medido no DOM com o harness de `v10-final/fonte/` (jsdom não calcula o layout).
- **Origem:** AT-1009 (EP-035). Completa a RN-1432 a RN-1434.

<a id="rn-1499"></a>

### RN-1499 — Ação em texto e linha clicável isolada têm alvo de pelo menos 24 px de altura, sem mudar o texto nem a altura da tela {#rn-1499}

- **Regra:** todo `<a>` ou `<button>` que não é um link dentro de frase mede 24 px ou mais de altura (WCAG 2.2, 2.5.8). O `BotaoLink` do kit (`display: inline-flex`, `min-height: 24px`) cobre "O que isso muda" e "Mostrar os outros N agentes"; o mesmo vale para "Ver no fio" (lista de executores), "Abrir a sessão →" (Próximo passo), "Abrir em nova aba" (prévia do entregável), o comando de cada linha da Caixa e a linha de cada turno da Atividade. Onde a linha era menor que 24 px, uma margem vertical negativa devolve o excesso ao fluxo: a altura da tela muda no máximo 8 px (nas telas medidas, 0). Exceções: link dentro de frase, a trilha "Toggle Sidebar" e os campos de 1×1 px de acessibilidade.
- **Onde:** `src/components/ui/BotaoLink.module.css`, `src/routes/TabelaDeExecutores.module.css`, `src/components/ProximoPasso.module.css`, `src/components/EntregavelPreview.module.css`, `src/components/CaixaDeDecisoes.module.css`, `src/routes/ProjectOverviewTab.module.css`.
- **Teste:** `src/components/ui/alvos-de-24px.test.tsx`.
- **Origem:** AT-1010 (EP-035), achado 1 da recaptura da v11 (AT-979). Aplica o critério da AT-977.

<a id="rn-1500"></a>

### RN-1500 — O `Checkbox` do kit tem alvo de 24 px e caixa visível de 16 px {#rn-1500}

- **Regra:** a raiz do `Checkbox` mede 24×24 px (`size-6`); a caixa de 16 px é desenhada pelo `::before`, e `-m-1` devolve 4 px por lado ao fluxo, então nenhuma linha ou tela cresce. Foco, erro (`aria-invalid`) e marcado seguem as mesmas cores, agora na caixa; o anel de foco envolve o alvo de 24 px.
- **Onde:** `src/components/shadcn/checkbox.tsx`.
- **Teste:** `src/components/ui/alvos-de-24px.test.tsx`.
- **Origem:** AT-1010 (EP-035). Vale para a Caixa, o Backlog, o merge automático, Modelos e os pickers de modelo.

<a id="rn-1501"></a>

### RN-1501 — No editor do Código, o campo "Buscar no código" e o botão "Blame" têm 24 px de altura {#rn-1501}

- **Regra:** `buscaCampo` e `blameToggle` passam de 22 para 24 px; o texto continua em `--fs-label`.
- **Onde:** `src/routes/code/CodeEditor.module.css`.
- **Teste:** `src/components/ui/alvos-de-24px.test.tsx`.
- **Origem:** AT-1010 (EP-035). Complementa a [RN-1494](#rn-1494).

<a id="rn-1510"></a>

### RN-1510 — A aba Pendências mostra o que espera no chat, o fio só pausa por gesto e "Ir ao fim" é faixa {#rn-1510}

- **Regra:** (1) a aba Pendências ganha a fila "Esperando você neste chat": uma LINHA por ação pendente da sessão aberta e por oferta de passagem (`offered`), com "Ver no chat". A linha não desenha segundo cartão e não se registra no bloco (o cartão segue no fio, RN-843); a fila tem contagem própria (RN-467) e entra no contador da aba, então "Nenhuma pendência neste projeto" só aparece com todas as filas zeradas. Revisa a [RN-626](parte-05.md#rn-626) e a [RN-943](parte-06.md#rn-943). (2) A lista de perguntas em aberto polla a cada 15 s (ritmo de projeto, [RN-632](parte-05.md#rn-632)): a pergunta que o QA grava em OUTRA sessão aparece sem recarregar. (3) O fio só pausa quando a pessoa rola (roda, toque, tecla de rolagem ou barra, até 500 ms antes do `scroll`); a rolagem do sistema (ancorar no envio, âncora do navegador, `overflow-anchor: none` no fio) não pausa. A oferta de passagem entra na identidade do fio. Revisa a [RN-977](parte-06.md#rn-977). (4) "Ir ao fim" é uma faixa entre o fio e a doca (altura de conteúdo, RN-1389), fora da área que rola, e nunca cobre botão; com cartão novo durante a pausa o rótulo diz "Ir ao fim · N cartões esperando você".
- **Onde:** `src/lib/pendencias-do-projeto.ts` (`pendenciasDestaSessao`), `src/components/PendenciasDeOutrasSessoes.tsx` (`LinhaNoChat`), `src/lib/perguntas-em-aberto.ts`, `src/lib/session-rolagem.ts`, `src/components/shadcn/message-scroller.tsx`, `src/routes/SessionPage.tsx`, `src/routes/PainelDaSessao.tsx`.
- **Teste:** `src/components/PendenciasDeOutrasSessoes.test.tsx`, `src/lib/perguntas-em-aberto.test.tsx`, `src/lib/session-rolagem.test.tsx`, `src/routes/SessionPage.ordenacao-e-avisos.test.tsx`.
- **Origem:** AT-1022 (EP-036). A rolagem horizontal do chat (achado 5) ficou fora: a causa não foi achada.

> **Referência à [RN-1512](https://github.com/viralabs-dev/brabo-engine/blob/dev/docs/business-rules/engine.md#rn-1512) (engine, AT-1017).** O evento `qa.awaiting_environment` aparece como "Esperando a vez no teste: outra tarefa está usando o ambiente de teste. Segue sozinho quando liberar." (sem alarme) e deixa o `qa-automacao` em `aguardando`, nunca `falhou`. Onde: `src/lib/activity.ts:229` (`classifyEvent`), `src/lib/agent-status.ts:195` (`subagentStatus`). Teste: `src/lib/activity.test.ts`, `src/lib/agent-status.test.ts`.

<a id="rn-1531"></a>

### RN-1531 — O bloqueio mostra a causa em uma frase e a retomada em um clique; o diagnóstico e o campo livre ficam recolhidos {#rn-1531}

- **Regra:** o card de tarefa bloqueada (fila "Tarefas bloqueadas" das Pendências e "Pendências da execução" da Visão geral) mostra, nesta ordem: (1) a CAUSA em uma frase (`blockedExplicacao.causa`; sem explicação, a frase genérica "O agente parou e precisa de você para continuar."), nunca o `blockedReason` cru; (2) uma ou duas ações (`blockedExplicacao.acoes`; sem explicação, só "Tentar de novo"), a primeira em destaque, e o clique numa ação chama o `unblock` da [RN-826](parte-06.md#rn-826) UMA vez, com a `orientacao` dela e sem confirmação nem texto digitado (a [RN-1124](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-1124) da api é o caminho); (3) "Ver detalhes técnicos", recolhido, com o `blockedReason` inteiro; (4) "Escrever outra orientação", recolhido mas disponível, com o campo livre e "Desbloquear com este texto". O bloqueio do sistema (`explicacao.codigo`) é traduzido no web por `pendencias.bloqueadas.causas.<codigo>` e `acoes.<id>`, com o texto da api como `defaultValue`; o texto do agente (sem `codigo`) é exibido como veio, e a `orientacao` que vai ao dev nunca é traduzida. Quando só o dono resolve (`soVocePode.<codigo>`, hoje o saldo do provedor), o card diz o que só ele pode fazer, e o botão repete a tentativa. A ação `aumentar_o_teto` mantém o campo "Novo teto por tarefa" e "Gravar o teto" (AT-917): o clique grava o teto do projeto (`maintainer`) e só então retoma; se a gravação falha, não retoma. A Visão geral não grava o teto: a ação vira "Aumentar o teto (nas Configurações)", que leva à aba Configurações em um clique, seguida de "Tentar de novo" para retomar depois. O catálogo do engine (25 códigos, RN-1529) tem causa em `pendencias.bloqueadas.causas.<codigo>` e rótulo em `acoes.<id>` nas 4 línguas, com o pt-BR igual ao do engine (teste fixa a lista). A ociosidade do módulo no Executores diz a causa, nunca o relato cru. As linhas de Backlog, de PRs e a esteira do gate mostram a causa no lugar do relato cru, que fica no `title` e em "Ver detalhes técnicos". Sem o papel `developer` os botões ficam inertes e o motivo é dito em texto ([RN-102](https://github.com/viralabs-dev/brabo-api/blob/dev/docs/business-rules/api.md#rn-102)).
- **Onde:** `src/components/BloqueioRetomavel.tsx`, `src/lib/explicacao-do-bloqueio.ts`, `src/components/PendenciasDeOutrasSessoes.tsx` (`retomar`), `src/routes/AcoesDaExecucao.tsx`, `src/routes/ProjectBacklogTab.tsx`, `src/routes/ProjectPrsTab.tsx`, `src/components/PrGateTimeline.tsx`, `src/locales/*/sessionPage.json` (`pendencias.bloqueadas`).
- **Teste:** `src/components/PendenciasDeOutrasSessoes.test.tsx` (paradas L2, L3, L5, L7, L8 e L10 do TP-01 30ª), `src/routes/AcoesDaExecucao.test.tsx`, `src/routes/ProjectBacklogTab.test.tsx`, `src/routes/ProjectPrsTab.test.tsx`, `src/lib/explicacao-do-bloqueio.test.ts`, `src/lib/executores-ao-vivo.test.ts`.
- **Origem:** AT-1021 (EP-036, achado 33 do TP-01 30ª). Prévia aprovada em 26/11 (`13-design/retomada-em-um-clique`). Revisa o item 6 da [RN-626](parte-05.md#rn-626), a [RN-826](parte-06.md#rn-826) e a [RN-867](parte-06.md#rn-867).

<a id="rn-1532"></a>

### RN-1532 — A pergunta em aberto traz até duas opções prontas que respondem em um clique, e o detalhe técnico fica recolhido {#rn-1532}

- **Regra:** a pergunta com `opcoes` (até 2 `{rotulo, resposta}`) mostra um botão por opção, o primeiro em destaque; o clique responde UMA vez pela rota de responder da [RN-861](parte-06.md#rn-861) com `{ resposta: opcao.resposta }`, sem confirmação. "Aceitar sugestão" continua ao lado. O `detalhe` (técnico) fica em "Ver detalhes técnicos", recolhido, e o campo livre em "Responder com texto", recolhido mas disponível. Sem `opcoes` (dado antigo) o cartão é o de antes. Só o autor da sessão responde ([RN-861](parte-06.md#rn-861)); para os demais as opções ficam inertes. O texto da pergunta e dos rótulos é o do agente e não é traduzido.
- **Onde:** `src/components/PerguntasEmAberto.tsx` (`CartaoDaPergunta`), `src/locales/*/sessionPage.json` (`pendencias.perguntas.detalheTecnico`).
- **Teste:** `src/components/PerguntasEmAberto.test.tsx` (L1, L4, L6 e L9 do TP-01 30ª).
- **Origem:** AT-1021 (EP-036).

<a id="rn-1535"></a>

### RN-1535 — Resposta, pergunta e ator nunca mostram identificador interno {#rn-1535}

- **Regra:** o texto de `agent.response` no fio e o texto da pergunta em aberto passam por `semIdentificadorInterno`, que APAGA o UUID entre parênteses (com o espaço antes), o prefixo hex de 8 caracteres seguido de `-` entre parênteses, os pares `questionId=<uuid>` e `taskId=<uuid>` e o UUID solto, sem deixar espaço duplo; crase e bloco de código ficam intactos (ali o id pode ser o assunto). O UUID não vira link nem chip, e o id segue no log de eventos. "Decididas recentemente" nomeia o ator como o cartão de aprovação (RN-705 da api, RN-652/655): a pessoa pelo nome do membro, "Você" ou "Outro membro"; agente fora do roster com cara de UUID vira "um agente". `nomeDoAgente` nunca devolve UUID cru. Complementa a [RN-1225](parte-07.md#rn-1225).
- **Onde:** `src/lib/sem-identificador.ts` (`semIdentificadorInterno`, `pareceUuid`), `src/routes/session-timeline-montagem.tsx` (`MarkdownMessage`), `src/components/PerguntasEmAberto.tsx`, `src/components/NomeDoAtor.tsx` (`NomeDoMembroAtor`), `src/routes/DecididasRecentemente.tsx`, `src/lib/agents.ts` (`nomeDoAgente`), `src/locales/*/approvals.json` (`approvalsTab.decided.agenteSemNome`).
- **Teste:** `src/lib/sem-identificador.test.ts`, `src/routes/SessionPage.markdown-resposta.test.tsx`, `src/routes/DecididasRecentemente.test.tsx`, `src/components/PerguntasEmAberto.test.tsx`.
- **Origem:** AT-1026 (EP-036, achados 4, 16 e 27 do TP-01 30ª), fatia F3 (web).

<a id="rn-1536"></a>

### RN-1536 — O aviso de aceite automático diz o critério que valeu, e Enter envia a resposta curta {#rn-1536}

- **Regra:** o aviso do aceite sem clique usa a frase da FORMA do critério: com `criterio.regras` (PO ao Arquiteto, RN-660 da api) fica "o backlog cobre as N regras"; com `criterio.origem === 'oferta'`, a frase da regra de aceite que a pessoa ligou; nos demais casos (`criterio.passagem`), a da passagem ligada com repositório local. Nunca `?? 0`. Na pergunta em aberto ([RN-861](parte-06.md#rn-861)), Enter no campo de resposta envia UMA vez `{ resposta }`, com as mesmas travas do botão (autor da sessão, sem envio em curso), e não envia com o campo vazio nem durante composição de IME.
- **Onde:** `src/routes/session-timeline-montagem.tsx` (`handoff.accepted` automático), `src/locales/*/sessionPage.json` (`handoff.aceiteAutomaticoPassagem`, `handoff.aceiteAutomaticoOferta`), `src/components/PerguntasEmAberto.tsx` (`enviarComEnter`).
- **Teste:** `src/routes/SessionPage.handoff-aceite-automatico.test.tsx`, `src/components/PerguntasEmAberto.test.tsx`.
- **Origem:** AT-1026 (EP-036, achados 10 e 12 do TP-01 30ª), fatia F3 (web).

<a id="rn-1545"></a>

### RN-1545 — O cartão de aprovação que nasce do clique da pessoa numa linha de Containers é trazido à vista {#rn-1545}

- **Regra:** depois de "Parar", "Remover" ou "Subir" numa linha de Containers, o cartão de aprovação que substitui os botões ([RN-1481](#rn-1481)) é trazido à vista (`scrollIntoView({ block: 'nearest' })`), para o "Aprovar" não ficar abaixo da dobra; `nearest` não move a tela se o cartão já está visível. Só vale para o cartão nascido do clique da própria pessoa naquela linha e uma vez por ação: o que já vem pendente ao abrir a página (proposta de agente) não rola a tela. Proposta recusada pela api não deixa a marca armada. Nenhuma leitura nova.
- **Onde:** `src/components/AcoesDoContainer.tsx` (`veioDoClique`, `cartaoRef`).
- **Teste:** `src/routes/ContainersPage.test.tsx` ("RN-1545").
- **Origem:** AT-1035 (EP-034), achado 17 do TP-01 31ª, fatia F2 (web).
