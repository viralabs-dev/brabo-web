---
category: Dominio
keywords: [feed, atividade, eventos, sessão, filtro, timeline]
---

# ActivityFeed

The activity feed of a session or project: an agent filter, chips by activity
type, and one row (`EventItem`) per event.

## How to use

```tsx
<ActivityFeed
  events={events}
  agentOptions={[{ id: 'dev-backend', label: 'Dev Backend' }, { id: 'qa', label: 'QA' }]}
  highlightEventId={eventoCitado}
/>
```

## What to respect

- **The feed HIDES machine noise.** `agent.status`, `agent.response`,
  `agent.delta`, `tool.call`, `tool.result` and `context.compacted` do not
  appear: they are internal to the agent loop. A feed built only from these
  types renders
  "Nenhuma atividade por aqui ainda".
- **`highlightEventId` wins over the filter**, including the machine-noise one.
  It is the Psychologist's evidence navigation, which cites exactly `tool.result`
  and `agent.response`; an invisible highlight would be a navigation that leads
  nowhere.
- The type chips are derived from the events present. A single-type feed shows a
  single chip.
- Without `agentOptions` the agent filter bar disappears.
