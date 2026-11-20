import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import { Canvas } from './canvas';
import { CONTROLES, FONTE_MIN_DO_NO, grafoDe } from './canvas.helpers';

await i18n.changeLanguage('pt-BR');

const modulos = [
  { name: 'api', stack: 'NestJS', dependsOn: ['db', 'fantasma'] },
  { name: 'db', stack: 'Postgres', dependsOn: [] },
];

describe('Canvas (AT-684)', () => {
  it('deriva nós e arestas do module_map, ignorando dependência inexistente', () => {
    const { nos, arestas } = grafoDe(modulos);
    expect(nos.map((n) => n.id)).toEqual(['api', 'db']);
    expect(arestas.map((a) => a.id)).toEqual(['api->db']);
    // v11 (AT-972): fluxo da esquerda para a direita; quem não depende de ninguém (db) fica à direita.
    expect(nos[0]!.position.x).toBeLessThan(nos[1]!.position.x);
    expect(nos[0]!.sourcePosition).toBe('right');
    expect(nos[0]!.targetPosition).toBe('left');
  });

  it('mostra texto no estado vazio', () => {
    render(<Canvas modulos={[]} />);
    expect(screen.getByText('Sem módulos para desenhar o grafo.')).toBeTruthy();
  });

  it('o texto dos nós tem 12,5 px ou mais (zoom inicial 1)', () => {
    const { nos } = grafoDe(modulos);
    for (const n of nos) {
      expect(FONTE_MIN_DO_NO).toBeGreaterThanOrEqual(12.5);
      expect(n.style!.fontSize as number).toBeGreaterThanOrEqual(12.5);
    }
  });

  it('o grafo tem 300 px de altura (420 px com altura útil acima de 1000 px) e o botão "Ajustar à largura"', () => {
    class RO { observe() {} unobserve() {} disconnect() {} }
    vi.stubGlobal('ResizeObserver', RO);
    const { container } = render(<Canvas modulos={modulos} />);
    const cls = container.querySelector('[data-slot="ai-canvas"]')!.className;
    expect(cls).toContain('h-[300px]');
    expect(cls).toContain('min-height:1000px');
    expect(screen.getByRole('button', { name: 'Ajustar à largura' })).toBeTruthy();
  });

  it('colore pelos tokens, nunca por hex', () => {
    const valores = [...Object.values(CONTROLES), ...grafoDe(modulos).nos.map((n) => n.style!.background as string)];
    for (const v of valores) expect(String(v)).toMatch(/^var\(--/);
  });
});
