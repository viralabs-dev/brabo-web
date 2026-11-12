import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import settingsPtBR from '../../locales/pt-BR/settings.json';
import { ToastProvider } from '../../components/ui/ToastProvider';
import { ApiError } from '../../lib/api-client';

const listAgentAreas = vi.fn();
const setAreaMaxParallel = vi.fn();
const setAreaBudget = vi.fn();

vi.mock('../../lib/api-client', async () => {
  // `mensagemDaApi` e `ApiError` entram de verdade: o desfecho parcial precisa
  // mostrar a mensagem que a api DEU, e é a extração dela que se exercita aqui.
  const real =
    await vi.importActual<typeof import('../../lib/api-client')>(
      '../../lib/api-client',
    );
  return {
    ApiError: real.ApiError,
    mensagemDaApi: real.mensagemDaApi,
    listAgentAreas: (...args: unknown[]) => listAgentAreas(...args),
    setAreaMaxParallel: (...args: unknown[]) => setAreaMaxParallel(...args),
    setAreaBudget: (...args: unknown[]) => setAreaBudget(...args),
    listWorkspaces: () => Promise.resolve([{ id: 'ws-1', role: 'owner' }]),
    getProjectBudget: () => Promise.resolve(null),
    setProjectBudget: () => Promise.resolve({}),
  };
});

const { ParallelismSection } = await import('./ParallelismSection');
const { BudgetSection } = await import('./BudgetSection');
const { BarraDeSalvar, ProvedorDoSalvarDoCabecalho } = await import('./salvar-do-cabecalho');

function montarSecao(secao: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const i18n = i18next.createInstance();
  void i18n.use(initReactI18next).init({
    resources: { 'pt-BR': { settings: settingsPtBR } },
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    defaultNS: 'settings',
    ns: ['settings'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ToastProvider>{secao}</ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

function areaDe(key: string) {
  return {
    id: key, projectId: 'proj-1', key, leadAgentId: 'dev-lead', maxParallel: 2,
    budgetMicros: null, spentMicros: 0, members: [],
  };
}

function montarTela() {
  montarSecao(
    <ProvedorDoSalvarDoCabecalho>
      <BarraDeSalvar />
      <ParallelismSection projectId="proj-1" />
      <BudgetSection projectId="proj-1" />
    </ProvedorDoSalvarDoCabecalho>,
  );
}

async function editarDuas() {
  fireEvent.change(await screen.findByLabelText('Teto de agentes da área dev'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Teto de gasto da área dev, em dólares'), { target: { value: '7' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  listAgentAreas.mockResolvedValue([areaDe('dev')]);
  setAreaMaxParallel.mockResolvedValue({});
  setAreaBudget.mockResolvedValue({});
});

describe('Salvar do cabeçalho (RN-1265, RN-469)', () => {
  it('conta as linhas de todas as seções e salva todas em série', async () => {
    montarTela();
    await editarDuas();
    expect(await screen.findByText('2 alterações não salvas')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    expect(await screen.findByText('2 alterações salvas')).toBeInTheDocument();
    expect(setAreaMaxParallel).toHaveBeenCalledWith('proj-1', 'dev', 5);
    expect(setAreaBudget).toHaveBeenCalledWith('proj-1', 'dev', 7);
  });

  it('desfecho parcial: não aborta na falha, diz "N de M" e nomeia a que ficou', async () => {
    setAreaMaxParallel.mockRejectedValue(new ApiError(409, { message: 'recusado pela api' }));
    montarTela();
    await editarDuas();
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[0]);
    expect(await screen.findByText('Salvou 1 de 2')).toBeInTheDocument();
    expect(setAreaBudget).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Não salvou: Paralelismo por área: dev/)).toBeInTheDocument();
    // a linha que falhou continua suja
    expect(await screen.findByText('1 alteração não salva')).toBeInTheDocument();
  });
});
