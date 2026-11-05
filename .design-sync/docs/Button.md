---
category: Primitivas
keywords: [botão, ação, variante, submit]
---

# Button

The DS button. It forwards every `<button>` attribute by spread, so `type`,
`disabled`, `onClick` and `aria-*` work as on the native element.

## How to use

```tsx
<Button variant="primary" onClick={aprovar}>Aprovar</Button>
<Button variant="secondary" onClick={negar}>Negar</Button>
<Button variant="ghost" disabled>Sempre permitir</Button>
```

## Choosing the variant

- **primary**: the action the user came to do. At most one per screen.
- **secondary**: the alternative of equal weight (the
  "Negar" next to the "Aprovar").
- **success** / **danger**: when the outcome of the action is what matters to
  communicate: confirming something irreversible, ending a session.
- **ghost**: a tertiary action that should not compete for attention.

## What to respect

- `fullWidth` is for a form submit or a wizard step, where the button fills the
  column. Otherwise the button sizes to its content.
- Do not put a lone icon inside a Button expecting a square button: it keeps the
  label padding. Icon + text is the intended use.
