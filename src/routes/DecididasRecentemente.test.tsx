import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DecididasRecentemente } from './DecididasRecentemente';
import type { ProposedAction } from '../lib/api-types';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const getProjectPendingActions = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return { ...original, getProjectPendingActions: (...a: unknown[]) => getProjectPendingActions(...a) };
});

function acao(over: Partial<ProposedAction>): ProposedAction {
  return {
    id: 'a1',
    projectId: 'p1',
    sessionId: 's1',
    seq: 1,
    actionType: 'terminal',
    payload: {},
    status: 'auto_approved',
    resolvedPolicy: 'auto_approve',
    actor: { kind: 'agent', id: 'qa' },
    decidedBy: null,
    decidedAt: '2026-11-12T10:00:00.000Z',
    rejectionReason: null,
    executionResult: null,
    createdAt: '2026-11-12T09:00:00.000Z',
    updatedAt: '2026-11-12T10:00:00.000Z',
    ...over,
  };
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DecididasRecentemente projectId="p1" />
    </QueryClientProvider>,
  );
}

describe('DecididasRecentemente (RN-1225)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista a aprovação automática com a origem "pela política" e pede status=decided com since', async () => {
    getProjectPendingActions.mockResolvedValue([
      acao({}),
      acao({ id: 'a2', status: 'denied', rejectionReason: 'fora do escopo' }),
    ]);
    montar();
    expect(await screen.findAllByTestId('acao-decidida')).toHaveLength(2);
    expect(screen.getByText('auto · política')).toBeTruthy();
    expect(screen.getByText(/fora do escopo/)).toBeTruthy();
    const opts = getProjectPendingActions.mock.calls[0][1];
    expect(opts.status).toBe('decided');
    expect(typeof opts.since).toBe('string');
  });

  it('24h: mostra as 2 mais novas e colapsa o resto das automáticas em "N decisões automáticas anteriores"', async () => {
    getProjectPendingActions.mockResolvedValue([
      acao({ id: 'a1' }),
      acao({ id: 'a2' }),
      acao({ id: 'a3' }),
      acao({ id: 'a4' }),
      acao({ id: 'a5', status: 'denied', rejectionReason: 'x' }),
    ]);
    montar();
    expect(await screen.findAllByTestId('acao-decidida')).toHaveLength(3);
    expect(screen.getByTestId('decididas-anteriores').textContent).toContain('2 decisões automáticas anteriores');
    fireEvent.click(screen.getByText('ver todas'));
    await waitFor(() => expect(getProjectPendingActions.mock.calls.length).toBeGreaterThan(1));
  });

  it('vazio tem texto próprio e "Ver todas" alarga a janela', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    montar();
    expect(await screen.findByText('Nada foi decidido nas últimas 24 h.')).toBeTruthy();
    fireEvent.click(screen.getByText('Ver todas'));
    await waitFor(() => expect(screen.getByText('Nada foi decidido nos últimos 30 dias.')).toBeTruthy());
  });

  it('erro da api não vira "nada decidido"', async () => {
    getProjectPendingActions.mockRejectedValue(new Error('boom'));
    montar();
    expect(await screen.findByText('Não foi possível carregar as decisões recentes.')).toBeTruthy();
    expect(screen.queryByText(/Nada foi decidido/)).toBeNull();
  });
});
