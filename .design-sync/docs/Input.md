---
category: Primitivas
keywords: [campo, formulário, texto, mono, ícone]
---

# Input

A single-line text field. It forwards `<input>` attributes by spread, so
`type`, `placeholder`, `disabled`, `readOnly` and `value`/`onChange` are the
native ones.

## How to use

```tsx
<Input placeholder="Nome do projeto" value={nome} onChange={(e) => setNome(e.target.value)} />

// Com adorno à esquerda — na app é sempre um ícone do set.
<Input icon={<SearchIcon size={14} />} placeholder="Buscar sessão" />

// mono para segredo, comando, branch ou SHA.
<Input mono type="password" placeholder="ghp_…" />

// Campo de formulário: rótulo, apoio e erro são do próprio Input.
<Input label="E-mail" type="email" autoComplete="username" value={email} onChange={…} />
<Input label="Senha" type="password" error={erro} value={senha} onChange={…} />
```

## What to respect

- **`mono` is not decoration.** Use it whenever the content is compared
  character by character: token, terminal command, branch name, id. Without it,
  an `l` and a `1` are ambiguous in the field.
- `icon` accepts any node, but the slot fits a 14px icon. A label does not fit
  inside the field: that is what the `label` prop is for.
- **Always use `label` in a form.** The component links label and field through
  a stable `id` (`useId()`), which is what makes screen readers and clicking the
  label work. A hand-built `<label>` outside the component loses that.
- **`error` and `hint` take the same spot** under the field, and `error` wins
  when both come together. `error` also marks the field invalid
  (`aria-invalid`) and announces the message with `role="alert"`; do not signal
  an error with border color alone.
- Without `label`, `error` and `hint`, the component is just the box, which is
  how it appears in filters, search and the token field.
