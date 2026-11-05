---
category: Wizard
keywords: [bootstrap, gitflow, provisionamento, passos, progresso]
---

# BootstrapSteps

The progress of the Gitflow bootstrap: the six steps that prepare the
repository, with the state of each one.

## How to use

```tsx
<BootstrapSteps stepStates={estados} failedStep={status.failedStep ?? undefined} />
```

## What to respect

- **`stepStates` needs all six steps**: it is a complete `Record` of
  `BootstrapStepName`, in the order the pipeline runs them:
  `commit_pr_template`, `commit_branching_policy`, `create_dev_branch`,
  `create_qa_branch`, `create_rc_branch`, `protect_branches`.
- States in **pt-BR**: `pendente`, `rodando`, `ok`, `skip`, `falha`.
- **`skip` is not a failure**: it means the step was unnecessary (the file
  already existed, the branch was already there). Use `note` to say why; the
  bootstrap is idempotent and resumable, and the user needs to understand that
  nothing broke.
- `failedStep` is what lets you offer a resume from the right point.
- One `rodando` step at a time. Two at once describe a state the pipeline never
  produces.
