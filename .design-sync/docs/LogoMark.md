---
category: Icones
keywords: [marca, logo, brabo, wordmark]
---

# LogoMark

Outline icon from the Brabo set: it is the Brabo mark, the three stems of the wordmark. It appears at the top of the sidebar and on the auth screens.

## How to use

```tsx
// O componente vem do bundle: window.BraboDS.LogoMark

// Ao lado de um rótulo — decorativo, então esconda do leitor de tela.
<button>
  <LogoMark size={14} aria-hidden />
  Continuar
</button>

// Sozinho e significativo — dê a ele um nome acessível.
<LogoMark size={16} aria-label="o ícone" />
```

## What to respect

- **Size**: `size` in px, always 1:1 on a 24 grid. The app uses 12 to 22; 16 is
  the default and the most common value.
- **Color**: the stroke is `currentColor`. The color comes from the context:
  inherit it from the container or set `color` on the parent. There is no
  stroke-color prop.
- **Stroke**: `strokeWidth` is 1.6 across the whole set. Changing it on a single
  icon breaks the optical consistency of all 37.
- Every icon in the set has exactly this same signature, so swapping one for
  another never requires touching the props.
