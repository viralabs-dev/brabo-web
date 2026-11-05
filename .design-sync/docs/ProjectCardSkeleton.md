---
category: Dominio
keywords: [skeleton, projeto, card, carregando, dashboard]
---

# ProjectCardSkeleton

The silhouette of a `ProjectCard`, with the same measurements as the real card.
It takes no props.

## How to use

```tsx
// Enquanto a lista de projetos carrega, no lugar dos cards.
{carregando
  ? Array.from({ length: 3 }, (_, i) => <ProjectCardSkeleton key={i} />)
  : projetos.map((p) => <ProjectCard key={p.id} {...p} />)}
```

## What to respect

- **The measurements are the contract.** It exists so that the skeleton → card
  swap moves nothing on screen. Changing `ProjectCard` without changing this one
  brings back the jump it was made to eliminate.
- Repeat it as many times as you expect to receive, not a fixed number: three
  skeletons followed by a single card is worse than a single skeleton.
