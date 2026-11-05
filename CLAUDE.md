# brabo-web

Web do Brabo: React 19 + Vite + TanStack Query/Router, i18n pt-BR (fonte), en, ru e zh-Hans, design system em `design/`.

> Partido do `CLAUDE.md` do monorepo `daneiel/brabo` (hoje `brabo-legacy`, `dev` @ `1586158973`) na AT-708 (EP-033, ADR 0252). Copiado, não resumido: o que era de outro repo foi cortado e os caminhos do monorepo viraram a raiz deste repo (ou `brabo-<x>:caminho`). Caminhos sem prefixo que não existem aqui (`docker/`, `deploy/`, `install.sh`, `e2e/`, `scripts/dev/`, `scripts/ci/` fora do `brabo-ci`) moram no `brabo-infra`, no `brabo-qa` ou no `brabo-ci`. O resto das regras mora no `CLAUDE.md` da pasta-mãe (`brabo-workspace`, clonado em `~/dev/brabo/CLAUDE.md`) e no de cada repo irmão.

## Stack (decidida — não proponha alternativas)
- este repo: React 19 + Vite + TanStack Query/Router; `react-i18next`+
  `i18next` (fundação de i18n, RN-432) atrás de `lib/i18n.ts`/`lib/idioma.ts`
  — `pt-BR` é o padrão, o `fallbackLng` e a FONTE da paridade (ADR 0216,
  RN-891), com os quatro locales `pt-BR`, `en`, `ru` e `zh-Hans` (os catálogos
  de `ru`/`zh-Hans` chegam em rodada própria; sem pasta, a tela cai no pt-BR),
  servidor é a fonte de verdade
  (`localStorage` só evita flash no primeiro paint); `mermaid` (runtime,
  ADR 0068) para o diagrama C4 do Arquiteto, isolado atrás de
  `lib/mermaid-render.ts` com `import()` dinâmico; `@xterm/xterm` +
  `@xterm/addon-fit` (ADR 0103) para o terminal interativo do runner
  local, isolado atrás de `lib/xterm-runtime.ts` com `import()` dinâmico.
  `motion` (ADR 0210) para a animação de texto em curso, isolado atrás
  de `components/ui/Shimmer.tsx` (`LazyMotion` + `domAnimation`, nenhum
  outro arquivo o importa) e em grupo de vendor próprio `vendor-motion` em
  `codeSplitting.groups`, fora da carga inicial.
  shadcn/ui com Base UI (`base-nova`) + Tailwind 4 (ADR 0232): componentes em
  `components/shadcn/` (alias `@/`), `src/shadcn.css` DEPOIS do `index.css`, com
  o preflight ligado (ADR 0237: raios em `--radius` 0,625rem, títulos e `p`/`ul`/`ol` sem classe restaurados no `index.css`), `dark` sobre `[data-theme]`, cores mapeadas aos
  tokens do Brabo sem declarar variáveis cruas do shadcn; grupo `vendor-ui` em
  `codeSplitting.groups`.
  `@shadcn/react` (AT-653, decisão do dono de 31/10) só para o Questionnaire
  das perguntas estruturadas, no chunk da Sessão e FORA de
  `codeSplitting.groups` (zero dependências transitivas).
  `shiki` (Code Block, atrás de `lib/realce-shiki.ts`) e `recharts` (Chart dos
  Gastos, atrás de `GraficoDeGastoPorDia.tsx`) só por `import()`/lazy, fora do
  JS inicial e de `codeSplitting.groups` (ADR 0234, AT-657/658).
  Toda TELA é chunk próprio (`lazyRouteComponent` no `router.tsx`, com o
  `.preload` que o router espera), e os painéis das abas do projeto também
  (`React.lazy` em `project-tabs.ts`) — o `Shell` fica estático. Vendors de
  toda tela vão em `codeSplitting.groups` do `vite.config.ts` por lista de
  PERMITIDOS: um grupo genérico de `node_modules` puxaria `mermaid`/`xterm`
  para o bundle inicial (AT-300)
- Contratos: `@brabo/shared` e `areas.json` vêm do `brabo-contracts` por TAG; o tipo do OpenAPI sai de `pnpm openapi:types` (confira com `openapi:types:check`) a partir do `openapi.json` da api. A raiz do repo é o app.

