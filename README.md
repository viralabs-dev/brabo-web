# brabo-web

Interface web do Brabo: React 19, Vite, TanStack Query/Router, Tailwind 4 e shadcn/ui (Base UI).

## Desenvolver

```sh
pnpm install             # exige ~/.npmrc com PAT classic read:packages (veja abaixo)
pnpm dev                 # vite
pnpm lint                # oxlint
pnpm typecheck           # tsc -b --force
pnpm test                # vitest
pnpm areas:baixar        # baixa o areas.json do brabo-contracts (mesma versão do `@brabo/shared`) para o teste de contrato
pnpm build
```

## Dependências de outros repositórios

- `@brabo/shared`: pacote público `@viralabs-dev/brabo-shared@1.2.0` do GitHub Packages, publicado pelo [brabo-contracts](https://github.com/viralabs-dev/brabo-contracts) e instalado pelo alias do pnpm (`package.json`; versão exata). O GitHub Packages pede token até para instalar pacote público: no host, grave no `~/.npmrc` uma linha `//npm.pkg.github.com/:_authToken=<PAT>` com um PAT classic só com `read:packages` (nunca no repo; o `.npmrc` versionado só nomeia o registry). No CI, é o `GITHUB_TOKEN`. Para subir a versão, use `scripts/ci/subir-contracts.sh` do [brabo-ci](https://github.com/viralabs-dev/brabo-ci).
- Tipos da api: `fixados/openapi.json` é uma cópia fixada do contrato do [brabo-api](https://github.com/viralabs-dev/brabo-api); `pnpm openapi:types` gera os tipos e o CI confere com `pnpm openapi:types:check`. A origem de cada arquivo fixado está em `fixados/ORIGEM.md`.
- Tokens de design: `design/tokens.css`; a doc do design está em `design/` e a do app em `docs/` (regras de negócio em `docs/business-rules/web.md`).

## Imagens

`Dockerfile` (produção, nginx, sem build local obrigatório) e `Dockerfile.dev` (vite com bind mount). O build da imagem de produção recebe o token do registry só como secret do BuildKit: `docker build --secret id=npmrc,src=$HOME/.npmrc .`. O CI constrói a imagem de produção sem publicar; a imagem `ghcr.io/viralabs-dev/brabo-web` é publicada pelo `release.yml` quando sai uma tag final (`vX.Y.Z`).

Branches permanentes: `dev` e `main`; tag só por workflow. Licença MIT.

## Repositórios do Brabo

O Brabo é dividido em repositórios por camada (ADR 0252), e a documentação central está no [brabo](https://github.com/viralabs-dev/brabo) e em https://viralabs-dev.github.io/brabo/prd/.

- **Depende de:** [brabo-contracts](https://github.com/viralabs-dev/brabo-contracts), [brabo-ci](https://github.com/viralabs-dev/brabo-ci) e [brabo-api](https://github.com/viralabs-dev/brabo-api) (cópia fixada do `openapi.json`).
- **É usado por:** [brabo](https://github.com/viralabs-dev/brabo) e [brabo-infra](https://github.com/viralabs-dev/brabo-infra).

| Repositório | Papel |
|---|---|
| [brabo](https://github.com/viralabs-dev/brabo) | Porta de entrada do produto: documentação, ADRs, `install.sh` e release do produto |
| [brabo-api](https://github.com/viralabs-dev/brabo-api) | API NestJS: domínio, banco e autenticação |
| [brabo-engine](https://github.com/viralabs-dev/brabo-engine) | Engine Elixir/OTP: agentes, gates, sessões e filas |
| [brabo-web](https://github.com/viralabs-dev/brabo-web) | Interface web em React |
| [brabo-runner](https://github.com/viralabs-dev/brabo-runner) | CLI que roda na máquina do usuário |
| [brabo-broker](https://github.com/viralabs-dev/brabo-broker) | Único processo com acesso ao socket do Docker |
| [brabo-contracts](https://github.com/viralabs-dev/brabo-contracts) | Contratos compartilhados entre os repositórios |
| [brabo-infra](https://github.com/viralabs-dev/brabo-infra) | Composes, Kubernetes e o `make dev` que sobe tudo |
| [brabo-ci](https://github.com/viralabs-dev/brabo-ci) | Workflows reutilizáveis e política de PR |
| [brabo-qa](https://github.com/viralabs-dev/brabo-qa) | Testes de ponta a ponta, golden-sets e smoke das imagens |
| [brabo-workspace](https://github.com/viralabs-dev/brabo-workspace) | Pasta-mãe que clona os repositórios lado a lado |

## Apoie

Se o projeto te ajuda, você pode [pagar um café no Ko-fi](https://ko-fi.com/daneiel).
