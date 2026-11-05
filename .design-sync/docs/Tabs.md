---
category: Primitivas
keywords: [abas, navegação, tabs, seções]
---

# Tabs

A controlled tab strip. `active` and `onChange` belong to the caller; the
component does not store the selected tab.

## How to use

```tsx
const abas = [
  { key: 'visao', label: 'Visão geral' },
  { key: 'backlog', label: 'Backlog', count: 24 },
  { key: 'aprovacoes', label: 'Aprovações', count: 3 },
];

<Tabs items={abas} active={aba} onChange={setAba} />
```

## What to respect

- `count` is for what demands attention (pending items, items to decide).
  Counting everything on every tab removes the signal from the number.
- `trailing` anchors content to the right of the strip: the place for the
  screen's primary action, not for more tabs.
- Tabs only draws the strip. The panel of each tab is the caller's responsibility.
