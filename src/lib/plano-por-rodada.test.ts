import { describe, expect, it } from 'vitest';
import type { Epic } from './api-types';
import { planoPorRodada, rodadaAtual } from './plano-por-rodada';

const t = (id: string, status: string, dependeDe: string[] = [], extra: object = {}) =>
  ({ id, title: `T-${id}`, status, gateStatus: null, dependeDe, archivedAt: null, ...extra });
const epics = (tasks: object[]) => [{ stories: [{ tasks }] }] as unknown as Epic[];

describe('planoPorRodada (RN-1408 a RN-1410)', () => {
  it('quatro níveis viram quatro rodadas na ordem, com a etapa de cada lane', () => {
    const plano = planoPorRodada(
      epics([
        t('d', 'todo', ['c']),
        t('c', 'in_review', ['b'], { gateStatus: 'awaiting_qa' }),
        t('b', 'in_progress', ['a']),
        t('a', 'done'),
        t('x', 'in_review'),
      ]),
    );
    expect(plano.map((r) => r.nivel)).toEqual([1, 2, 3, 4]);
    expect(plano[0]!.lanes.map((l) => [l.id, l.etapa])).toEqual([['a', 'mergeada'], ['x', 'pronta']]);
    expect(plano[1]!.lanes[0]).toMatchObject({ id: 'b', etapa: 'implementando', esperaPor: [] });
    expect(plano[2]!.lanes[0]).toMatchObject({ id: 'c', etapa: 'noGate', esperaPor: [{ titulo: 'T-b', itens: [] }] });
    expect(plano[3]!.lanes[0]).toMatchObject({ id: 'd', etapa: 'espera', esperaPor: [{ titulo: 'T-c', itens: [] }] });
  });

  it('sem dependência, ou com tarefa arquivada, não há plano a mostrar', () => {
    expect(planoPorRodada(epics([t('a', 'todo'), t('b', 'todo')]))).toEqual([]);
    expect(planoPorRodada(epics([t('a', 'todo', ['z']), t('z', 'todo', [], { archivedAt: {} })]))).toEqual([]);
  });

  it('o agente vem da tarefa ou do módulo, e o que falta vem do levantamento', () => {
    const plano = planoPorRodada(
      epics([
        t('a', 'in_progress', [], { levantamento: { expoe: ['criarAcesso', 'outro'] } }),
        t('b', 'todo', ['a'], { module: 'web', levantamento: { consome: ['criarAcesso'] } }),
        t('c', 'todo', ['a'], { assignedTo: 'dev-api' }),
      ]),
    );
    expect(plano[1]!.lanes[0]).toMatchObject({ agente: 'dev-web', esperaPor: [{ titulo: 'T-a', itens: ['criarAcesso'] }] });
    expect(plano[1]!.lanes[1]).toMatchObject({ agente: 'dev-api', esperaPor: [{ titulo: 'T-a', itens: ['criarAcesso', 'outro'] }] });
  });

  it('a rodada atual é a primeira com lane por mergear', () => {
    expect(rodadaAtual(planoPorRodada(epics([t('a', 'done'), t('b', 'todo', ['a'])])))).toBe(1);
    expect(rodadaAtual(planoPorRodada(epics([t('a', 'done'), t('b', 'done', ['a'])])))).toBe(1);
  });
});
