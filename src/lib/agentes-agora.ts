import type { RosterEntry } from './agent-status';

/** O ponto da sidebar tem quatro estados; `travado` (circuit breaker) é falha. */
export type PontoDeAgente = 'trabalhando' | 'aguardando' | 'ocioso' | 'falhou';

export const MAX_AGENTES_AGORA = 5;

// Mais urgente primeiro: quem pede o usuário, quem quebrou, quem trabalha, o resto.
const URGENCIA: Record<PontoDeAgente, number> = { aguardando: 0, falhou: 1, trabalhando: 2, ocioso: 3 };

export function pontoDoAgente(status: RosterEntry['status']): PontoDeAgente {
  return status === 'travado' ? 'falhou' : status;
}

/** Até 5 agentes do roster por urgência (RN-1205); a ordem original desempata. */
export function agentesAgora(
  roster: readonly RosterEntry[],
): { id: string; nome: string; ponto: PontoDeAgente }[] {
  return roster
    .map((r, i) => ({ id: r.id, nome: r.def.name, ponto: pontoDoAgente(r.status), i }))
    .sort((a, b) => URGENCIA[a.ponto] - URGENCIA[b.ponto] || a.i - b.i)
    .slice(0, MAX_AGENTES_AGORA)
    .map((x) => ({ id: x.id, nome: x.nome, ponto: x.ponto }));
}
