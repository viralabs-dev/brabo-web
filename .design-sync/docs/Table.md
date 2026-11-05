---
category: Primitivas
keywords: [tabela, lista, colunas, grid, backlog]
---

# Table

A CSS-grid table, generic over the row. Each column declares `render(row)`, so
the cell can be any node: a Badge, mono text, a link.

## How to use

```tsx
const colunas = [
  { key: 'titulo', label: 'Tarefa', width: '2fr', render: (t) => t.titulo },
  { key: 'status', label: 'Status', width: '140px',
    render: (t) => <Badge tone={TOM[t.status]}>{ROTULO[t.status]}</Badge> },
];

<Table columns={colunas} rows={tarefas} rowKey={(t) => t.id}
  emptyMessage="Nenhuma ação aguardando sua decisão." />
```

## What to respect

- `width` feeds `grid-template-columns` (default `1fr`). Mix `fr` for the column
  that stretches and px for the fixed-width ones.
- `rowKey` is required and must be stable; it is the React key.
- The empty state keeps the header on purpose: the table does not collapse and
  the user still sees what would be there.
- **Beware of overlays inside a cell.** A dropdown open on the last row is
  clipped by the table container unless it is positioned relative to the
  viewport; that was a real product bug.
