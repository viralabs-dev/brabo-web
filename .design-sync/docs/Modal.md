---
category: Primitivas
keywords: [modal, diálogo, overlay, confirmação]
---

# Modal

A dialog over a backdrop that covers the viewport. **It has no open/closed
prop**: the caller mounts the Modal when it wants to show it and unmounts it on
close.

## How to use

```tsx
{confirmando && (
  <Modal title="Encerrar a sessão?" onClose={() => setConfirmando(false)}>
    <p>A sessão passa para <b>closing</b> e os agentes param de aceitar trabalho novo.</p>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
      <Button variant="ghost" onClick={() => setConfirmando(false)}>Cancelar</Button>
      <Button variant="danger" onClick={encerrar}>Encerrar</Button>
    </div>
  </Modal>
)}
```

## What to respect

- `onClose` is required and is what the header X calls. Without it the user is
  stuck.
- The Modal does not build a footer: the actions are children, and the product
  convention is to right-align them, with the destructive one last.
- `title` accepts a ReactNode, so you can compose it with `<code>` or a Badge.
