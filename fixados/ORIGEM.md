# Arquivos fixados de outros repositórios

Cópias de arquivos que nascem fora do brabo-web. Cada linha diz de onde veio e em que ponto está, conferido
byte a byte em 07/11/2026 contra o repo de origem. O histórico do monorepo (`viralabs-dev/brabo-legacy`, antes
`daneiel/brabo`) só entra como origem do que ainda não foi trocado.

| Arquivo | Origem hoje | Ponto | Usado por |
|---|---|---|---|
| `openapi.json` | `brabo-api:docs/reference/openapi.json` | idêntico ao da `dev` do brabo-api em **`7d94c3b7`** | `pnpm openapi:types` e `:check` |
| `sempre-permitir.ts` | `brabo-api:src/domain/actions/sempre-permitir.ts` | idêntico ao da `dev` do brabo-api em **`7d94c3b7`** | `sempre-permitir.test.ts` |
| `decide.ts` | `brabo-api:src/domain/actions/decide.ts` | ainda a cópia do `brabo-legacy` em **`1586158973`**; a api já passou dele (RN-1019, `semMergeLocal`), e a cópia não o importa porque o `external-effect.ts` não vem junto | `aprovacoes.test.ts` |
| `events.md` | `brabo:docs/reference/events.md` | ainda a cópia do `brabo-legacy` em **`1586158973`**; o `brabo` já seguiu | `activity-catalog.test.ts` |

Quando o `brabo-api` publicar uma tag estável, troque `openapi.json`, `sempre-permitir.ts` e `decide.ts` pelos
arquivos dela (o `decide.ts` pede o `external-effect.ts` junto) e atualize o ponto acima.
