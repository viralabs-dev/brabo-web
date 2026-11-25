import { describe, expect, it } from 'vitest';
import type { SessionEvent } from './api-types';
import { partesDaChave, respostaDaOferta } from './automacao-oferta';

const ev = (seq: number, type: string, payload: object) => ({ seq, type, payload }) as unknown as SessionEvent;

describe('respostaDaOferta (RN-1442)', () => {
  const oferta = ev(1, 'automacao.oferecida', { categoria: 'aprovacao', chave: 'git_commit@dev' });
  it('pendente sem resposta, e a resposta de outra chave não conta', () => {
    expect(respostaDaOferta([oferta], oferta)).toBe('pendente');
    expect(respostaDaOferta([oferta, ev(2, 'automacao.aceita', { categoria: 'aprovacao', chave: 'outra@dev' })], oferta)).toBe('pendente');
  });
  it('aceita e recusada pelos eventos seguintes', () => {
    expect(respostaDaOferta([oferta, ev(2, 'automacao.aceita', { categoria: 'aprovacao', chave: 'git_commit@dev' })], oferta)).toBe('aceita');
    expect(respostaDaOferta([oferta, ev(2, 'automacao.recusada', { categoria: 'aprovacao', chave: 'git_commit@dev' })], oferta)).toBe('recusada');
  });
  it('separa a chave de aprovação em tipo e agente', () => {
    expect(partesDaChave('git_commit@dev')).toEqual({ acao: 'git_commit', agente: 'dev' });
  });
});