## Repositório, branches e PR (vale para todo repo `brabo-*`)
- Branches permanentes: dev, main — um branch, um ambiente; a esteira é
  `dev → main`. A `qa` foi APOSENTADA por hora (ADR 0235, só no repositório do
  Brabo; arquivada em `refs/archive/qa`, segue em `PROTECTED_BRANCHES` do
  produto e em `NUNCA_ARQUIVAR`). `rc` saiu
  da política (ADR 0030) e o bootstrap parou de criá-la, mas continua em
  `PROTECTED_BRANCHES` DE PROPÓSITO: a lista decide o que a trava de merge
  RECUSA, e repositórios bootstrapados por versões anteriores ainda têm a
  branch. Proteger uma branch que não existe não custa nada; desproteger
  uma que existe custa caro. Não "limpe" essa lista.
  Trabalho nasce de dev com a taxonomia da política (breaking/,
  feature/, bugfix/, perf/, refactor/, chore/, docs/, test/);
  hotfix/ nasce de main. Os AGENTES seguem a mesma régua desde a RN-664: o
  worktree do dev agent nasce de `dev`, a PR dele e a de ADR miram `dev`, e o
  gate julga o diff contra `dev` — os três juntos, nunca um só (o gate
  julgaria um diff que não é o da PR); repositório sem `dev` falha nomeado,
  sem queda para a default. A PR de INFRA (`open_infra_pr`) segue a
  mesma régua desde a RN-729: `feature/infra-setup` nasce de `dev`, mira `dev`
  e leva o autor `infra[bot]`. Formato funcao/descritivo,
  regex ^.{0,30}/\S{0,32}$. EXCEÇÃO nomeada: `dependabot/…` é branch
  PERMITIDA sem critério de caracteres (sem limite de tamanho, qualquer número
  de barras), mas só quando o AUTOR é o próprio Dependabot
  (`ehBranchDoDependabot` em `scripts/ci/pr-police.ts`) — humano com esse
  prefixo reprova em `FUNCAO-DESCONHECIDA`, senão o prefixo vira a porta para
  escapar do formato. Commits em conventional commits, pt-BR.
  A FUNÇÃO da branch decide a VERSÃO (scripts/ci/version.ts): breaking/
  sobe MAJOR, feature/ sobe MINOR, todo o resto é PATCH. Mudança que
  exige ação do operador antes do deploy nasce em breaking/ mesmo quando
  o conteúdo é correção — o v2.5.1 saiu patch porque a chave obrigatória
  do OAuth nasceu em bugfix/, e um patch diz "atualize sem pensar".
  Versão não se corrige à mão depois: o valor de ela ser calculada vem de
  não ser negociada caso a caso.
- Toda mudança entra por PR — push direto em permanente é bloqueado;
  únicas exceções de push: tags (bot de release) e .release/gate.json
  (bot do gate).
- Toda branch cujo PR é mergeado é ARQUIVADA automaticamente, SEM carência, por checagem
  SEMANAL (segunda 09:00 de Brasília, AT-661) (`.github/workflows/archive-merged-branch.yml`,
  AT-557): sem PR aberta e sem commit depois do merge; branch sem PR mergeada
  não é tocada — move de
  `refs/heads/<nome>` para `refs/archive/<nome>`, nunca apaga: histórico
  intacto, recuperável com um `git push` de volta. Exceções: dev/qa/main
  (aparecem como `head` de todo PR de promoção), `gh-pages` (deploy do
  site, não é branch de feature) e branch de fork. A política mora em
  `scripts/ci/archive-branch.ts` (testado), ver
  scripts/ci/docs/explanation/branching-policy.md, seção "Merged branches get
  archived".
- PR do Dependabot entra pela `dev`, nunca direto na `main`; na `dev` ele não espera aprovação humana (ADR 0236) e a `main` segue com a escada inteira. Dependência de linguagem só por segurança (`open-pull-requests-limit: 0`), `github-actions` e `docker` semanais, `target-branch: dev`. O `dependabot-para-dev.yml` do `brabo-ci` fecha ou redireciona o PR de segurança que o GitHub abre contra a `main`.
- Merge em branch protegida (`dev`/`main`) é SEMPRE manual do usuário, sem opção de automatizar. A política de PR, escada, promoção e carimbo de tag vem dos workflows reutilizáveis do `brabo-ci`, fixados por SHA com `# vX` no `uses:`. Imagem de terceiro por digest com a tag inline. Segredo nunca é impresso; teste nunca roda contra o Postgres da instalação.

