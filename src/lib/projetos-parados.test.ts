import { afterEach, describe, expect, it } from 'vitest';
import {
  DIAS_PARADO,
  estaParado,
  guardarFiltroDoInicio,
  lerFiltroDoInicio,
} from './projetos-parados';

const AGORA = Date.parse('2026-11-19T12:00:00Z');
const dias = (n: number) => new Date(AGORA - n * 86_400_000).toISOString();
const card = (n: number | null) => ({
  lastEvent: n === null ? null : ({ createdAt: dias(n) } as never),
});

describe('estaParado (RN-1460)', () => {
  it('o limite é 30 dias, fixo: 30 ainda é ativo, 31 é parado', () => {
    expect(DIAS_PARADO).toBe(30);
    expect(estaParado({ createdAt: dias(400) }, card(30), AGORA)).toBe(false);
    expect(estaParado({ createdAt: dias(400) }, card(31), AGORA)).toBe(true);
  });

  it('sem resumo o projeto não é dado como parado', () => {
    expect(estaParado({ createdAt: dias(400) }, undefined, AGORA)).toBe(false);
  });

  it('sem evento nenhum vale a data de criação', () => {
    expect(estaParado({ createdAt: dias(2) }, card(null), AGORA)).toBe(false);
    expect(estaParado({ createdAt: dias(60) }, card(null), AGORA)).toBe(true);
  });
});

describe('filtro do Início guardado', () => {
  afterEach(() => localStorage.clear());

  it('o padrão é Ativos e a escolha sobrevive', () => {
    expect(lerFiltroDoInicio()).toBe('ativos');
    guardarFiltroDoInicio('parados');
    expect(lerFiltroDoInicio()).toBe('parados');
    localStorage.setItem('brabo.inicio.filtro', 'lixo');
    expect(lerFiltroDoInicio()).toBe('ativos');
  });
});
