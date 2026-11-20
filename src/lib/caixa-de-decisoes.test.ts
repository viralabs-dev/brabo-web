import { describe, expect, it } from 'vitest';
import { MAX_TITULO, detalheDoPlano, tituloDoPlano } from './caixa-de-decisoes';
import { fraseDaAcao } from './aprovacoes';

describe('tituloDoPlano (AT-1007, RN-1490)', () => {
  it('monta "Plano de execução do ‹lead›: N dev agents, um por módulo" do payload', () => {
    expect(tituloDoPlano('propose_execution_plan', { modulos: ['a', 'b', 'c'] }, 'Dev Lead')).toBe(
      'Plano de execução do Dev Lead: 3 dev agents, um por módulo',
    );
    expect(tituloDoPlano('propose_execution_plan', { modulos: ['a'] }, 'Dev Lead')).toContain('1 dev agent,');
  });

  it('não é plano, ou o payload não traz os módulos: null', () => {
    expect(tituloDoPlano('terminal', { modulos: ['a'] }, 'Dev Lead')).toBeNull();
    expect(tituloDoPlano('propose_execution_plan', {}, 'Dev Lead')).toBeNull();
  });

  it('nunca passa de 80 caracteres', () => {
    expect(tituloDoPlano('propose_execution_plan', { modulos: ['a'] }, 'L'.repeat(200))!.length).toBeLessThanOrEqual(MAX_TITULO);
  });

  it('a linha de baixo não repete o título', () => {
    const payload = { modulos: ['a', 'b'], totalAgentes: 2, resumo: 'dois módulos' };
    const frase = fraseDaAcao('propose_execution_plan', payload)!;
    const titulo = tituloDoPlano('propose_execution_plan', payload, 'Dev Lead')!;
    const detalhe = detalheDoPlano(frase);
    expect(frase).toContain('sobe 2 dev agents, um por módulo');
    expect(detalhe).not.toContain('um por módulo');
    expect(detalhe).not.toBe(titulo);
    expect(detalhe).toMatch(/dois módulos/i);
  });

  it('a linha de baixo mantém o aviso de paralelização, sem os parênteses', () => {
    const frase = fraseDaAcao('propose_execution_plan', { modulos: ['a', 'b'], totalAgentes: 5 })!;
    expect(frase).toContain('(o plano pede 5 agentes');
    expect(detalheDoPlano(frase)).toMatch(/^O plano pede 5 agentes; os 3 a mais só sobem se você aceitar paralelizar depois\. E ATIVA a execução/);
  });
});
