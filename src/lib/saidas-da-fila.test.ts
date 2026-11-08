import { describe, expect, it } from 'vitest';
import { entradasDaFila, saidasDaFila, tituloEDiagnostico, type IdsPorFila } from './saidas-da-fila';

const vazio: IdsPorFila = { perguntas: [], aprovacoes: [], merges: [], prontas: [], bloqueadas: [] };

describe('saidasDaFila (AT-753, UX-7)', () => {
  it('conta o que estava na leitura anterior e não está na atual, por fila', () => {
    const antes = { ...vazio, prontas: ['1', '2'], perguntas: ['q1'] };
    const depois = { ...vazio, prontas: ['2'], perguntas: [] };
    expect(saidasDaFila(antes, depois)).toEqual({ prontas: 1, perguntas: 1 });
  });
  it('o que entrou não é saída, e leitura igual não diz nada', () => {
    expect(saidasDaFila(vazio, { ...vazio, prontas: ['3'] })).toEqual({});
    expect(saidasDaFila({ ...vazio, merges: ['a'] }, { ...vazio, merges: ['a'] })).toEqual({});
  });
  it('não anuncia o que foi decidido nesta tela', () => {
    const antes = { ...vazio, perguntas: ['q1', 'q2'] };
    expect(saidasDaFila(antes, vazio, new Set(['q1']))).toEqual({ perguntas: 1 });
    expect(saidasDaFila(antes, vazio, new Set(['q1', 'q2']))).toEqual({});
  });
});

describe('tituloEDiagnostico (AT-753, UX-9, P4)', () => {
  it('corta no primeiro " — "', () => {
    expect(tituloEDiagnostico('Falta o validador — causa — mais')).toEqual({
      titulo: 'Falta o validador',
      diagnostico: 'causa — mais',
    });
  });
  it('sem separador, o texto curto é o título e não há diagnóstico', () => {
    expect(tituloEDiagnostico('ciclo esgotado')).toEqual({ titulo: 'ciclo esgotado', diagnostico: null });
  });
  it('sem separador e longo, o título é cortado e o texto inteiro vira o diagnóstico', () => {
    const longo = 'x'.repeat(300);
    const r = tituloEDiagnostico(longo);
    expect(r.titulo).toHaveLength(120);
    expect(r.titulo.endsWith('…')).toBe(true);
    expect(r.diagnostico).toBe(longo);
  });
});

describe('entradasDaFila (AT-810, RN-1063)', () => {
  it('na primeira leitura tudo conta como novo', () => {
    expect(entradasDaFila(null, ['1', '2'])).toEqual(['1', '2']);
  });
  it('só o id novo entra', () => {
    expect(entradasDaFila(['1'], ['1', '3'])).toEqual(['3']);
  });
  it('o id que já estava não é entrada, e o que saiu também não', () => {
    expect(entradasDaFila(['1', '2'], ['1'])).toEqual([]);
    expect(entradasDaFila(['1'], ['1'])).toEqual([]);
  });
});
