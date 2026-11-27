import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// ADR 0250: o chat da Sessão ocupa a largura inteira, sem coluna de 780px.
describe('largura do chat da Sessão (ADR 0250)', () => {
  it.each(['SessionPage.module.css', '../components/PendenciasDeOutrasSessoes.module.css'])(
    '%s não tem max-width: 780px',
    (arquivo) => {
      const css = readFileSync(resolve(__dirname, arquivo), 'utf8');
      expect(css).not.toMatch(/max-width:\s*780px/);
    },
  );
});

// RN-1407: o trilho de turnos cabe no padding do fio, sem criar rolagem horizontal.
describe('trilho de turnos dentro do padding do fio (RN-1407)', () => {
  it('.trilho não passa do padding lateral (right: -var(--space-4), sem px extra)', () => {
    const css = readFileSync(resolve(__dirname, 'SessionPage.module.css'), 'utf8');
    const regra = css.match(/\.trilho\s*\{[^}]*\}/)?.[0] ?? '';
    expect(regra).toMatch(/right:\s*calc\(-1 \* var\(--space-4\)\);/);
  });
});
