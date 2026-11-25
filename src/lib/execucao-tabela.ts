import type { Epic } from './api-types';
import type { RosterEntry } from './agent-status';
import { estadoDaTarefa } from './execution';

/** AT-970 (RN-1466): as duas visões da aba Execução; a escolha vai para a URL (`?visao=`). */
export type VisaoDaExecucao = 'executores' | 'linha-do-tempo';

export function resolverVisao(valor: unknown): VisaoDaExecucao {
  return valor === 'linha-do-tempo' ? 'linha-do-tempo' : 'executores';
}

/**
 * AT-970 (RN-1467): lead primeiro; depois quem parou ou espera por você; depois quem trabalha;
 * por fim os ociosos. Estável: dentro de cada faixa vale a ordem do roster.
 */
export function ordenarExecutores(roster: RosterEntry[], leads: ReadonlySet<string>): RosterEntry[] {
  const faixa = (r: RosterEntry) =>
    leads.has(r.id) ? 0 : r.status === 'trabalhando' ? 2 : r.status === 'ocioso' ? 3 : 1;
  return roster
    .map((r, i) => ({ r, i }))
    .sort((a, b) => faixa(a.r) - faixa(b.r) || a.i - b.i)
    .map(({ r }) => r);
}

/** "N de M": só as tarefas vivas (as arquivadas não contam); `undefined` quando o backlog não foi lido. */
export function contarTarefas(epics: readonly Epic[] | undefined): { feitas: number; total: number } | undefined {
  if (!epics) return undefined;
  const vivas = epics.flatMap((e) => e.stories.flatMap((s) => s.tasks.filter((t) => !t.archivedAt)));
  return { feitas: vivas.filter((t) => estadoDaTarefa(t) === 'done').length, total: vivas.length };
}
