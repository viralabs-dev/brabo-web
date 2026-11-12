import { describe, expect, it } from 'vitest';
import { tarefasBloqueadas, tarefasSemModulo } from './prontas-e-bloqueadas';
import type { Epic } from './api-types';

const tarefa = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  status: 'todo',
  blocked: false,
  module: null,
  archivedAt: null,
  ...extra,
});
const epicos = (moduleIds: string[], tasks: unknown[]) =>
  [{ stories: [{ moduleIds, tasks }] }] as unknown as Epic[];

describe('tarefasSemModulo (AT-912, RN-1085)', () => {
  it('lista a todo sem módulo em história de vários módulos', () => {
    const r = tarefasSemModulo(epicos(['a', 'b'], [tarefa('t1'), tarefa('t2', { module: 'a' })]));
    expect(r.map((t) => t.id)).toEqual(['t1']);
  });

  it('história de um só módulo, arquivada, bloqueada ou em curso não entram', () => {
    const ts = [tarefa('t1'), tarefa('t2', { archivedAt: '2026-11-11' }), tarefa('t3', { blocked: true }), tarefa('t4', { status: 'in_progress' })];
    expect(tarefasSemModulo(epicos(['a'], [tarefa('t1')]))).toEqual([]);
    expect(tarefasSemModulo(epicos(['a', 'b'], ts.slice(1)))).toEqual([]);
  });
});

describe('tarefasBloqueadas', () => {
  it('a bloqueada que foi arquivada sai da fila', () => {
    const r = tarefasBloqueadas(epicos([], [tarefa('t1', { blocked: true }), tarefa('t2', { blocked: true, archivedAt: '2026-11-11' })]));
    expect(r.map((t) => t.id)).toEqual(['t1']);
  });
});
