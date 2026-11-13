import { describe, expect, it } from 'vitest';

/**
 * AT-938: a Visão geral mostrava as chaves cruas `faixa.titulo`,
 * `faixa.verTodas` e `activity.verEventos` porque o `t()` as pedia e o
 * catálogo `overview` não as tinha. Esta régua lê o CÓDIGO dos componentes
 * que usam o namespace `overview` e reprova cada `t('…')` sem chave em
 * nenhum dos quatro locales (plural `_zero`/`_one`/`_other` conta como
 * presente).
 */
const fontes = import.meta.glob<string>(
  ['../components/FaixaPrecisaDeVoce.tsx', '../routes/ProjectOverviewTab.tsx'],
  { query: '?raw', import: 'default', eager: true },
);
const catalogos = import.meta.glob<{ default: Arvore }>('../locales/*/overview.json', {
  eager: true,
});

type Arvore = { [chave: string]: unknown };

const CHAVE_USADA = /\bt\(\s*['"]([^'"]+)['"]/g;
const SUFIXOS_DE_PLURAL = ['_zero', '_one', '_other'];

function chavesUsadas(codigo: string): string[] {
  return [...codigo.matchAll(CHAVE_USADA)].map((m) => m[1]);
}

function existe(arvore: Arvore, chave: string): boolean {
  const partes = chave.split('.');
  const folha = partes.pop() ?? '';
  let no: unknown = arvore;
  for (const parte of partes) {
    if (!no || typeof no !== 'object') return false;
    no = (no as Arvore)[parte];
  }
  if (!no || typeof no !== 'object') return false;
  const ultimo = no as Arvore;
  return (
    typeof ultimo[folha] === 'string' ||
    SUFIXOS_DE_PLURAL.some((s) => typeof ultimo[folha + s] === 'string')
  );
}

function ausentes(codigos: Record<string, string>, catalogo: Arvore): string[] {
  const usadas = Object.values(codigos).flatMap(chavesUsadas);
  return [...new Set(usadas.filter((chave) => !existe(catalogo, chave)))];
}

describe('chaves do namespace overview usadas pela Visão geral (AT-938)', () => {
  for (const [caminho, modulo] of Object.entries(catalogos)) {
    const lng = caminho.split('/').at(-2) ?? caminho;
    it(`${lng}: toda chave t() dos componentes existe no catálogo`, () => {
      expect(ausentes(fontes, modulo.default)).toEqual([]);
    });
  }

  it('a régua acusa a chave ausente e aceita a que existe (plural incluso)', () => {
    const catalogo: Arvore = { faixa: { titulo: 'x' }, activity: { count_other: 'y' } };
    expect(
      ausentes(
        {
          a: "t('faixa.titulo'); t('faixa.verTodas'); t('activity.count', { count })",
          b: 'tp(\'faixa.naoEhDoOverview\')',
        },
        catalogo,
      ),
    ).toEqual(['faixa.verTodas']);
  });
});
