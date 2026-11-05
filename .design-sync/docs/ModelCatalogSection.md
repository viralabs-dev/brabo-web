---
category: Dominio
keywords: [catálogo, modelos, curadoria, sync, provider, workspace]
---

# ModelCatalogSection

The curation screen of a workspace's model catalog: it syncs with the providers,
lists what was discovered and bulk-toggles what appears in the picker.

## Preview card

This component shows the **floor card**, on purpose. It fetches data
(`useQuery`/`useMutation`) and needs a `QueryClientProvider` above it; putting
that provider in the global design-sync `cfg.provider` would wrap all 57
components and clear every grade, which is too expensive for a single component.
To see it working, open a project's "Configurações" tab in the app.

## How to use

```tsx
// Pende do WORKSPACE porque a curadoria é por workspace (ADR 0049).
<ModelCatalogSection workspaceId={project.workspaceId} />
```

## What to respect

- **The catalog is global; the curation belongs to the workspace.** Name, price
  and capabilities are provider facts and hold for the whole installation; what
  depends on the workspace is the decision "does this appear in the picker?".
- **What the sync discovers enters DISABLED** ([RN-043]). A provider catalog has
  hundreds of rows: dumping them in as active would make choosing impossible and
  would switch on expensive models with nobody deciding.
- **A model that disappeared from the provider is flagged, never dropped from
  the list.** `token_usage` and `model_bindings` point to it; hiding it would
  leave the affected binding unexplained.
