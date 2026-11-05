---
category: Dominio
keywords: [agente, time, status, autonomia, modelo, custo]
---

# AgentCard

An agent's card in the team panel: identity, what it is doing now, which model
it uses, how much it has spent and whether it runs in manual or automatic
autonomy.

## How to use

```tsx
<AgentCard
  agent={AGENTS['dev-backend']}
  status="trabalhando"
  model={{ name: 'qwen2.5-coder:14b', provider: 'ollama' }}
  autonomy="auto"
  onAutonomyChange={setAutonomia}
  activity={{ label: 'expor oban_queue_depth no /metrics', branch: 'feature/dev-backend/oban-metrics' }}
  tokensMicros={2_290_000}
/>
```

## What to respect

- **`agent` is a DS `AgentDef`**, not a loose object: name, role, icon and color
  (which enters through `--agent-color`) come from it. Making up the object
  yields a card with no identity.
- **`status` is in pt-BR**: `trabalhando`, `aguardando`, `ocioso`, `falhou`.
- `tokensMicros` is micro-USD: 2_290_000 is US$ 2.29.
- `activity` is what the agent is doing NOW. Without it the card shrinks and
  remains valid; do not fill it with decorative text.
- `onAutonomyChange` is optional, but without it the toggle is inert: only pass
  `autonomy` without a handler if changing it is really not allowed there.
