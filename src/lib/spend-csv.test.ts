import { describe, expect, it } from 'vitest';
import { custoMedioPorChamada, densificarPorAgente, diasDoMesUtc, linhasParaCsv } from './spend';

describe('série por agente (RN-1153)', () => {
  const hoje = new Date('2026-11-12T10:00:00Z');
  it('densifica o esparso com zero e uma coluna por agente', () => {
    const { agentes, dados } = densificarPorAgente(
      [{ dia: '2026-11-11', agente: 'po', costMicros: 5, chamadas: 1 }],
      3,
      hoje,
    );
    expect(agentes).toEqual(['po']);
    expect(dados.map((d) => [d.dia, d.po])).toEqual([
      ['2026-11-10', 0],
      ['2026-11-11', 5],
      ['2026-11-12', 0],
    ]);
  });
  it('sem linhas não há agente, só os dias', () => {
    expect(densificarPorAgente([], 2, hoje).agentes).toEqual([]);
  });
  it('mês é o dia do mês em UTC', () => {
    expect(diasDoMesUtc(hoje)).toBe(12);
  });
});

describe('custo médio e CSV de gastos (AT-896)', () => {
  it('divide o total pelas chamadas', () => {
    expect(custoMedioPorChamada(1_400_000, 1000)).toBe(1400);
  });
  it('sem chamada não há média', () => {
    expect(custoMedioPorChamada(0, 0)).toBeNull();
  });
  it('escapa aspas e usa CRLF', () => {
    expect(linhasParaCsv(['a', 'b'], [['x"y', 2]])).toBe('"a","b"\r\n"x""y","2"');
  });
});
