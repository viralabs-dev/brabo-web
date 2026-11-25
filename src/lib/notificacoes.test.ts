import { describe, expect, it } from 'vitest';
import { agruparAtividade, itensQuePrecisamDeVoce, totalQuePrecisaDeVoce } from './notificacoes';
import type { DecisionInbox } from './api-types';

const vazia = { total: 0, truncada: false, itens: [] };
const acao = (id: string, actionType: string, payload: object) => ({
  projectId: 'p', projectName: 'Acme',
  acao: { id, sessionId: 's', actionType, payload, actor: { kind: 'agent', id: 'dev-api' }, createdAt: '2026-01-01T00:00:00Z' },
});
const inbox = {
  filas: {
    aprovacoes: { total: 51, truncada: true, itens: [acao('a1', 'terminal', { command: 'cd /x && pnpm test' })] },
    prs: vazia,
    promocoes: { total: 1, truncada: false, itens: [{ projectId: 'p', projectName: 'Acme', storyId: 'h1', titulo: 'Login', desde: '2026-01-01T00:00:00Z', decididaEm: null }] },
    arquitetura: vazia, hipoteses: vazia,
  },
} as unknown as DecisionInbox;

describe('notificacoes (AT-966)', () => {
  it('o total do selo é o total real das filas, não o tamanho da lista cortada', () => {
    expect(totalQuePrecisaDeVoce(inbox)).toBe(52);
    expect(totalQuePrecisaDeVoce(undefined)).toBe(0);
  });
  it('lista as filas da Caixa com título curto', () => {
    const itens = itensQuePrecisamDeVoce(inbox, 'Terminal');
    expect(itens.map((i) => [i.fila, i.sujeito, i.motivo])).toEqual([
      ['aprovacoes', 'dev-api', 'Terminal · pnpm'],
      ['promocoes', 'Login', null],
    ]);
  });
  it('projeto sem eventos carregados nunca é dado como parado', () => {
    const r = agruparAtividade([{ projectId: 'p', projectName: 'A', unreadCount: 3, events: [] }]);
    expect(r.recentes).toHaveLength(1);
    expect(r.parados.projetos).toBe(0);
  });
});
