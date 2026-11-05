---
category: Primitivas
keywords: [alerta, aviso, erro, sucesso, mensagem, banner]
---

# Alert

A message block with an icon and a tone. It is for what the user must read
before moving on, not for transient status (that is `Badge`) nor for action
confirmation (that is a toast).

## How to use

```tsx
// O tom escolhe o ícone sozinho.
<Alert tone="accent">
  Nada foi alterado no repositório. Isto é o que o bootstrap <strong>faria</strong>.
</Alert>

// Erro que interrompe: `role="alert"` avisa o leitor de tela na hora.
<Alert tone="danger" role="alert">{erro}</Alert>

// Confirmação que pode esperar a pausa da leitura.
<Alert tone="success" role="status">Link enviado.</Alert>
```

## `role` is a choice, not a consequence of the tone

This is the rule [ADR 0036] set and the one most often broken: `role="alert"` is
an **assertive** live region: it interrupts the screen reader mid-sentence.
`role="status"` waits for a pause. A `tone="danger"` that merely describes a
screen state does not deserve to interrupt anyone, and a `tone="success"` that
confirms the end of a long action sometimes does. Choose by what the message
DOES, not by its color.

Without `role`, the block is decorative for screen-reader users, which is
correct when the text is also visible in the flow.

## What to respect

- **One Alert per topic.** Three stacked become noise and the user stops reading.
- `children` accepts markup: a `<strong>` on the key term helps scanning.
- `icon` only when the tone's default misrepresents the message.