## Convenções (repositório, dados e domínio)
- O papel de PROJETO sobrepõe o de workspace nos DOIS sentidos —
  `ResolveEffectiveRoleUseCase.forProject` é `projectRole ?? workspaceRole`, e
  NÃO é "o maior dos dois" (RN-471). Restringir alguém num projeto sensível é
  capacidade deliberada; não "corrija" isso. O que a sobreposição não pode
  fazer são DOIS movimentos, e eles são teto (ADR 0127, RN-472): ninguém
  rebaixa quem é `owner` do WORKSPACE, e ninguém rebaixa a SI MESMO — 403 nos
  dois, sem chave de configuração. `owner` aqui é `workspace_members.role`,
  NUNCA `workspaces.created_by`: criador não é dono corrente, e o papel é o que
  a autorização usa em todo o resto do sistema. Os tetos moram no CASO DE USO
  com a regra pura em `domain/iam/tetos-de-rebaixamento.ts`, não no
  `RolesGuard` — o guard autoriza o CHAMADOR contra o `@RequireRole` da rota e
  não vê corpo nem alvo, e estes tetos são sobre o ALVO e sobre a relação
  ator↔alvo. O teto 2 vale por DUAS portas desde o ADR 0156 (RN-556): a
  REMOÇÃO da própria linha também é 403 quando o efeito líquido é rebaixamento
  — remover não apaga um papel, TROCA o efetivo pelo do workspace, que pode ser
  menor (ou não existir). `remocaoEhAutoRebaixamento` DELEGA a
  `ehAutoRebaixamento` passando o papel de workspace como o papel pedido — não
  escreva uma segunda régua. O teto 1 NÃO tem par na remoção, de propósito:
  `owner` é o topo do `ROLE_ORDER`, então tirar a linha de um `owner` de
  workspace só pode ELEVAR o efetivo dele, e é a única forma de desfazer a
  restrição que o teto 1 impede de criar. Desde o ADR 0157 (RN-557) o teto 2
  vale por QUATRO portas e nos DOIS SENTIDOS: `POST workspaces/:id/members`
  deixou de ser upsert sem teto (era passa-adiante sem ator, num escopo onde
  não há nível acima para segurar a queda — e, até o ADR 0173, nem rota que
  removesse membro), e a
  auto-PROMOÇÃO — que o ADR 0127 declarou como capacidade que ficava — é
  BRECHA e fecha, nas duas rotas de associação: é a única metade do movimento
  que ESCALA privilégio. A comparação virou UM classificador
  (`autoMovimentoDoProprioPapel`, devolve o SENTIDO porque a mensagem depende
  dele); `ehAutoRebaixamento` sobreviveu como LEITURA dele, de propósito — é
  por ela que `remocaoEhAutoRebaixamento` segue vendo só a metade de baixo, e
  alargá-la faria a REMOÇÃO recusar o movimento benigno que o ADR 0156
  protegeu. O teto 1 também NÃO tem par no workspace, e foi considerado, não
  espelhado: ele é regra sobre INVERSÃO DE HIERARQUIA, e o
  `@RequireRole('owner')` da rota já a impede — pô-lo faria de `owner` um
  estado absorvente, do qual ninguém sai por HTTP. E o teto NÃO conta owners:
  a cláusula já garante que um workspace nunca chega a zero, porque tirar o
  último exigiria que ele mesmo o fizesse. Desde o ADR 0173 (RN-615) há a
  QUINTA porta, `DELETE workspaces/:id/members/:userId` (`owner`, 204), e ela
  também não tem régua nova: é `remocaoEhAutoRebaixamento` com o papel de
  WORKSPACE como o efetivo de hoje e `null` como o de depois — no workspace
  não há nível acima, então remover a SI MESMO é sempre 403 (frase própria,
  `MENSAGEM_TETO_AUTO_REMOCAO_DO_WORKSPACE`). O ÚLTIMO owner fica protegido
  por essa MESMA cláusula, sem contagem: só `owner` chama a rota e ninguém se
  remove, então toda remoção deixa ao menos o chamador — o mínimo `owner` da
  rota é METADE da prova, e está asserido em teste; não o baixe. Remover OUTRO
  `owner` passa (é como se revoga propriedade), e o teto 1 segue sem par. A
  remoção CASCATEIA numa transação — as linhas de `project_members` do
  removido nos projetos do workspace (sem isso a sobreposição o manteria
  dentro), as chaves de dispositivo de PROJETO e os PATs dele ali — e depois
  derruba o runner vivo dele em cada projeto pelo caminho da RN-520, sem
  derrubar a remoção se o engine falhar. Fica de fora, declarado: chave de
  MÁQUINA, socket de sessão já conectado, terminal `:web`. O TITULAR
  (`workspaces.created_by`, de quem é a credencial que os agentes gastam,
  RN-058, e o relatório de gasto, RN-060) NÃO sai: 409 `criador_do_workspace`
  até `PUT workspaces/:id/owner-of-record` (`owner`, destino JÁ `owner`, senão
  409 `titular_precisa_ser_owner`) passar a titularidade (RN-616). Titular não
  é autorização — quem autoriza continua sendo o papel —, e a transferência
  não confere se o novo titular tem credencial: sem ela, o turno termina com o
  desfecho de sempre ("Nenhuma credencial cadastrada"). Não há tela de membros
  de workspace; as rotas são de API. A LEITURA (`GET workspaces/:id/members`,
  RN-655) é `viewer`, e não o `owner` das escritas: ler não é manter, e é por
  ela que o fio da sessão nomeia quem entra só pelo papel de workspace. Segue possível e declarado:
  rebaixar outro `maintainer`; um `owner` rebaixando OUTRO `owner` no
  workspace (única forma de revogar propriedade, reversível pela mesma rota);
  reescrever o próprio papel com o MESMO valor (upsert idempotente não é
  movimento); a auto-promoção pela REMOÇÃO da linha de projeto; e a
  auto-remoção quando o workspace segura o MESMO papel — essa é benigna e
  continua passando.

## Convenções (agentes, telas e testes)
- O idioma chega ao modelo por UM caminho (RN-622): a fachada
  `EngineApiClient` (`llm_turn/5`, `llm_turn_stream/6`) acrescenta, no FIM de
  toda chamada de LLM, uma mensagem `system` EFÊMERA montada por
  `Engine.Harness.IdiomaDaResposta` — nunca em `state.messages`, nunca em
  `agent_instructions`, nunca por servidor. Turno COM autor usa o idioma que a
  api resolveu para ele (`idiomaDaResposta` no `agent/message`, posto no
  dicionário só durante o `handle_call` e herdado pela Task do turno); turno
  SEM autor usa `projects.language`; o `context-manager` fica fora. Falha na
  resolução = turno SEM orientação, nunca queda e nunca o idioma do projeto no
  lugar do da pessoa. Teto de 50 tokens de entrada por chamada (AT-169).
  Desde a RN-623 (AT-245), num turno COM autor cuja chamada leva ferramenta
  que grava artefato compartilhado (`ferramentas_de_artefato/0`, lista por
  NOME — ferramenta nova de artefato entra nela no mesmo PR), e com o idioma
  do projeto DIFERENTE do do autor, a MESMA mensagem ganha a cláusula
  "artefatos no idioma do projeto"; só com os dois códigos na forma curta
  (`idioma[-Escrita][-Região]`), que é o que segura o teto. Não mova isso para
  a descrição de cada ferramenta. E descrição de ferramenta NUNCA nomeia idioma
  (RN-667): o "em pt-BR" do `label` de `ask_structured_questions` era uma
  segunda orientação, fixa, que punha o formulário em português para autor
  `en`; ela diz "no idioma da sua resposta", e um teste reprova as 22
  ferramentas do harness se alguma voltar a fixar um.
