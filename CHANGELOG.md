# Changelog

## Unreleased

- PR pronta para o dono mergear avisa: um aviso fixo na borda do fio (`AvisoDePrPronta`) com Mergear e o tempo de espera, o contador no título da aba ("(1) Brabo") e a aba "PRs prontas" do painel aberta sozinha quando uma PR entra na fila. "Agora não" dispensa; só uma PR nova o traz de volta. O hook `usePrsProntas` divide as leituras com o painel (AT-810, RN-1063).
- O cartão do plano do Dev Lead mostra o teto do projeto e das áreas dev/qa junto do custo esperado (`TetoDoPlano`), avisa quando a estimativa passa do que resta do menor teto (sem travar o Aprovar) e ajusta o teto da área dev ali, com o link "Outros tetos" para Configurações (AT-808, RN-1062).
- A execução parada atrás de uma tarefa bloqueada ou de um agente travado avisa: o `execution.stalled` do engine (RN-1059) aparece em vermelho no feed, vira uma mensagem na sessão de execução e um aviso na aba Executores, com Rearmar por agente travado e Desbloquear por tarefa bloqueada (`DestravarExecucao`) enquanto a parada vale (AT-800, RN-1061).
- Corrigido: a instalação aberta por `127.0.0.1:8088` não parece mais fora do ar. A web vai para o loopback da `apiUrl` (`localhost`) antes de restaurar a sessão e montar a tela, porque o CORS e o cookie `SameSite=Strict` só valem no host da api; fora do loopback nada muda (AT-801, RN-1060).
- Corrigido: o chat não repete o mesmo turno. Cada entrada do fio ganha a chave própria `TimelineEntry.chave` (um evento gera várias entradas com o mesmo `seq`, e a `key` por `seq` deixava nós órfãos a cada poll, até a aba travar); o `seq` fica só como eixo de ordem (AT-803, RN-974).
- Disjuntor: o agente travado (`dev.idle_tripped`) segue `travado` mesmo com o `backlog.task_blocked` que vem logo depois, até o `dev.rearmed`; o card mostra Rearmar e as pendências do chat ganham a fila "Agentes travados" com Rearmar (AT-799, RN-826).
- `@brabo/shared` passa a vir do GitHub Packages (AT-770, ADR 0270): alias `npm:@viralabs-dev/brabo-shared@1.2.0` no lugar da dependência git por tag, `.npmrc` com o registry do escopo (sem token), `pnpm-workspace.yaml` com `minimumReleaseAgeExclude` para a 1.2.0 recém-publicada, `scripts/baixar-areas.mjs` na tag `v1.2.0`. O lock muda só nas entradas do `@brabo/shared`.
- Docker e CI: o `pnpm install` do `Dockerfile` usa o secret `npmrc` do BuildKit (RN-1039); o `ci.yml` e o `release.yml` passam `secret-files` com o `GITHUB_TOKEN`, e o `ci.yml` ganha `packages: read` e `setup-node` com o escopo. Spec `test/token-do-registry.test.ts`.
- CI: `contracts-alinhado.yml` chama o reutilizável do `brabo-ci` (pin `4976af2`, RN-1038). Não é check obrigatório.
- Segurança: o `js-yaml` sai da faixa vulnerável (4.3.1) para a 4.3.2 por `pnpm.overrides` (`js-yaml@>=4.0.0 <4.3.2`), só no caminho dev `openapi-typescript` > `@redocly/openapi-core` (que fixa a 4.3.1). Fecha o alerta do Dependabot e o erro do `Dependabot Updates` (AT-795).
- CI: o regressivo do brabo-qa roda em toda PR para a `dev` (AT-769): o job `imagem-hotfix` do `ci.yml` publica a `sha-<12>` assinada também com `base_ref == 'dev'` (mesma guarda de fork, sem Dependabot); o `limpeza-ghcr.yml` apaga toda `sha-*` de PR fechada e as de mais de 7 dias (eram 14); o `qa-e2e.yml` passa a `branches: [dev, main]` (PR para a `dev` = `Regressivo do brabo-qa`, nunca exigido; PR para a `main` segue com o `E2E do brabo-qa`). CLAUDE.md e `.claude/agents/analista.md` ganham a regra do card.
- CI: o run do `release.yml` ganha `run-name` com a origem e o passo `Vínculos` (helper do `brabo-ci`, origem pela linha `Carimbo:` da tag; AT-773, RN-1044).


