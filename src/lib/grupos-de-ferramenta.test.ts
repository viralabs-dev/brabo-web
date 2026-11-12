import { describe, expect, it } from 'vitest';
import { agruparPorIntencao, GRUPO_DA_FERRAMENTA, grupoDaFerramenta, maisUsadas } from './grupos-de-ferramenta';
import { FERRAMENTAS_CONHECIDAS } from './narracao-de-ferramentas';
import { custoDoPayload, formatarCusto, gravadoDoPayload } from './resumo-de-turno';

describe('grupos de ferramenta (RN-1185)', () => {
  it('toda ferramenta conhecida tem grupo, e só elas', () => {
    expect(Object.keys(GRUPO_DA_FERRAMENTA).sort()).toEqual([...FERRAMENTAS_CONHECIDAS].sort());
  });
  it('ferramenta desconhecida cai em outros e nunca some; a soma é o total', () => {
    const itens = [{ tool: 'listar_backlog' }, { tool: 'read_file' }, { tool: 'create_epic' }];
    expect(grupoDaFerramenta('read_file')).toBe('outros');
    const g = agruparPorIntencao(itens);
    expect(g.map((x) => x.grupo)).toEqual(['leu', 'registrou', 'outros']);
    expect(g.reduce((s, x) => s + x.itens.length, 0)).toBe(3);
  });
  it('mais usadas', () => {
    expect(maisUsadas([{ tool: 'a' }, { tool: 'b' }, { tool: 'b' }])[0]).toEqual({ tool: 'b', vezes: 2 });
  });
  it('evento sem campos novos dá traço, nunca zero', () => {
    expect(formatarCusto(custoDoPayload({}))).toBe('—');
    expect(custoDoPayload({ custoMicros: 500000 })).toBe(0.5);
    expect(gravadoDoPayload({})).toBeNull();
  });
});