- As CINCO filas de decisão do projeto (aprovações, merges de PR, promoções
  de história, pendências de arquitetura, hipóteses do Psicólogo) nunca são
  SOMADAS — nem nos contadores do trilho (ADR 0126) nem no painel "precisa de
  você" que as reúne (RN-467), cujo chip anuncia PRESENÇA e não quantidade.
  Somar apaga qual fila está pedindo atenção. E o painel é ATALHO para a
  decisão, nunca substituto: ele renderiza o mesmo `ApprovalCard` e chama os
  mesmos endpoints, sem tocar em teto nenhum — em especial o de merge em
  branch protegida (`decide.ts`, `require_approval` incondicional). Tela que
  não tem a data de um registro DIZ de onde tirou a que mostra, ou não mostra
  data: a pendência de arquitetura não tem instante gravado e a linha declara
  que a data é da história relacionada.
  O chat da sessão é o TERCEIRO lugar onde isso vale (RN-626): mostra as
  pendências dos agentes em OUTRAS sessões do projeto com o mesmo `ApprovalCard`
  e os mesmos endpoints, cada fila com o próprio título e contagem, e o
  "Mergear" do card da PR aberta só PROPÕE o merge — quem confirma é o
  clique humano no card, e o teto da RN-418 não se move. O card fica inerte
  enquanto a decisão está em voo e diz a frase da api quando ela recusa (409
  incluído); reabrir a sessão retoma do log o turno em curso. A fila de
  mensagem que esta linha dava como decisão pendente FECHOU na RN-673 (ADR
  0191) — ver a convenção do clique que responde ao aceitar.
  Quem pergunta "o que espera decisão" — contador do trilho, painel, aba
  Aprovações, roster da Visão geral/Executores/Código — lê a fila do PROJETO
  (`useProjectPendingActions`, chave `['project-pending-actions', projectId]`),
  NUNCA a sessão mais recente (RN-638), e cada card decide pelo `sessionId` da
  PRÓPRIA ação; o aviso `proposed_action.*` de qualquer canal invalida essa
  chave. A leitura de ações por SESSÃO é a CAUDA (`latest`) mais as pendentes
  quando a cauda vem cheia (RN-637) — nunca a primeira página.
- Tela que mostra um RECORTE diz que é recorte (RN-180). Toda leitura tem
  teto — `limit: 200` nos eventos e nas ações —, e teto silencioso faz a
  tela afirmar sobre o que não leu. O número que falta sai de SUBTRAÇÃO
  sobre o `seq` (gapless, por sessão), nunca de uma requisição a mais:
  é o mesmo mecanismo do sino (RN-100). Quando houver como carregar o
  resto, o controle mora onde o corte aparece.
- Ação de UI que vira N chamadas não é transação, e a tela DIZ isso (RN-469).
  Salvar uma seção de Configurações é um PUT por linha suja — em série, na
  ordem da tela, sem abortar na primeira recusa. O desfecho é POR LINHA: só o
  rascunho que a api confirmou some, o que falhou fica no campo e a seção
  continua marcada por ele, e os três desfechos não se disfarçam um do outro —
  todas passaram, NENHUMA passou (a mensagem da API, nunca uma contagem),
  ALGUMAS passaram (quantas de quantas, nomeando as que ficaram). Botão de
  seção deve a contagem do que está pendente, senão "Salvar" diz o mesmo com
  uma linha suja e com cinco. E a régua de quando o botão existe é o CONTROLE,
  não a seção: campo DIGITADO precisa de confirmação, escolha de valor NOMEADO
  salva no `onChange` — não converta as seções de autosave. O que essa régua
  mede é de QUEM é o valor, e há UMA exceção, declarada (RN-476): o seletor que
  aplica um modelo a TODOS os agentes tem botão, porque o valor dele não é
  configuração de nada — é o ARGUMENTO de uma ação sobre 17 linhas que a pessoa
  não estava editando, e no `onChange` um clique exploratório num dropdown as
  reescreveria. Ela grava no nível do AGENTE de propósito: pelo projeto os 17
  herdariam, mas o endpoint de projeto pede `maintainer` onde o de agente pede
  `developer`, e o binding de projeto é também o default de SESSÃO, que a RN-040
  deixa livre. O preço — as 17 linhas divergem, com origem `agent` — é
  declarado, não escondido.
