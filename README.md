# brabo-web

Brabo web interface: React 19, Vite, TanStack Query/Router, Tailwind 4 and shadcn/ui (Base UI). Extracted from the `daneiel/brabo` monorepo (ADR 0252, EP-033) with history.

## Development

```sh
pnpm install
pnpm dev                 # vite
pnpm typecheck           # tsc -b --force
pnpm test                # vitest
pnpm areas:baixar        # baixa o areas.json do brabo-contracts (tag fixada) para o teste de contrato
pnpm build
```

## Dependencies on other repositories

- `@brabo/shared`: `viralabs-dev/brabo-contracts#v1.0.0` (by tag, never by branch).
- API types: `fixados/openapi.json` (`pnpm openapi:types`), a pinned copy; its origin is in `fixados/ORIGEM.md`.
- Design tokens: `design/tokens.css`; the design docs are in `design/` and the app docs in `docs/`.

## Images

`Dockerfile` (production, nginx, no local build required) and `Dockerfile.dev` (vite with a bind mount). CI builds the production image without publishing it.

Permanent branches: `dev` and `main`; tags only via workflow. MIT license.
