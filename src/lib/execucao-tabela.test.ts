import { describe, expect, it } from 'vitest';
import type { Epic } from './api-types';
import type { RosterEntry } from './agent-status';
import { contarTarefas, ordenarExecutores, resolverVisao } from './execucao-tabela';

const r = (id: string, status: RosterEntry['status']) => ({ id, status, def: {} }) as unknown as RosterEntry;

describe('ordenarExecutores (RN-1467)', () => {
  it('lead, depois parados e esperando, depois trabalhando, depois ociosos', () => {
    const roster = [
      r('dev-a', 'ocioso'),
      r('dev-b', 'trabalhando'),
      r('dev-c', 'travado'),
      r('qa', 'trabalhando'),
      r('dev-d', 'aguardando'),
    ];
    expect(ordenarExecutores(roster, new Set(['qa'])).map((x) => x.id)).toEqual(['qa', 'dev-c', 'dev-d', 'dev-b', 'dev-a']);
  });
});

describe('resolverVisao (RN-1466)', () => {
  it('só "linha-do-tempo" muda a visão; qualquer outra coisa é Executores', () => {
    expect(resolverVisao('linha-do-tempo')).toBe('linha-do-tempo');
    expect(resolverVisao('x')).toBe('executores');
    expect(resolverVisao(undefined)).toBe('executores');
  });
});

describe('contarTarefas', () => {
  const tarefa = (status: string, extra = {}) => ({ status, blocked: false, archivedAt: null, ...extra });
  const epics = [{ stories: [{ tasks: [tarefa('done'), tarefa('todo'), tarefa('done', { archivedAt: 'x' })] }] }] as unknown as Epic[];
  it('conta feitas e total sem as arquivadas', () => expect(contarTarefas(epics)).toEqual({ feitas: 1, total: 2 }));
  it('sem backlog lido não afirma número', () => expect(contarTarefas(undefined)).toBeUndefined());
});
