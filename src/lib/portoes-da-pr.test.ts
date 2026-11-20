import { describe, expect, it } from 'vitest';
import { portoesDaPr } from './portoes-da-pr';

const t = (o: object) => ({ status: 'in_progress' as const, gateStatus: null, blocked: false, ...o });
const estados = (r: ReturnType<typeof portoesDaPr>) => r?.portoes.map((p) => p.estado);

describe('portoesDaPr (AT-971, RN-1474)', () => {
  it('sem tarefa não há portão a mostrar: a tela não afirma o que não leu', () => {
    expect(portoesDaPr(undefined, false)).toBeNull();
  });

  it('QA em curso: D verde, Q em curso, S e V pendentes, sem Merge', () => {
    const r = portoesDaPr(t({ gateStatus: 'awaiting_qa' }), false);
    expect(estados(r)).toEqual(['done', 'current', 'pending', 'pending']);
    expect(r?.verdes).toBe(false);
  });

  it('QA falho (tarefa bloqueada): Q fica bloqueado', () => {
    expect(estados(portoesDaPr(t({ gateStatus: 'awaiting_qa', blocked: true }), false))).toEqual([
      'done', 'blocked', 'pending', 'pending',
    ]);
  });

  it('SecOps em curso: D e Q verdes', () => {
    expect(estados(portoesDaPr(t({ gateStatus: 'awaiting_secops' }), false))).toEqual([
      'done', 'done', 'current', 'pending',
    ]);
  });

  it('D, Q e S verdes liberam o Merge e V fica à espera do gesto humano', () => {
    const r = portoesDaPr(t({ gateStatus: 'awaiting_user' }), false);
    expect(estados(r)).toEqual(['done', 'done', 'done', 'current']);
    expect(r?.verdes).toBe(true);
  });

  it('PR mesclada: os quatro verdes', () => {
    const r = portoesDaPr(t({ gateStatus: 'awaiting_qa' }), true);
    expect(estados(r)).toEqual(['done', 'done', 'done', 'done']);
    expect(r?.verdes).toBe(true);
  });
});
