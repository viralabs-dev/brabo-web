---
category: Primitivas
keywords: [tokens, custo, orçamento, medidor, consumo]
---

# TokenMeter

A consumption meter with cost. A bar with marks at 70/90/100% and the value in
both currencies: cost control is a first-class concern in the product.

## How to use

```tsx
<TokenMeter used={184_320} limit={500_000} costBRL={12.47} costUSD={2.29} />

// Com o que o roteador poupou escolhendo modelo local.
<TokenMeter used={184_320} limit={500_000} costBRL={12.47} costUSD={2.29}
  savingsBRL={38.90} savingsPct={76} />
```

## What to respect

- **`used` and `limit` must be in the unit that `unitLabel` states.** The default
  is "tokens". Passing a token count with `unitLabel="USD"` labels the wrong
  number; that is what `ProjectCard` does today, and it is a known
  inconsistency, not an example to copy.
- `savings*` only when real, measured savings occurred. At zero, omit both.
- `variant`: `default` on the cost screen, `compact` in a card or sidebar, `live`
  during a session in progress.
