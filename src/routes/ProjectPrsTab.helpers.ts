import type { CodePullRequestSummary, ProposedAction } from '../lib/api-types';

/**
 * A última recusa de execução de merge DESTA PR (RN-705) — o conflito de merge
 * do provider local, por exemplo. Lida da fila de ações FALHAS do projeto
 * (`status=failed`), a mais recente por `updatedAt`. A recusa só vale enquanto
 * não houver merge pendente: a nova tentativa toma o lugar dela.
 */
export function ultimaRecusaDeMerge(
  falhas: ProposedAction[] | undefined,
  pr: CodePullRequestSummary,
): { motivo: string; arquivos: string[] } | undefined {
  const daPr = (falhas ?? [])
    .filter((a) => String((a.payload as { pullRequestId?: unknown }).pullRequestId ?? '') === pr.id)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const ultima = daPr[0];
  if (!ultima) return undefined;
  const r = (ultima.executionResult ?? {}) as { error?: unknown; conflictingFiles?: unknown };
  return {
    motivo: typeof r.error === 'string' ? r.error : '',
    arquivos: Array.isArray(r.conflictingFiles)
      ? r.conflictingFiles.filter((f): f is string => typeof f === 'string')
      : [],
  };
}
