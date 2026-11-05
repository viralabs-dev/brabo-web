---
category: Dominio
keywords: [projeto, card, lista, provisionamento, time, custo]
---

# ProjectCard

A project's card in the list: repository provider, provisioning state, the agent
team, consumption and the last activity. The whole card is a `<button>`;
`onClick` navigates to the project.

## How to use

```tsx
<ProjectCard
  name="plataforma-de-pagamentos"
  provider="github"
  provisioningStatus="provisioned"
  agents={AGENT_LIST}
  tokensUsed={184_320} tokensLimit={500_000}
  costBRL={12.47} costUSD={2.29}
  lastActivityText="dev-backend abriu PR há 18 min"
  unreadCount={3}
  onClick={() => navegar(projeto.id)}
/>
```

## What to respect

- `agents` is a list of `AgentDef`; the avatars take each agent's color from
  there. Order matters: it is the order they appear in.
- An omitted `provisioningStatus` means provisioned. `provision_failed` must
  lead the user to resume, not to a dead end.
- `lastActivityText` arrives already formatted by the caller; the card does not
  format time.
- `unreadCount` above zero draws the badge; omit it when nothing is pending.
