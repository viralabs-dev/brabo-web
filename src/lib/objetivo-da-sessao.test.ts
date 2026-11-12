import { describe, expect, it } from 'vitest';
import { objetivoDaSessao } from './contexto-da-sessao';
import type { SessionEvent } from './api-types';

const ev = (seq: number, type: string, payload: unknown) =>
  ({ seq, type, payload }) as unknown as SessionEvent;

describe('objetivoDaSessao (AT-892)', () => {
  it('usa o summary do brief mais recente', () => {
    const e = [
      ev(1, 'artifact.product_brief', { summary: 'velho' }),
      ev(5, 'artifact.product_brief', { summary: 'novo' }),
    ];
    expect(objetivoDaSessao(e)).toBe('novo');
  });
  it('sem brief, nada (a seção sai)', () => {
    expect(objetivoDaSessao([ev(1, 'chat.message', {})])).toBeNull();
  });
});