- Tela NUNCA repete o enum do banco como se fosse resposta, e não colapsa
  dois estados por eles compartilharem um valor (RN-470). `origin: 'agent'`
  da cascata de modelo quer dizer DUAS coisas — o agente tem binding próprio,
  ou a cascata pousou em `workspace` e `herdarModeloDeStart` trocou o valor
  pelo do Criativo. A api está certa em devolver `agent` nos dois (o valor
  veio mesmo de um agente): quem separa é a TELA, e ela separa mostrando a
  cascata inteira como cadeia — `workspace › projeto › área › agente`, com
  `vigente`/`definido`/`vazio`/`pulado` por nó, o nível que a cascata alcançou
  marcado como definido-e-não-vigente quando o Criativo entrou, e um nó extra
  nomeando o Criativo. A derivação é do CLIENTE, sem endpoint novo; o que ela
  NÃO consegue provar (agente com linha própria igual à do Criativo) fica
  declarado, e a ação que só importa nesse caso continua acionável. Vazio tem
  texto próprio e vazios diferentes têm textos diferentes — um traço que serve
  a três significados não é neutro, é a tela recusando nomear o que sabe.
- Controle que oferece escolha abre oferecendo o que a api ACEITA naquele
  escopo, e quem decide isso é o ESCOPO, nunca a tela (RN-040). O filtro
  "aptos para agentes" do `ModelPicker` vem MARCADO nas duas telas que gravam
  onde `assertModelFitsBindingScope` exige tool calling — `agent` e `area` — e
  DESMARCADO no seletor de sessão, que grava num escopo livre de propósito:
  marcar ali esconderia o que o domínio permite, que é o defeito inverso. É
  estado INICIAL de um checkbox, nunca trava — desmarcar volta a listar tudo —,
  e não elimina o 422: cobre UMA das três causas, e a tela continua devendo o
  desfecho de recusa. Filtro ligado por padrão cria uma dívida própria: o
  vigente que ele esconde da LISTA (herdado de `project`/`workspace`, níveis que
  nunca exigiram tool calling) precisa ser DITO, com o nome do modelo e a causa
  — o gatilho mostrando um nome que a lista não contém é a tela se contradizendo.
- E o controle só é oferecido a QUEM a api deixa usar — a régua acima decide o
  QUE se oferece, esta decide a QUEM. O mínimo é do ENDPOINT, nunca da seção
  (RN-102): modelo por AGENTE pede `developer`, modelo por ÁREA pede
  `maintainer`, e as duas seções são vizinhas na mesma tela. Copiar o gate da
  vizinha por parecerem iguais produz o defeito INVERSO do que corrige, e o
  inverso é PIOR — oferecer o que será recusado ao menos termina num toast,
  enquanto trancar quem podia é invisível para quem perdeu a capacidade. A
  comparação sai de `roleAtLeast` (`src/lib/roles.ts`, sobre
  `ROLE_ORDER`; mesmo nome da função do backend porque é a mesma regra dos dois
  lados), nunca de `role === 'x' || role === 'y'` à mão: a lista à mão acerta por
  acidente enquanto o mínimo é alto e erra calada quando é baixo. Papel AUSENTE
  não alcança nada. O que se tira é o CONTROLE, nunca a INFORMAÇÃO (ADR 0064):
  quem não pode editar continua vendo o valor vigente e a cadeia inteira, o
  controle fica inerte no lugar, e o motivo é dito UMA vez em TEXTO na seção —
  `title` em elemento `disabled` não abre no Chromium, então explicar por tooltip
  é não explicar. Nada disso é fronteira de segurança (quem recusa é o
  `RolesGuard`). O papel a LER é o EFETIVO do projeto — `projectRole ??
  workspaceRole`, uma SOBREPOSIÇÃO nos dois sentidos, e nunca "o maior dos dois"
  que três descrições de OpenAPI ainda prometem (RN-471). Onde a tela já busca
  `project_members` ele é DERIVÁVEL e a lacuna se FECHA (a seção de Membros, que
  compõe da lista que já carrega); onde não busca, lê-se o do WORKSPACE e a
  lacuna se DECLARA (as duas seções de modelo). É UMA lacuna vista de dois
  lados, não uma por seção — não a declare de novo onde os dados estão à mão,
  nem invente uma segunda fonte de papel onde não estão.
- Sinal de ambiente diz o que SABE, e proxy nunca vira garantia (RN-468).
  A tela de login é PRÉ-identidade: só cabem ali os dois `/health`, que já
  são públicos nos dois serviços — presença de runner
  (`{user_id, project_id}`) e modelos locais (`projects/:projectId/models`)
  não têm sujeito antes do login, e a tela DECLARA essa ausência em vez de
  omiti-la. Sonda tem TETO, e os três estados (`verificando`/`respondendo`/
  `sem resposta`) nunca colapsam — RN-088 vale aqui também. O formulário
  NUNCA espera pela sonda. Pós-login, `workspaceVerifiedAt` é registro de
  uma confirmação, não batimento: reconectar com o mesmo caminho nem
  regrava o carimbo, então a tela diz "pasta confirmada em <data>" com a
  ressalva, e nunca "de pé" nem bolinha verde. Quem sabe do AGORA é o
  socket do terminal, na aba Código.
- Evento tem DUAS classificações no cliente, e elas não se substituem:
  `ActivityKind` (assunto — decide ícone e cor) e `OrigemDeEvento`
  (camada — `eventos|sistema|llm|harness|agente|usuario`, RN-177). A
  origem tem UMA fonte, `src/lib/activity.ts`, e é o eixo dos
  grupos do painel de log — o FIO não agrupa por origem desde a RN-644 (lá o
  histórico recolhido é UM bloco cronológico e o corte conta MENSAGENS,
  recuando até a abertura do turno); a precedência dos `if` é a regra (mecanismo
  vence ator, ator vence prefixo de agente) e tipo desconhecido cai em
  `eventos` — nunca some nem abre categoria nova.
