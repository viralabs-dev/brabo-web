import { describe, expect, it } from 'vitest';
import { cadeiaDeAgentes } from './contexto-da-sessao';
import type { SessionEvent } from './api-types';

const e = (seq: number, kind: string, id: string) =>
  ({ seq, type: 'x', payload: {}, actor: { kind, id } }) as unknown as SessionEvent;
const nome = (id: string) => (id === 'criativo' ? 'Criativo' : id === 'po' ? 'PO' : null);

describe('cadeiaDeAgentes (AT-892)', () => {
  it('na ordem da primeira fala, sem repetir e sem humanos', () => {
    const ev = [e(3, 'agent', 'po'), e(1, 'agent', 'criativo'), e(2, 'user', 'u1'), e(4, 'agent', 'criativo')];
    expect(cadeiaDeAgentes(ev, nome)).toEqual(['Criativo', 'PO']);
  });
  it('sem agentes, cadeia vazia', () => {
    expect(cadeiaDeAgentes([e(1, 'user', 'u1')], nome)).toEqual([]);
  });
});
