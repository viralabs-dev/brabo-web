import type { SessionEvent } from './api-types';

export type CategoriaDeAutomacao = 'aprovacao' | 'handoff' | 'desbloqueio';
export type RespostaDaOferta = 'pendente' | 'aceita' | 'recusada';

/**
 * RN-1442 (AT-999): a oferta de "fazer sozinho" vira cartão respondido quando um
 * `automacao.aceita`/`automacao.recusada` da MESMA categoria e chave a segue no fio.
 */
export function respostaDaOferta(events: readonly SessionEvent[], oferta: SessionEvent): RespostaDaOferta {
  const p = oferta.payload as { categoria?: string; chave?: string };
  for (const e of events) {
    if (e.seq <= oferta.seq) continue;
    if (e.type !== 'automacao.aceita' && e.type !== 'automacao.recusada') continue;
    const q = e.payload as { categoria?: string; chave?: string };
    if (q.categoria === p.categoria && q.chave === p.chave) return e.type === 'automacao.aceita' ? 'aceita' : 'recusada';
  }
  return 'pendente';
}

/** A chave de aprovação é `<tipo>@<agente>`; as demais passam inteiras. */
export function partesDaChave(chave: string): { acao: string; agente: string } {
  const i = chave.indexOf('@');
  return i < 0 ? { acao: chave, agente: '' } : { acao: chave.slice(0, i), agente: chave.slice(i + 1) };
}

/** RN-1443: o destino de "desfazer", montado na web (o `comoDesfazer` do payload é um `DELETE`, não serve a quem lê). */
export const destinoDasRegras = (projectId: string) =>
  `/projects/${projectId}?tab=settings&group=projeto&section=regras-de-oferta`;
