import { describe, expect, it } from 'vitest';
import { custoMedioPorChamada, linhasParaCsv } from './spend';

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
