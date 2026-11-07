import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * O token do GitHub Packages nunca entra em camada (RN-1039, ADR 0270): o `pnpm install` do
 * Dockerfile lê o `.npmrc` de um secret do BuildKit, o `.npmrc` do repo só nomeia o registry
 * do escopo, e todo build de imagem do CI e do release passa o secret.
 */
const ler = (f: string) => readFileSync(resolve(process.cwd(), f), 'utf8');

describe('token do registry (RN-1039)', () => {
  it('o pnpm install do Dockerfile usa o secret npmrc do BuildKit', () => {
    const docker = ler('Dockerfile');
    expect(docker).toMatch(/RUN --mount=type=secret,id=npmrc,target=\/root\/\.npmrc pnpm install --frozen-lockfile/);
  });

  it('nenhum ARG nem ENV do Dockerfile carrega token ou npmrc', () => {
    const linhas = ler('Dockerfile')
      .split('\n')
      .filter((l) => /^\s*(ARG|ENV)\b/.test(l));
    for (const l of linhas) expect(l).not.toMatch(/token|npmrc|NODE_AUTH/i);
  });

  it('o .npmrc do repo só diz o registry do escopo, sem token', () => {
    const npmrc = ler('.npmrc').trim();
    expect(npmrc).toBe('@viralabs-dev:registry=https://npm.pkg.github.com');
  });

  it('o CI e o release passam o secret em todo build de imagem', () => {
    const ci = ler('.github/workflows/ci.yml');
    expect(ci).toMatch(/docker build .*--secret id=npmrc,src=/);
    expect(ci).toMatch(/secret-files: \|\n\s+npmrc=/);
    expect(ler('.github/workflows/release.yml')).toMatch(/secret-files: \|\n\s+npmrc=/);
  });
});
