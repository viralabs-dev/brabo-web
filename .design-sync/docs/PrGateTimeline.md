---
category: Dominio
keywords: [pr, gate, qa, secops, merge, cobertura, revisão]
---

# PrGateTimeline

The timeline of an agent PR: the **dev → qa → secops → you** stepper and the
verdicts of each gate, expandable.

## How to use

```tsx
<PrGateTimeline task={task} prAction={acaoDaPr} verdicts={pareceres} />
```

## What to respect

- **The last stage is always the user.** Merging into a protected branch is a
  manual decision, guaranteed by a test in the domain; no composition should
  suggest an automatic merge.
- `task.gateStatus` says where the PR stands (`awaiting_qa`, `awaiting_secops`,
  `awaiting_user`); `null` means no gate has started.
- `verdicts` are the verdicts already issued, in `seq` order. Each carries
  `resumo` and `itens`; the QA one may carry `coverageMatrix`.
- **Verdicts start collapsed.** The `coverageMatrix` only shows when the verdict
  is expanded; in a preview or test, click its header.
- A matrix rule with `covered: false` is the whole point of the matrix: it stays
  visible as "sem teste", not hidden.
- `task.blocked` with `blockedReason` draws the block. A block with no reason
  leaves the user with no way out.
