---
category: Primitivas
keywords: [badge, status, tag, contador, pílula]
---

# Badge

A short pill for status or a count. Text in `var(--font-mono)` at 10px: it is a
label, not a sentence.

## How to use

```tsx
// Status, com o ponto que marca estado vivo.
<Badge tone="success" dot>active</Badge>

// Contador — square dá o radius menor.
<Badge tone="accent" square>7</Badge>

// Algo acontecendo agora.
<Badge tone="accent" dot pulse>dev-backend implementando</Badge>
```

## Choosing the tone

`success` done or approved · `warning` waiting or near a limit · `danger`
denied, blocked or failed · `accent` in progress or highlighted · `muted`
neutral, draft, a count with no urgency.

## What to respect

- **`pulse` only for what changes by itself.** On a static status it lies.
- The content is a word or a number. A sentence inside a Badge breaks the layout
  of the row it lives in.
