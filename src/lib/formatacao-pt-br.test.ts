import { readFileSync } from 'node:fs';
import { describe, it, expect, afterAll } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import i18n from './i18n';
import { formatMicros } from './execution';
import { dolar } from './executores-ao-vivo';
import { formatarCusto } from './resumo-de-turno';
import { Snippet } from '../components/ai-elements/snippet';

const sem = (s: string) => s.replace(/ /g, ' ');

afterAll(() => {
  void i18n.changeLanguage('en');
});

describe('moeda e número seguem o idioma da interface (RN-1484)', () => {
  it('pt-BR: vírgula decimal com 4 casas', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(sem(formatMicros(979_000))).toBe('US$ 0,9790');
    expect(sem(dolar(979_000))).toBe('US$ 0,9790');
    expect(sem(formatarCusto(0.979))).toBe('US$ 0,9790');
  });

  it('en: ponto decimal com 4 casas', async () => {
    await i18n.changeLanguage('en');
    expect(formatMicros(979_000)).toBe('$0.9790');
    expect(dolar(979_000)).toBe('$0.9790');
    expect(formatarCusto(0.979)).toBe('$0.9790');
  });

  it('{{count, number}} põe o separador de milhar do idioma (RN-1485)', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(i18n.t('notificationBell.atividade.eventos', { ns: 'shell', count: 8404 })).toBe('8.404 eventos');
    await i18n.changeLanguage('en');
    expect(i18n.t('notificationBell.atividade.eventos', { ns: 'shell', count: 8404 })).toContain('8,404');
  });
});

describe('copiar com texto e borda do tema (RN-102, RN-1486)', () => {
  it('o Snippet mostra o rótulo, não só o aria-label', async () => {
    await i18n.changeLanguage('pt-BR');
    render(createElement(Snippet, { texto: 'make dev', rotulo: 'Copiar', rotuloCopiado: 'Copiado' }));
    expect(screen.getByRole('button', { name: 'Copiar' }).textContent).toBe('Copiar');
  });

  it('o shadcn.css põe a borda sem cor no token do tema', () => {
    const css = readFileSync('src/shadcn.css', 'utf8');
    expect(css).toMatch(/@layer base\s*{\s*\*,\s*::before,\s*::after\s*{\s*border-color:\s*var\(--border\);/);
  });
});
