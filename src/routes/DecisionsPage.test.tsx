import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DecisionsPage } from './DecisionsPage';
import { caixaTemAlgo } from '../lib/caixa-de-decisoes';
import type { DecisionInbox } from '../lib/api-types';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const getDecisionInbox = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getDecisionInbox: (...a: unknown[]) => getDecisionInbox(...a),
}));
vi.mock('../lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/hooks')>()),
  useCurrentWorkspace: () => ({ data: { id: 'ws-1' } }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#x">{children}</a>,
}));

const fila = (itens: unknown[] = [], over = {}) => ({ total: itens.length, truncada: false, itens, ...over });
const acao = (id: string) => ({
  id, sessionId: `s-${id}`, status: 'pending', actionType: 'terminal', payload: { command: 'ls' },
  actor: { type: 'agent', id: 'dev-api' }, createdAt: new Date().toISOString(),
});
const inbox = (filas: Record<string, unknown>) =>
  ({ geradoEm: '', status: 'pending', desde: null, tetoPorFila: 50, projetos: [],
    filas: { aprovacoes: fila(), prs: fila(), promocoes: fila(), arquitetura: fila(), hipoteses: fila(), ...filas } }) as unknown as DecisionInbox;

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><DecisionsPage /></QueryClientProvider>);
}

beforeEach(() => {
  getDecisionInbox.mockReset();
});

describe('DecisionsPage (AT-889, S07)', () => {
  it('mostra os itens de dois projetos, cinco cartões e nenhum total somado', async () => {
    getDecisionInbox.mockResolvedValue(
      inbox({ aprovacoes: fila([{ projectId: 'p1', projectName: 'Alfa', acao: acao('a1') }, { projectId: 'p2', projectName: 'Beta', acao: acao('a2') }], { truncada: true, total: 60 }) }),
    );
    montar();
    await screen.findAllByText('Alfa');
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { pressed: false }).filter((b) => b.className.includes('cartao'))).toHaveLength(5);
    expect(screen.getAllByText('60+').length).toBeGreaterThan(0);
    expect(screen.queryByText('62')).toBeNull();
  });

  it('arquitetura em Decididas tem texto próprio e a leitura pede decided', async () => {
    getDecisionInbox.mockResolvedValue(inbox({}));
    montar();
    await screen.findByText('Nenhuma pendência de arquitetura.');
    fireEvent.click(screen.getByRole('button', { name: 'Decididas' }));
    await waitFor(() => expect(getDecisionInbox).toHaveBeenLastCalledWith('ws-1', 'decided'));
    const secao = await screen.findByRole('region', { name: 'Pendências de arquitetura' });
    expect(within(secao).getByText(/não há decisão humana/)).toBeTruthy();
  });

  it('falha de leitura diz que falhou', async () => {
    getDecisionInbox.mockImplementation(() => Promise.reject(new Error('x')));
    montar();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('o ponto é presença: some com tudo zerado', () => {
    expect(caixaTemAlgo(inbox({}))).toBe(false);
    expect(caixaTemAlgo(inbox({ prs: fila([{}]) }))).toBe(true);
  });
});
