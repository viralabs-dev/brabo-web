# Changelog

## Unreleased

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
