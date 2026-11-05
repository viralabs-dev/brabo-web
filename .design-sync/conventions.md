# How to build with the Brabo design system

Brabo is an engineering platform orchestrated by AI agents. The person using
the interface is an engineer following several agents working at the same
time, and deciding, in the end, what they are allowed to do. That explains
almost every choice below.

## The essentials

- **Dark is the primary theme.** `:root` is already the dark theme; the light
  one only comes in with `[data-theme="light"]` on the root element. No
  component paints its own page background: all of them assume they sit on the
  DS surface and inherit its text color. Wrap the tree in `BraboSurface` (or
  declare `background: var(--surface-0); color: var(--text-primary)` on the
  container); without it, light icons and text become invisible.
- **Everything in Brazilian Portuguese.** Labels, messages, empty states,
  errors. Several domain fields are also in pt-BR (`observacao`, `hipotese`,
  `sugestao`), and some enums too: agent `status` is
  `trabalhando | aguardando | ocioso | falhou`, and bootstrap step is
  `pendente | rodando | ok | skip | falha`.
- **Never use a literal color.** Every color comes from a token (`var(--accent)`,
  `var(--danger)`, `var(--surface-1)`). Some components receive color through a
  runtime variable (`--agent-color`, `--urgency-color`); the value is still a
  token, it just arrives through `style`.
- **Three families, with fixed roles.** Space Grotesk for titles, Archivo for
  body, IBM Plex Mono for everything that is an identifier or is compared
  character by character: command, token, branch, SHA, id, model name,
  technical status. Badge and chip use mono at 10px by design.

## Product patterns

- **The decision is always the user's.** An action with an external effect
  appears as an `ApprovalCard` and waits for approval; merge into a protected
  branch is manual by domain guarantee. Do not compose screens that suggest
  automating those two things: the interface exists to preserve that authority.
- **Cost is first-class information.** `TokenMeter` and the per-agent cost are
  not a footer detail: whoever uses Brabo is spending LLM tokens on every turn,
  and needs to see that while it happens.
- **An empty state always has its own text.** No DS component collapses when it
  has no data: `Table` keeps the header, `ActivityFeed` and the notifications
  panel have their own sentence. Preserve that.
- **An error has to be actionable.** The convention is to say what to do, not
  just that it failed: which scope the token lacks, which gate asked for a
  change, why the task blocked. `blockedReason`, `rejectionReason` and `error`
  exist for this.
- **Failure is not the same as "was not needed".** In bootstrap, `skip` is
  success with a note explaining. Treating `skip` as an error scares for no
  reason.

## Composition

- **An icon always comes from the set**, with `size` in px (12-22, default 16)
  and color inherited via `currentColor`. Decorative next to a label →
  `aria-hidden`; alone and meaningful → `aria-label`.
- **An agent is always an `AgentDef`** (`dev-backend`, `dev-frontend`, `qa`,
  `secops`, `infra`, `po`, `arquiteto`, `criativo`, `anamnese`, `psicologo`,
  `psicologo-leve`).
  Name, role, icon and color come from it. Do not invent an agent or pass a
  model name where an agent key is expected.
- **An event is not styled, it is typed.** `EventItem` and `ActivityFeed`
  derive icon, color and narration from `event.type` and `event.payload`. To
  change how a row looks, change the event type.
- **Time is relative and formatted by the DS.** Pass an ISO `createdAt` and let
  the component format it; where the time text is yours (`meta`,
  `lastActivityText`), follow the same tone: "há 18 min", "há 2 h".
- **An overlay belongs to the viewport.** An open dropdown or panel is
  positioned relative to the viewport on purpose: inside a table or list, an
  in-flow overlay gets clipped on the last rows.

## What does not exist here

There is no page layout, grid or stack component: screens compose with their
own CSS over the spacing tokens. There is no `Tooltip`, `Popover` or
`DatePicker`; if a screen needs one, it is a new piece, not a variant of
something existing. `Table` does not sort, paginate or select: it draws rows
and columns, and the rest belongs to whoever uses it.
