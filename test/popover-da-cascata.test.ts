import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * O Popover da cascata usa a fonte do texto, não a mono (AT-1005, L09); só o
 * identificador do modelo fica em mono. Sob jsdom o CSS Modules não vira estilo
 * computado, então a prova é sobre a folha: a regra existe e o id é a exceção.
 */
const css = readFileSync(resolve(__dirname, '../src/routes/ProjectSettingsTab.module.css'), 'utf8');

describe('Popover da cascata — fonte do texto', () => {
  it('o conteúdo do Popover, a cadeia, os níveis e os Badges usam --font-body', () => {
    expect(css).toMatch(/\.cadeiaNoPopover\s*\{[^}]*font-family:\s*var\(--font-body\)/);
    const regra = css.match(/\.cadeiaNoPopover \.cadeia,[^{]*\{([^}]*)\}/);
    expect(regra?.[0]).toContain('.cadeiaNoPopover .nivel');
    expect(regra?.[0]).toContain("[data-slot='badge']");
    expect(regra?.[1]).toMatch(/font-family:\s*var\(--font-body\)/);
  });

  it('só o identificador do modelo fica em mono', () => {
    expect(css).toMatch(/\.idDoModelo\s*\{[^}]*font-family:\s*var\(--font-mono\)/);
  });
});
