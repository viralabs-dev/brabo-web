import type { ProposedAction, SessionEvent } from '../lib/api-types';

import type { PrAbertaDaAcao } from './MergearNoChat';

/**
 * A PR aberta por esta ação `pr_open`, ou `null` se ela não abriu nenhuma.
 *
 * A fonte é o evento `action.pr_open` que a execução grava com
 * `{ actionId, pullRequestId, pullRequestUrl }` (`ExecuteGitActionUseCase`);
 * a ação em si não guarda o id da PR. Ação que ainda não executou, falhou ou
 * caiu fora da janela de eventos lida devolve `null` — e o botão não aparece:
 * não saber qual é a PR não é licença para propor o merge de outra.
 */
export function prAbertaDaAcao(
  acao: ProposedAction,
  eventos: readonly SessionEvent[],
): PrAbertaDaAcao | null {
  if (acao.actionType !== 'pr_open') return null;
  if (acao.status !== 'approved' && acao.status !== 'auto_approved') return null;
  const evento = eventos.find(
    (e) =>
      e.type === 'action.pr_open' &&
      (e.payload as { actionId?: unknown } | null)?.actionId === acao.id,
  );
  const id = (evento?.payload as { pullRequestId?: unknown } | undefined)?.pullRequestId;
  if (id === undefined || id === null || String(id) === '') return null;
  const dado = acao.payload as { sourceBranch?: unknown; targetBranch?: unknown; title?: unknown };
  return {
    pullRequestId: String(id),
    sourceBranch: typeof dado.sourceBranch === 'string' ? dado.sourceBranch : undefined,
    targetBranch: typeof dado.targetBranch === 'string' ? dado.targetBranch : undefined,
    title: typeof dado.title === 'string' ? dado.title : undefined,
  };
}

/**
 * Já existe uma proposta de merge VIVA para esta PR nesta sessão? Pendente,
 * aprovada ou auto-aprovada contam — negada ou falha, não: nesses casos o dono
 * pode querer tentar de novo. É o dedupe do lado da tela; quem recusa de fato
 * é a api, em qualquer sessão (RN-663: `merge_ja_proposto`/`pr_ja_mergeado`).
 */
export function jaHaMergeDaPr(acoes: readonly ProposedAction[], pullRequestId: string): boolean {
  return acoes.some(
    (a) =>
      a.actionType === 'git_merge' &&
      (a.status === 'pending' || a.status === 'approved' || a.status === 'auto_approved') &&
      String((a.payload as { pullRequestId?: unknown }).pullRequestId ?? '') === pullRequestId,
  );
}
