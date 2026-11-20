import { expect, it, vi } from 'vitest';

const initialize = vi.fn();
vi.mock('mermaid', () => ({ default: { initialize, render: vi.fn().mockResolvedValue({ svg: '<svg/>' }) } }));

import { renderMermaid, TAMANHO_MINIMO_DO_ROTULO_C4 } from './mermaid-render';

it('RN-1495: o rótulo de relação do C4 fica em 12 px ou mais', async () => {
  await renderMermaid('x', 'C4Context');
  const cfg = initialize.mock.calls[0][0] as { c4: { messageFontSize: number } };
  expect(cfg.c4.messageFontSize).toBeGreaterThanOrEqual(12);
  expect(TAMANHO_MINIMO_DO_ROTULO_C4).toBe(12);
});
