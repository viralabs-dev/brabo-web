---
category: Dominio
keywords: [modelo, llm, provider, preço, seletor, ollama, nuvem]
---

# ModelPicker

The LLM model picker. It groups by category (local / cloud) and by provider,
showing the cost of each model: choosing a model is a cost decision.

## How to use

```tsx
<ModelPicker
  models={modelosPorCategoria}
  selectedModelId={modelo?.id}
  onSelect={(m) => vincular(m)}
  variant="topbar"
/>
```

## What to respect

- `models` is `Record<'local' | 'cloud', Record<provider, Model[]>>`. An empty
  category draws no orphan header; that is the case when there is no API key.
- Prices in `Model` are **micro-USD per million tokens**: 3_000_000 is
  US$ 3.00/M. Local models cost 0 and show as "grátis".
- **The catalog lives in the dropdown**, which is internal state with no prop to
  open it. Mounting the component shows only the current model's chip.
- The dropdown is positioned relative to the viewport on purpose: inside a
  table, a dropdown positioned in the flow is clipped on the last rows; that was
  a real product bug.
- `variant`: `topbar` in the top bar, `inline` in an agent's configuration,
  `standalone` on a screen of its own.
