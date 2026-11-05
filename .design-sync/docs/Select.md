---
category: Primitivas
keywords: [seleção, dropdown, opções, filtro]
---

# Select

A native `<select>` styled with the DS tokens. The options are children: plain
`<option>` and `<optgroup>`.

## How to use

```tsx
<Select value={agente} onChange={(e) => setAgente(e.target.value)}>
  <option value="">Todos os agentes</option>
  <option value="dev-backend">Dev Backend</option>
  <option value="qa">QA</option>
</Select>
```

## When NOT to use

If each option needs more than one line of information (price, provider,
description, a rich selection state), `Select` cannot cope: `<option>` only
accepts text. That is exactly why `ModelPicker` exists instead of a model
`Select`.
