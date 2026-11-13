import { beforeAll, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { DecisionsPage } from './DecisionsPage';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const get = vi.fn();
const status = vi.fn().mockResolvedValue({ enabled: true });
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getDecisionInbox: (...a: unknown[]) => get(...a),
  listProjects: () => Promise.resolve([{ id: 'p0' }]),
  getPsychologistStatus: (...a: unknown[]) => status(...a),
}));
vi.mock('../lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/hooks')>()),
  useCurrentWorkspace: () => ({ data: { id: 'ws-1' } }),
}));

// Orçamento (RN-632): a Caixa faz UMA leitura de workspace e nenhuma por projeto; a única a mais é a do status do Psicólogo (AT-942, uma só, do primeiro projeto).
describe('Caixa de decisões: orçamento de leituras', () => {
  it('uma leitura ao montar, sem leitura por projeto', async () => {
    const f = { total: 0, truncada: false, itens: [] };
    get.mockResolvedValue({
      geradoEm: '', status: 'pending', desde: null, tetoPorFila: 50,
      projetos: Array.from({ length: 25 }, (_, i) => ({ projectId: `p${i}`, nome: `P${i}`, aprovacoes: 0, prs: 0, promocoes: 0, arquitetura: 0, hipoteses: 0, agentesAguardando: [] })),
      filas: { aprovacoes: f, prs: f, promocoes: f, arquitetura: f, hipoteses: f },
    });
    render(<QueryClientProvider client={new QueryClient()}><DecisionsPage /></QueryClientProvider>);
    await screen.findByText('Nenhuma pendência de arquitetura.');
    expect(get).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(status).toHaveBeenCalledTimes(1));
    expect(status).toHaveBeenCalledWith('p0');
  });
});
