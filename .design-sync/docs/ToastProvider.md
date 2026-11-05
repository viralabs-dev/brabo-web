---
category: Primitivas
keywords: [toast, notificação, feedback, provider, contexto]
---

# ToastProvider

The toast stack provider. It **does not receive the toasts as a prop**: whoever
is inside the tree calls `useToast().showToast()`.

## How to use

```tsx
// Uma vez, no topo da árvore.
<ToastProvider>
  <App />
</ToastProvider>

// Em qualquer lugar dentro dela.
const { showToast } = useToast();
showToast({
  title: 'Ação aprovada',
  message: 'dev-backend já está executando o comando.',
  tone: 'success',
});
```

## What to respect

- `useToast()` **throws** outside the provider. If a component can be mounted in
  isolation, make sure the provider sits above it.
- `durationMs` defaults to 5000, and the toast removes itself. In a preview or
  screenshot, pass a large value; otherwise the result depends on when the
  capture happened.
- Tones: `success` worked · `warning` attention · `danger` failed or ended badly
  · `accent` relevant information.
- `message` is optional; without it the toast shrinks to one line.