- CI: repina o `brabo-ci` em `2d9ec1b` (merge da ci#28: o `HEAD` do `brabo-ci` deixa de sombrear o `dev` em `qa-e2e-disparar.ts`, então o portão da `main` volta a rodar) em todos os pins, `uses:` e `ci_ref:` (AT-789).
- CI: repina os reutilizáveis do `brabo-ci` em `384b5d1` (merge da ci#22: o job `disparar` do `qa-e2e-gatilho.yml` agora instala as dependências) em todos os pins, `uses:`, `ci_ref:` e checkout do `brabo-ci` (AT-785).

- Check `refs` no PR (AT-782): o `refs.yml` chama o `refs-com-simbolo` do `brabo-ci` (pin `64a1e15`) e reprova a ref `caminho:N` (`símbolo`) de RN que o PR quebra; o artefato `refs-patch` traz a reancoragem. Não é check obrigatório.

- `fixados/ORIGEM.md` deixa de citar só o monorepo e um SHA único: cada arquivo diz a origem de hoje (`brabo-api`, `brabo`) e o ponto conferido; `openapi.json` e `sempre-permitir.ts` batem com a `dev` da api em `7d94c3b7` (AT-783).

- Imagem a cada carimbo `-dev` e no hotfix, com limpeza do GHCR (AT-765): o `release.yml` reage também a `vX.Y.Z-dev.N` (publica, escaneia, assina; o `imagem.json` vai como artefato do run, sem Release); o `ci.yml` ganha o job `imagem-hotfix` (`:sha-<12>` em PR `hotfix/*` para a `main`, com Trivy e cosign); o `limpeza-ghcr.yml` apaga o `sha-` da PR fechada e guarda as 10 `-dev.*` mais novas, sem tocar em `vX.Y.Z`.

- A RN-473 (passo 4, binário) deixa de citar `npm install -g @brabo/runner`: o runner sai só como binário da Release do `brabo-runner` (AT-774). Nenhuma tela exibia o npm; só a doc muda.

- CI: repina os reutilizáveis do `brabo-ci` em `13f3697` (merge da ci#17, que inclui a ci#16): `ubuntu-26.04`, `client-id` no lugar de `app-id`, rótulo de família criado antes de aplicar, linha `Carimbo:` na tag e helper `vinculos` (AT-772, AT-773).
- Conhecimento: o toast do "Reindexar agora" avisa quantos arquivos foram cortados no teto de 4 MiB ou pulados por serem binários (`cutFiles`), e o painel de cobertura mostra `filesCut` nos cartões docs e ADR, nos quatro locales (AT-764, RN-1036). `openapi.json` e os tipos gerados atualizados a partir do brabo-api (api#51).

- O lint sai com 0 avisos (AT-772): as constantes e funções exportadas por componentes (40 avisos `react-refresh/only-export-components`) foram para arquivos `*.helpers.ts` irmãos, `buttonVariants` para `shadcn/button-variants.ts`, sem mudar comportamento; `session-readiness` deixa de ter `useMemo` com dependência errada (`activeFor`/`events`), com teste novo; `public/theme-boot.js` usa `catch {}`; e `runs-on` dos workflows passa a `ubuntu-26.04`.

- Ko-fi do mantenedor: `.github/FUNDING.yml` (botão Sponsor) e seção Apoie no README (AT-768).

- Docs: a documentação do repositório volta a ser em pt-BR por padrão (decisão do dono de 06/11/2026, revertendo o ADR 0260; AT-766). `docs/business-rules/web.md` e `docs/explanation/tanstack-ai.md` saem do inglês e perdem o `idioma_original: en` (âncoras `{#rn-NNN}`, refs de código e links intactos); `README.md`, `design/*.md`, `.design-sync/NOTES.md`, `.design-sync/conventions.md` e os 66 docs de componente em `.design-sync/docs/` voltam ao pt-BR, com o frontmatter (`category:`, `keywords:`) que o design-sync lê; o README ganha a seção "Repositórios do Brabo"; e o `CLAUDE.md` troca a regra de doc em inglês por pt-BR.

- Aprovações da sessão: um `container_recreate` proposto depois do merge da PR de infra que declara o app (`reason: 'app_declared'`) diz que o app foi declarado, que recriar o container o sobe, e mostra `http://127.0.0.1:<host>` com a porta que aprovar publica (13000+). Os outros recreates mantêm o texto. A frase está nos quatro locales (`actions.containerRecreate.appDeclared`, AT-758, RN-709).

- Sessão: o feed e a árvore da linha do tempo mostram `artifact.business_rule_retired` ("criativo retirou uma regra de negócio — substituída por outra regra: motivo"); o painel de regras e o botão de prontidão ignoram regra retirada (AT-755, RN-1018). `openapi.json` e os tipos gerados atualizados a partir do brabo-api.

- Sessão: a decisão principal de cada cartão do fio mostra texto ao lado do ícone, como exceção à regra de só ícone da AT-682 (AT-753 UX-3). O aceite do handoff diz "Aceitar e passar a {agente}" e "Ativar execução" mostra o rótulo. A chave `handoff.aceitarEIniciar` foi trocada por `handoff.aceitarEPassar`; a exceção está registrada em `design/COMPONENTS.md`. (web#16)

- Aprovações da sessão: o cartão do plano de execução agora mostra só o que será feito, o custo previsto, "Aprovar plano" e "Negar"; o jargão (payload cru, permissions.json, a lista do piloto automático) foi para um "Detalhes" recolhido. A oferta do modo automático é um checkbox já marcado no cartão e, ao aprovar, grava a curinga de cada agente do plano (revoga a separação da AT-443 para este cartão; RN-755 e RN-804 atualizadas). Uma ação de git que falha agora mostra a causa e o próximo passo ("Conflito em README.md — o agente refaz a PR sozinho"), e o tipo `executionResult` ganhou o formato da falha de git (AT-753, UX-4 e UX-8). (web#17)

- Executores: com execução ativa e nenhum agente trabalhando, um aviso explica por quê (os agentes esperam a task de que dependem e acordam quando a dependência é mergeada); o badge de status da sessão agora é traduzido (AT-753, P5, sem botão de acordar). A oferta do modo automático do time no chat tem uma variante compacta (lista de pilotos sob "Detalhes", cartão limitado a 40vh com rolagem interna). O componente sem uso `ModoAutomaticoDoPlano` sai; `agentesDoPlano` fica. (web#18)

- O merge da sessão é confirmado na própria linha da PR ("Mergear #N em dev? Confirmar / Cancelar"): Confirmar propõe e aprova num gesto só, o resultado ("Mergeada" ou a causa da falha) aparece na linha, e a aprovação continua registrada. A referência no fio ganhou um botão "Ver o cartão". Um item que sai da fila mostra um aviso dispensável. Uma task bloqueada mostra o título antes do " — " com o diagnóstico recolhido. A coluna do chat ganhou `min-height:0` (AT-753, UX-2, UX-7 e UX-9). (web#19)

- Chat "PRs prontas para merge": depois que o "Mergear" propõe o merge, aparece um toast de sucesso e o cartão de aprovação é rolado até ficar visível (AT-740). O fluxo em si foi reproduzido e funciona; o defeito era o retorno, já que o cartão aparecia dentro de uma lista com altura limitada.
- `politica.yml`: pins do `brabo-ci` sobem para `b030fbf` (dispensa da PR do bot, ADR 0255; AT-733).
- Release por tag da imagem `ghcr.io/viralabs-dev/brabo-web` (AT-704): `carimbo.yml` (tag-release do brabo-ci) e `release.yml` (build, push por digest, Trivy sobre o digest, cosign keyless por digest com verify, `imagem.json` na Release). A 1ª tag final na `main` sai `v1.0.0`.

## v1.0.0 - 2026-11-05

Primeira versão, extraída do monorepo `daneiel/brabo` (EP-033, AT-698, ADR 0252) em `1586158973`, com o histórico dos caminhos (`apps/web/` na raiz, `design/`, `.design-sync/`, `docker/web/`); `#NNN` nas mensagens virou `viralabs-dev/brabo-legacy#NNN`.

- `Dockerfile` (produção, nginx) e `Dockerfile.dev` vieram de `docker/web/Dockerfile.prod` e `Dockerfile`; `nginx.conf` e `entrypoint.sh` em `docker/`.
- `@brabo/shared` passa a vir de `brabo-contracts#v1.0.0` (`&path:/packages/shared`).
- `areas.json`: `agent-areas.generated.ts` segue commitado, e `agent-areas.contrato.test.ts` o confere com o `areas.json` da tag `v1.0.0` do brabo-contracts (`pnpm areas:baixar`; obrigatório no CI, pula localmente se não baixado).
- Spec OpenAPI: `openapi:types` e `:check` leem `fixados/openapi.json`, cópia do monorepo em `1586158973` (SHA registrado só em `fixados/ORIGEM.md`) até o brabo-api publicar tag.
- Aferição cruzada: os testes que liam a api e `docs/` (`aprovacoes`, `sempre-permitir`, `activity-catalog`) agora leem cópias fixadas em `fixados/` (`decide.ts`, `sempre-permitir.ts`, `events.md`). A conferência viva contra a api é do `brabo-qa`/`brabo-infra`.
- Lacuna: links relativos `../../../../docs/...` em comentários de código apontam para o monorepo e estão quebrados; o `docs:check` e a doc de RN/ADR não vivem aqui.
- CI próprio (`ci.yml`: lint, `openapi:types:check`, `tsc -b --force`, vitest `--maxWorkers=2`, `vite build`, build da imagem sem publicar), política de PR via `brabo-ci@v1.0.0` e Dependabot com `target-branch: dev`.
