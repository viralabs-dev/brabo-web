import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import executorsPtBR from '../locales/pt-BR/executors.json';
import { AtivarExecucao } from './AtivarExecucao';

const getContainerLifecycle = vi.fn();
const activateExecution = vi.fn();

vi.mock('../lib/api-client', () => ({
  getContainerLifecycle: (...a: unknown[]) => getContainerLifecycle(...a),
  activateExecution: (...a: unknown[]) => activateExecution(...a),
  mensagemDaApi: (e: unknown) => (e instanceof Error ? e.message : 'erro'),
}));
vi.mock('../lib/hooks', () => ({
  useActiveExecutionSession: () => ({ session: null, isSuccess: true }),
  useCurrentWorkspaceWithRole: () => ({ data: { role: 'maintainer' } }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/containers">{children}</a>,
}));

const i18n = i18next.createInstance();
void i18n.use(initReactI18next).init({
  lng: 'pt-BR',
  resources: { 'pt-BR': { executors: executorsPtBR } },
  interpolation: { escapeValue: false },
});

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <I18nextProvider i18n={i18n}>
        <AtivarExecucao projectId="p1" />
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('AtivarExecucao (RN-1300)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fica inerte, com o motivo e o link, sem container running', async () => {
    getContainerLifecycle.mockResolvedValue({ status: 'provisioning' });
    montar();
    expect(await screen.findByText(/ainda não está rodando/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ativar execução/ })).toHaveProperty('disabled', true);
    expect(screen.getByText('Abrir Containers')).toBeTruthy();
  });

  it('habilita com container running', async () => {
    getContainerLifecycle.mockResolvedValue({ status: 'running' });
    montar();
    await waitFor(() => expect(getContainerLifecycle).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /Ativar execução/ })).toHaveProperty('disabled', false);
    expect(screen.queryByText(/ainda não está rodando/)).toBeNull();
  });

  it('mostra a frase do 409 da api', async () => {
    getContainerLifecycle.mockResolvedValue({ status: 'running' });
    activateExecution.mockRejectedValue(new Error('Aprove a subida do container.'));
    montar();
    await waitFor(() => expect(getContainerLifecycle).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Ativar execução/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Aprove a subida do container.');
  });
});