- Testes: vitest (api/web/scripts de CI), ExUnit (engine). Nenhuma
  feature sem teste do caminho feliz + 1 caso de falha. Providers de
  git e de LLM validados por suas suites de contrato únicas. A quarta
  camada é o E2E de navegador em `e2e/` (ADR 0120) e ela responde uma
  pergunta que as outras três NÃO respondem — "um navegador de verdade,
  em outra origem, entra e fica dentro?". Ela não substitui nenhuma:
  comportamento continua sendo coberto embaixo, e teste que caberia na
  suite do web não sobe para cá.
- UI: fidelidade estrita ao design system em design/ (tokens, tipografia
  Space Grotesk/Archivo/IBM Plex Mono, dark mode primário). Contraste é
  medido por teste sobre os tokens e layout é verificado no navegador
  por scripts/dev/validacao-visual.js — as duas validações estão
  explicadas em design/README.md.
- Os DOIS temas são alcançáveis e os DOIS são medidos (ADR 0074,
  RN-182/184). `data-theme` é escrito por `public/theme-boot.js`,
  ARQUIVO e não script inline — a imagem serve sob `script-src 'self'`, e
  inline passa em dev e é bloqueado em produção. A preferência mora em
  `localStorage['brabo.theme']` e a API é `src/lib/tema.ts`;
  nenhum componente escreve o atributo por conta própria. Desde o ADR 0181
  (RN-640) a paleta é NEUTRA (escuro preto, claro branco, acento terracota) e
  NÃO há dívida de contraste: os cinco pares que o escuro devia desde a FASE 16
  são PISO nos dois temas. Não afrouxe um piso para passar, não reabra dívida
  "registrada", e não deixe o claro nascer pior que o primário. Cor que sai do
  CSS (Mermaid, xterm, minimapa) cai em `lib/tokens-padrao.ts`, conferido
  contra o `:root` por teste — não escreva fallback em hex no chamador; cor de
  agente é `var(--token)`; e `var(--x)` sem declaração reprova
  (`design-tokens-existentes.test.ts`).
- O handoff estabelece a INTENÇÃO; a medição estabelece o NÚMERO, e o
  produto estabelece o MECANISMO. Já valeu três vezes: as fontes (ADR
  0036), o boot de tema inline e cinco dos oito `--syn-*` que reprovam
  4,5:1 contra o próprio `--code-bg` do handoff (ADR 0074). Nome do
  handoff que já existe com outro nome entra como ALIAS, nunca
  renomeação — `--font-display`, `--shadow-modal` e `--r-md`/`--r-lg`/
  `--r-pill`; e `--r-sm` (7px) NÃO é sinônimo de `--radius-sm` (4px).
- Tipo novo de `proposed_action` nasce com FRASE em pt-BR em
  `src/lib/aprovacoes.ts` — verbo e frase têm UMA fonte, e as
  três telas de decisão (Aprovações, chat da sessão, Insights) a
  consomem. `src/lib/aprovacoes.test.ts` lê `ACTION_TYPES` do
  `decide.ts` e reprova tipo sem frase; payload cru nunca é despejado,
  nasce colapsado (RN-096). Valor de CÓDIGO na frase (comando, branch,
  caminho, imagem) entra por `codigo()`, nunca entre aspas: o card o desenha
  em mono por `trechosDaFraseDaAcao` (AT-322). O `ApprovalCard` tem UMA
  variante nas quatro superfícies — não reintroduza prop de aparência por
  tela; a largura é do contêiner e só o colapso inicial varia
  (`detalheRecolhido`).
