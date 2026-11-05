---
category: Primitivas
keywords: [skeleton, carregando, placeholder, esqueleto, loading]
---

# Skeleton

A pulsing rectangle that reserves the SIZE of content that has yet to arrive.

## How to use

```tsx
// Linha de texto: largura em % acompanha o container.
<Skeleton width="70%" height={15} />

// Bloco com canto: use o mesmo radius do elemento real.
<Skeleton width={34} height={34} radius={8} />
```

## What to respect

- **Measure the real content.** The point of the skeleton is for the list not to
  JUMP when the data arrives. A rectangle of arbitrary height just moves the jump
  elsewhere instead of eliminating it; copy the measurements of the component it
  replaces.
- **Do not animate what is not waiting.** Skeleton is for loading in progress; in
  a permanently empty state it promises something that never comes.
- For a whole card there is `ProjectCardSkeleton`, which already has the right
  silhouette; do not rebuild it by hand.
