---
category: Wizard
keywords: [credencial, token, git, pat, provider, segredo]
---

# CredentialStep

The wizard step that picks an already-registered git credential or registers a
new one.

## How to use

```tsx
<CredentialStep
  provider="github"
  credentials={credenciais}
  selectedId={escolhida}
  onSelect={setEscolhida}
  onRegister={(token) => registrar(token)}
  registering={salvando}
  error={erro}
/>
```

## What to respect

- **`credentials` are metadata only** (id, provider, dates). The token never
  reaches the browser once saved: it is envelope encryption, and the component
  was built assuming that. Do not expect to display the secret.
- **`error` and `registering` only show with the new-token form open**, and it
  starts open only when no credential exists. In a preview or test, click
  "Adicionar novo token" to see those states.
- `error` should say what to do, not just that it failed: which scope is
  missing, which permission the token lacks.
- `onRegister` receives the token as plain text and is called once;
  `registering` is what prevents a double submit.
