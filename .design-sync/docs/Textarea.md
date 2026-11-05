---
category: Primitivas
keywords: [textarea, campo, texto, multilinha, formulário]
---

# Textarea

A multiline text field with label, hint and error: the sibling of `Input` for
when the answer is a paragraph.

## How to use

```tsx
<Textarea
  label="Motivo"
  value={motivo}
  onChange={(e) => setMotivo(e.target.value)}
  hint="Vai como mensagem fixada na sessão do PO."
  placeholder="Ex.: os critérios de aceite não cobrem a recusa do pagamento."
/>

// Inválido: `error` substitui o `hint` e marca o campo.
<Textarea label="Motivo" error="Diga o que falta." />
```

## What to respect

- **Use `label`, not your own `<label>`.** The component generates the id and
  does the association, which is what makes clicking the label focus the field.
- **`error` and `hint` do not coexist.** When there is an error, it replaces the
  hint: two lines of text under the field compete, and the one that matters
  loses.
- It accepts the native `<textarea>` props (`rows`, `placeholder`, `maxLength`).