- O clique que dispara turno de agente conversacional responde ao ACEITAR,
  nunca no fim do turno (ADR 0163, RN-578): `TurnoAssincrono.iniciar/3`
  devolve `{:reply, :ok, _}` assim que a Task sobe — DEPOIS de persistir
  `agent.status: working`, e essa ordem é contrato (é ela que deixa a tela,
  lendo a cauda do log depois do aceite, saber que o `agent.status` mais
  recente é do turno novo). O desfecho vai pelo canal e pelo `agent.error`
  durável, NUNCA pelo HTTP (nos SETE conversacionais — o Infra Lead desde a
  RN-617, que tirou o turno dele de dentro do `handle_call`); a recusa ANTES de o turno subir é síncrona e
  NOMEADA (409 `turno_em_andamento`/`aguardando_aprovacao`, 422
  `sem_regra_de_negocio`) e o controller do engine não descarta mais o
  retorno — era esse descarte que fazia mensagem recusada virar 202 calado.
  Na tela, "a chamada resolveu" deixou de significar "o turno acabou": depois
  do aceite chama-se `acompanharTurnoPeloLog`, nunca `finalizarTurnoDoAgente`.
  Não volte a segurar o request pelo turno.
  Desde a RN-673 (ADR 0191) a MENSAGEM do usuário não recebe mais
  `turno_em_andamento`: com turno em curso ela entra na FILA do agente
  (`TurnoAssincrono.receber_mensagem/4`, 202 com `entrega: "enfileirada"`), e
  no fim do turno as pendentes viram UM turno, na ordem. O estado mora no LOG
  (`chat.message_queued`/`_delivered`/`_cancelled`, todos com o id do
  `chat.message`), nunca em tabela — o `init/1` reconstrói a fila e o boot
  acorda quem tem pendente. Teto de 10 por agente e sessão (409
  `fila_de_mensagens_cheia`); quem ENVIOU cancela enquanto pende. A fila é
  UMA, em `TurnoAssincrono` — servidor novo só fornece `turno_de_mensagem/2`,
  nunca fila própria. `turno_em_andamento` segue para o que não é fala
  (revisão, prontidão, oferta de handoff), e o Dev Lead suspenso segue
  recusando com `aguardando_aprovacao`.
  O turno que o REINÍCIO do engine matou no meio (o `working` fica gravado, o
  processo e a Task somem) fecha por evento NOVO — `agent.error` origem `infra`
  + `agent.status: idle` — no boot (`Rehydrator`) e no `init/1` dos sete
  (`Engine.Agents.TurnoOrfao`, RN-586; o Infra Lead desde a RN-617), e só
  fecha o que não tem processo vivo em nenhum nó. Desde o ADR 0226 (RN-920) o
  turno RECENTE (≤ 900 s da última atividade) é retomado UMA vez no boot, com
  a mensagem `system` efêmera do `Diario`/`RetomadaDoTurno` e o `agent.plan`
  que o modelo escreveu (`registrar_plano`), nunca com mensagem falsa do
  usuário; o velho ou já retomado só fecha, e o botão "Retomar" (RN-921) é sem
  teto. Dev e gate seguem o mesmo teto 1× (RN-922/923); merge nunca. Sem
  isso a faixa da tela e o sinal de trabalho pendente da RN-064 ficavam presos
  para sempre.
- O turno de um agente conversacional pode SUSPENDER esperando aprovação
  humana (ADR 0086, RN-284) — hoje só o Dev Lead, no `propose_execution_plan`.
  Desde o ADR 0163 o `from` já foi respondido no aceite (como em todo turno);
  o que a suspensão muda é o FECHO: `agent.status: awaiting_approval` em vez
  de `agent.done` quando o `state` devolvido carrega `:aguardando_aprovacao`
  com valor não-nulo. Enquanto suspenso, `user_message` não inicia turno novo
  — vira `agent.error` explicando a pendência, e 409 no clique. Sem tabela de estado própria: restart do engine
  durante a espera perde a inscrição no `Engine.Dev.Wake`, lacuna aceita e
  declarada (a decisão continua registrada em Aprovações).

## Documentação é parte da definição de pronto (permanente)
- A doc deste repo mora em `docs/` (fonte pt-BR; `en`, `ru` e `zh-Hans` em `docs/i18n/`). Ao alterar código, atualize a doc da área NA MESMA mudança e mostre o diff dela junto com o do código. Não pergunte se deve: faça. NUNCA crie `website/docs/`: o site é agregado pelo `brabo`, que lê a `docs/` de cada repositório.
- Mudança de comportamento observável → entrada em `CHANGELOG.md` (Unreleased). Versão própria a partir da 1.0.0, e toda tag nasce de workflow (nunca versionar à mão).
- Regra de negócio nova → RN-XXX com `caminho:N` (`símbolo`) e o teste que a cobre, na `docs/business-rules*` deste repo; a numeração é UMA só no produto (nunca reinicie), a âncora `{#rn-NNN}` é o contrato e não muda quando a RN muda de arquivo. Aloque o número varrendo as branches locais e o remoto (colide com frente paralela).
- Mudança estrutural (fronteira de camada, banco, modelo de consistência, dependência pesada) → ADR novo com o próximo número; ADR aceito NUNCA é editado (o novo o referencia). Os ADRs moram no repo `brabo` (a porta de entrada do produto).
- Nunca inventar conteúdo de doc: sem informação suficiente, use `> **TODO(humano):** <pergunta específica>.`. Diagramas em Mermaid no próprio Markdown, nunca imagem.
- Este arquivo também é doc: toda mudança verifica se ele precisa mudar (Stack, convenções, "O que NÃO fazer"). Ele é lido em toda sessão e não passa de 40 mil caracteres (`wc -m`, nunca `wc -c`); o que só vale para uma área sai daqui para `.claude/rules/` com `paths:`.

## Estado, decisões abertas e lacunas que são DESTE repo
- Desde o ADR 0211 a aba de Código abre com 304px de moldura (sidebar 256
  + trilho do `CodeShell` 48; ADR 0241), ou 96px com a sidebar recolhida (48 + 48) —
  soma das larguras, não medida no navegador. O trilho do projeto (ADR 0126)
  saiu e a sidebar (`AbasDoProjeto`) é a ÚNICA navegação do projeto, com os
  grupos, a aba ativa, o teclado e os cinco contadores (nunca somados); com
  a sidebar recolhida, as abas do projeto aberto ficam num flyout do quadrado
  do projeto. Os cinco números só aparecem com a moldura do projeto montada:
  na tela de Sessão fica só o de Aprovações do resumo, porque ligar o hook ali
  estoura o orçamento de duas abas (RN-632) — não "complete" isso com query
  nova
