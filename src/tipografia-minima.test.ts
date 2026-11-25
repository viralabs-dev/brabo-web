import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AT-977: nenhum texto abaixo de 11 px (piso `--fs-label`) e nenhum
 * `font-size` literal de 11 a 14 px fora dos tokens `--fs-*`.
 */
function modulos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? modulos(p) : p.endsWith('.module.css') ? [p] : [];
  });
}

/** Declarações `font-size` em px que violam o piso ou a regra dos tokens. */
export function violacoes(css: string): string[] {
  const limpo = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return (limpo.match(/font-size:\s*[0-9.]+px/g) ?? []).filter((d) => parseFloat(d.split(':')[1]) <= 14.5);
}

describe('tipografia mínima (AT-977)', () => {
  it('o detector pega 10px e 13px e deixa token e 16px', () => {
    expect(violacoes('a{font-size:10px}')).toHaveLength(1);
    expect(violacoes('a{font-size: 13px}')).toHaveLength(1);
    expect(violacoes('a{font-size:var(--fs-label)} b{font-size:16px} /* font-size: 9px */')).toHaveLength(0);
  });

  it('nenhum .module.css tem font-size literal abaixo de 15 px', () => {
    const ruins = modulos(join(__dirname)).flatMap((arq) =>
      violacoes(readFileSync(arq, 'utf8')).map((v) => `${arq}: ${v}`),
    );
    expect(ruins).toEqual([]);
  });
});
