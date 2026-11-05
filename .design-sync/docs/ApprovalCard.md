---
category: Dominio
keywords: [aprovação, ação proposta, permissão, diff, autoridade]
---

# ApprovalCard

The card of a `proposed_action` awaiting a decision. It is the component where
the user's final authority happens: every action with an external effect
(terminal, git, spending, instruction patch) is born here.

## How to use

```tsx
<ApprovalCard
  action={action}
  urgency="critico"
  meta="dev-backend · há 30 segundos"
  onApprove={aprovar}
  onDeny={(motivo) => negar(motivo)}
  onAlwaysAllow={gravarRegra}
/>
```

## What to respect

- **All three handlers are required.** `onDeny` receives an optional reason typed
  by the user; the textarea only appears after clicking
  "Negar".
- The card body changes by `action.actionType`: a command for `terminal`, a diff
  for `git_commit` and `instruction_patch`, and so on. There is no layout prop;
  the action type decides.
- **`actor.id` must be an agent key** (`dev-backend`, `qa`, `anamnese`...). The
  card resolves name and icon from it; a model id falls back and the card loses
  its identity.
- When `status` leaves `pending`, the buttons disappear and the card becomes a
  record of the decision, with the reason when there was one.
- On `instruction_patch`, "Sempre permitir" is **not** offered: the domain policy
  always forces approval, so the button would promise an effect that does not
  exist.
- `variant="queue"` with `selectable` enables batch decisions in the queue.
