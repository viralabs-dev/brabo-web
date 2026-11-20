import type { Task } from './api-types';
import { gatePendenteNoMerge } from './gate-do-merge';

export type EstadoDoPortao = 'done' | 'current' | 'blocked' | 'pending';
export type ChaveDoPortao = 'dev' | 'qa' | 'secops' | 'user';

/**
 * Os quatro portões de uma PR (D, Q, S, V) em linha (AT-971, RN-1474), lidos da
 * TAREFA por trás da branch (`gateStatus`/`blocked`), nunca inventados: sem
 * tarefa (PR de infra ou aberta à mão) a função devolve `null` e a tela não
 * mostra portão nenhum. `verdes` é o que libera o "Merge": D, Q e S passados e
 * a tarefa sem bloqueio. PR já mesclada tem os quatro verdes.
 */
export function portoesDaPr(
  task: Pick<Task, 'status' | 'gateStatus' | 'blocked'> | undefined,
  mesclada: boolean,
): { portoes: { chave: ChaveDoPortao; estado: EstadoDoPortao }[]; verdes: boolean } | null {
  if (!task) return null;
  if (mesclada) {
    return {
      portoes: (['dev', 'qa', 'secops', 'user'] as const).map((chave) => ({ chave, estado: 'done' })),
      verdes: true,
    };
  }
  const pendente = gatePendenteNoMerge(task);
  const falha = (): EstadoDoPortao => (task.blocked ? 'blocked' : 'current');
  const qa: EstadoDoPortao = pendente === 'qa-verificada' ? falha() : 'done';
  const secops: EstadoDoPortao =
    pendente === 'qa-verificada' ? 'pending' : pendente === 'secops-segura' ? falha() : 'done';
  const verdes = pendente === null && !task.blocked;
  const user: EstadoDoPortao = verdes ? 'current' : pendente === null ? 'blocked' : 'pending';
  return {
    portoes: [
      { chave: 'dev', estado: 'done' },
      { chave: 'qa', estado: qa },
      { chave: 'secops', estado: secops },
      { chave: 'user', estado: user },
    ],
    verdes,
  };
}
