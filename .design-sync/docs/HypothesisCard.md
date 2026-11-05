---
category: Dominio
keywords: [hipótese, psicólogo, evidência, confiança, anamnese]
---

# HypothesisCard

A Psychologist hypothesis about an agent's behavior, with the evidence that
supports it and the user's decision.

## How to use

```tsx
<HypothesisCard
  hypothesis={hipotese}
  projectId={projeto.id}
  onAccept={aceitar}
  onDismiss={descartar}
/>
```

## What to respect

- The domain fields are in **pt-BR**: `observacao` (what was observed),
  `hipotese` (the proposed explanation), `sugestao` (what to do), `agenteAlvo`.
- `confiancaPercent` is always visible, even when low: hiding uncertainty is the
  opposite of the component's purpose.
- `evidenceEventIds` is what makes the hypothesis navigable to the event log. An
  empty list leaves the hypothesis ungrounded; prefer not to propose it.
- `terminationAnalysis` only when the hypothesis came from an ended session. It
  separates agent behavior from an operational cause (a `node_shutdown`, for
  example, is not the agent's fault).
- With a `status` other than `proposed` the buttons go away and the card becomes
  a record.
