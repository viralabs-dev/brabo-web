import type { Epic, Story } from '../lib/api-types';

/**
 * As histórias que o PO terminou e que aguardam a decisão do usuário (Fase 12c
 * — RN-048). `proposedReady` convive com `status: 'draft'`: é uma proposta,
 * não um estado, e por isso não entra em `STATUS_TONE`.
 */
export function aguardandoPromocao(epics: Epic[] | undefined): Story[] {
  if (!epics) return [];
  return epics.flatMap((e) => e.stories.filter((s) => s.proposedReady));
}
