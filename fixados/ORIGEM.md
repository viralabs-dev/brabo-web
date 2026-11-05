# Arquivos fixados de outros repositórios

Cópias de arquivos que nascem fora do brabo-web, tiradas do monorepo `daneiel/brabo` em
**`1586158973`** (branch `dev`), único lugar onde esse SHA é registrado.

| Arquivo | Origem | Usado por |
|---|---|---|
| `openapi.json` | `apps/api/docs/reference/openapi.json` | `pnpm openapi:types` e `:check` |
| `decide.ts` | `apps/api/src/domain/actions/decide.ts` | `aprovacoes.test.ts` |
| `sempre-permitir.ts` | `apps/api/src/domain/actions/sempre-permitir.ts` | `sempre-permitir.test.ts` |
| `events.md` | `docs/reference/events.md` | `activity-catalog.test.ts` |

Quando o `brabo-api` publicar a primeira tag, troque estas cópias pelos arquivos dela e atualize o SHA acima.
