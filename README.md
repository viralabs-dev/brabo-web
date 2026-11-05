# brabo-web

Interface web do Brabo: React 19, Vite, TanStack Query/Router, Tailwind 4 e shadcn/ui (Base UI). Extraído do monorepo `daneiel/brabo` (ADR 0252, EP-033) com histórico.

## Desenvolver

```sh
pnpm install
pnpm dev                 # vite
pnpm typecheck           # tsc -b --force
pnpm test                # vitest
pnpm areas:baixar        # baixa o areas.json do brabo-contracts (tag fixada) para o teste de contrato
pnpm build
```

## Dependências de outros repositórios

- `@brabo/shared`: `viralabs-dev/brabo-contracts#v1.0.0` (por tag, nunca por branch).
- Tipos da api: `fixados/openapi.json` (`pnpm openapi:types`), cópia fixada; origem em `fixados/ORIGEM.md`.
- Tokens de design: `design/tokens.css`; a doc do design em `design/` e a do app em `docs/`.

## Imagens

`Dockerfile` (produção, nginx, sem build local obrigatório) e `Dockerfile.dev` (vite com bind mount). O CI constrói a de produção sem publicar.

Branches permanentes: `dev` e `main`; tag só por workflow. Licença MIT.
