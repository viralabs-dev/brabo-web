import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Checkbox } from '../shadcn/checkbox';

// AT-1010 (RN-1499, RN-1500, RN-1501): alvo de clique com pelo menos 24 px (WCAG 2.2, 2.5.8).
const css = (arquivo: string) => readFileSync(new URL(arquivo, import.meta.url), 'utf8');

describe('alvos de 24 px', () => {
  it('o Checkbox tem alvo de 24 px, caixa visível de 16 px e margem que não cresce a linha (RN-1500)', () => {
    render(<Checkbox aria-label="marcar" />);
    const cls = screen.getByRole('checkbox').className;
    expect(cls).toContain('size-6');
    expect(cls).toContain('before:size-4');
    expect(cls).toContain('-m-1');
  });

  it.each([
    ['BotaoLink', './BotaoLink.module.css'],
    ['lista de executores', '../../routes/TabelaDeExecutores.module.css'],
    ['Próximo passo', '../ProximoPasso.module.css'],
    ['Entregável', '../EntregavelPreview.module.css'],
    ['Caixa de decisões', '../CaixaDeDecisoes.module.css'],
    ['Visão geral', '../../routes/ProjectOverviewTab.module.css'],
  ])('%s declara min-height de 24px (RN-1499)', (_n, arquivo) => {
    expect(css(arquivo)).toMatch(/min-height:\s*24px/);
  });

  it('a busca e o Blame do editor têm 24 px (RN-1501)', () => {
    const c = css('../../routes/code/CodeEditor.module.css');
    expect(c).not.toMatch(/height:\s*22px/);
    expect(c.match(/height:\s*24px/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
