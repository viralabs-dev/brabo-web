# Changelog

## Unreleased

- Docs: the 66 component docs in `.design-sync/docs/` translated to English (AT-745). The frontmatter (`category:` and `keywords:`), code blocks, quoted UI strings and domain values in pt-BR are unchanged, so the design-sync grouping is the same.

- Docs: `README.md`, `design/*.md` and `.design-sync/NOTES.md`/`conventions.md` translated to English (AT-745); `tokens.css` comments and the component docs in `.design-sync/docs/` are left for their own round.

- Docs: `docs/` is now English only (AT-745): `business-rules/web.md` and `explanation/tanstack-ai.md` are reconciled with the current pt-BR content (22 missing RNs added, code refs updated), carry `idioma_original: en`, and the `docs/i18n/` translations are removed.

- Chat "PRs ready to merge": after "Mergear" proposes the merge, a success toast shows and the approval card is scrolled into view (AT-740). The flow itself was reproduced and works; the defect was feedback, since the card appeared inside a height-capped list.
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