- A presença de QA/SecOps, dos membros de área e dos dev agents
  (`gatesEverOpened`, `delegatedSubagents`, `executionActivated`) deixou de
  sofrer da janela de 200 eventos (RN-568): as duas telas passam o agregado do
  resumo como `agregado`, que SOMA à janela e só vale com o resumo da MESMA
  sessão. Desde o AT-130 o `executionActivated` da aba Executores passa pela
  mesma guarda (antes um resumo de sessão mais nova apagava os dev agents), e
  `deriveAgentRoster` também o lê da janela — a lacuna fechou
- Conversão de `execution_mode` nunca migra diff NÃO commitado — órfão no
  disco antigo (RN-447..450, ADR 0111). O órfão CONTINUA; o que mudou na
  RN-560 é que a tela parou de dizer o contrário: o aviso afirmava *"isto
  migra a pasta de trabalho do agente"* nos dois idiomas, e agora diz os três
  fatos separados (o que a conversão RECUSA, o que ela LEVA — a política do
  `permissions.json` —, e o que ela NÃO leva), NOMEANDO o caminho antigo, que
  some da tela assim que a conversão salva. Ele não promete detecção de diff
  (I/O por modo, impossível para `runner` do lado da api). Desde a AT-144 ele
  diz também as consequências CONDICIONAIS, e só quando valem para ESTE
  projeto: o espelho zerado (`mirrorPath` preenchido), o container removido (o
  projeto é `container` HOJE e o ciclo de vida existe fora de `removed` — a
  MESMA condição de `removerContainerSeExistir`, que só roda ao SAIR de
  `container`; em `mounted`/`runner` o caso de uso não toca o container e o
  aviso não diz o contrário) e a pasta confirmada que deixa de valer
  (`workspaceVerifiedAt` preenchido). Nada de listar o que não se aplica, e a
  leitura do ciclo de vida que falha vira texto próprio, nunca "não há
  container". Migrar conteúdo entre modos continua fora, sem dono
- `ExecutionModeSection` fechou os DOIS ramos: `mounted` abre o MESMO
  `FolderBrowserModal` da criação (RN-559, `origem: { tipo: 'api', workspaceId
  }`), e `runner` é converte, DEPOIS onboarda (RN-612, AT-143): salvar a
  conversão monta, na mesma seção, o `RunnerOnboardingPanel` do projeto agora
  `runner`. A ordem inversa segue impossível (onboardar antes registra chave
  num projeto que ainda não é `runner`, e `ConfirmProjectWorkspaceUseCase`
  recusa com 400) — não a reabra mexendo nessa recusa. A medição que decidiu
  foi de CÓDIGO: o agente de máquina que ESPERA (zero projetos, RN-550) pega o
  projeto sozinho em até 60 s; o que já atende OUTRO projeto só depois de
  reiniciar o serviço, porque a lista é lida uma vez com conexão viva — a tela
  DIZ os dois casos, com o comando, sem afirmar qual é o da pessoa. O caminho
  digitado é PROVISÓRIO (a confirmação do runner o sobrescreve, RN-423, e o
  agente de máquina usa `<base>/<workspaceDirName>`), e o navegador de pastas
  segue FORA do ramo `runner` por construção, não por ordem: o transporte
  `{ tipo: 'runner', projectId }` exige runner conectado, e um runner conectado
  já confirmou a própria pasta — escolher outra seria uma conversão que a
  próxima reconexão desfaz
- i18n Onda 6b NÃO fechou, e a direção mudou: o ADR 0216 (EP-032, decisões
  do dono de 15/10) fez do pt-BR a FONTE e o padrão do site e da interface, com
  `en`, `ru` e `zh-Hans` como traduções em fases e paridade medida. NÃO revise
  Stack/Documentação para "inglês como idioma primário": essa instrução
  caducou. A fatia residual de `.tsx` fechou na AT-289 (varredura por AST de
  texto JSX e literais de prosa: o que sobra é marca, comando, caminho e nome
  de papel/enum, de propósito), e `src/lib/i18n-paridade.test.ts`
  reprova chave que exista num idioma e falte no outro. Fora do `.tsx` ainda há
  texto só em pt-BR em `.ts` de `lib/` (o `classifyEvent` de `activity.ts`,
  por exemplo). Desde a AT-326, `i18n-vocabulario.test.ts` reprova número de
  RN/ADR em frase de tela, jargão em inglês no pt-BR ("handoff", "gate",
  "binding", "LLM", "dev agent", "lead" e "runner" ficam: são do glossário) e
  plural por "(s)" — em TODOS os namespaces e nos dois idiomas desde a
  AT-331, que acrescentou `_zero` obrigatório ao lado de todo `_one` no pt-BR
  (o CLDR do `pt` põe o 0 em `one`) e frase com `{{count}}` sem plural,
  salvo invariante declarada no próprio teste

## O que NÃO fazer
- Não instalar libs sem justificar no plano. Não refatorar código de fase concluída sem pedido explícito. Cor, fonte e espaçamento vêm dos tokens de `design/`; nada de hex solto.

## Onde está o que não coube aqui
O teto de 40 mil caracteres deixou de fora, por serem de outro repo ou de pouco uso aqui: regras de agente, persistência, segredos e LLMProvider (api e engine). O texto integral está em `brabo-legacy` (`.claude/contexto/*.md`, `dev` @ `1586158973`) e no `CLAUDE.md` da pasta-mãe (`brabo-workspace`).
