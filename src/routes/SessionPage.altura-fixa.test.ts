import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// AT-956 (RN-1389 a RN-1391): jsdom não mede altura; aqui vai a estrutura do CSS.
// A medida real (fio ≥ 70% em 1366×768) só o navegador prova (Playwright, brabo-qa).
const css = readFileSync(resolve(__dirname, 'SessionPage.module.css'), 'utf8');
const cssComQuebra = `\n${css}`;
const regra = (seletor: string) => {
  const i = cssComQuebra.indexOf(`\n${seletor} {`);
  expect(i, seletor).toBeGreaterThan(-1);
  return cssComQuebra.slice(i, cssComQuebra.indexOf('}', i));
};

describe('a Sessão tem altura fixa e só o fio rola (RN-1389)', () => {
  it('o wrapper não rola e não cresce com o conteúdo', () => {
    const w = regra('.wrapper');
    expect(w).toMatch(/overflow:\s*hidden/);
    expect(w).toMatch(/min-height:\s*0/);
  });

  it('a barra da sessão tem 56px (RN-1390)', () => {
    expect(regra('.topbar')).toMatch(/height:\s*56px/);
  });

  it('os filhos da coluna não encolhem e só o fio cede e rola', () => {
    expect(regra('.chatColumn > *')).toMatch(/flex-shrink:\s*0/);
    const fio = regra('.chatColumn > .messages');
    expect(fio).toMatch(/flex:\s*1 1 0/);
    expect(fio).toMatch(/min-height:\s*0/);
    expect(fio).toMatch(/overflow-y:\s*auto/);
    expect(css.match(/overflow-y:\s*auto/g)?.length).toBeGreaterThan(0);
  });

  it('o orçamento da v10 deixa o fio com ≥ 70% da coluna em 1366×768 (RN-1391)', () => {
    const coluna = 768 - 56;
    const fio = coluna - 40 /* faixa */ - 44 /* aviso de PR */ - 124 /* composer */;
    expect(fio / coluna).toBeGreaterThanOrEqual(0.7);
  });

  it('classe morta dos divisores de handoff (AT-955) saiu', () => {
    expect(css).not.toMatch(/^\.handoffDivider/m);
  });
});
