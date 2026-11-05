---
category: Dominio
keywords: [evento, linha, log, narração, timeline]
---

# EventItem

One row of the event log. **The icon, color and text do not come from props**:
they are derived from `event.type` and `event.payload`.

## Como usar

```tsx
<EventItem event={event} highlighted={event.id === citado} />
```

## What to respect

- To change how the row looks, change the event **type**, not the style. Known
  types get their own narration (`backlog.task_claimed` says which task,
  `permission.granted` says which pattern); an unknown type falls back to the
  generic
  "ator · tipo", without making anything up.
- Failure events are flagged internally and render as `danger`; there is no need
  (nor any way) to pass a tone.
- The time is relative to now. In a preview or test, use `createdAt` as an offset
  from `Date.now()`; a fixed date makes the label drift over time.
- `highlighted` is the evidence-navigation target: it highlights and receives the
  scroll.
