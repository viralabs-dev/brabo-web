import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../lib/i18n';
import { ToastProvider } from '../../components/ui/ToastProvider';

const getProject = vi.fn();
const updateProject = vi.fn();
const listModels = vi.fn();
const listWorkspaces = vi.fn();

vi.mock('../../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api-client')>();
  return {
    ...original,
    getProject: (...a: unknown[]) => getProject(...a),
    updateProject: (...a: unknown[]) => updateProject(...a),
    listModels: (...a: unknown[]) => listModels(...a),
    listWorkspaces: (...a: unknown[]) => listWorkspaces(...a),
  };
});

const { ExecutionSection } = await import('./ExecutionSection');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const modelo = (id: string) => ({ id, displayName: id });

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <ExecutionSection projectId="p1" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getProject.mockResolvedValue({ id: 'p1', maxConsecutiveBlocked: null, taskBudgetMicros: null, modelEscalation: null });
  listModels.mockResolvedValue({ local: {}, cloud: { x: [modelo('claude-haiku-5-5'), modelo('claude-sonnet-5')] } });
  listWorkspaces.mockResolvedValue([{ workspace: { id: 'w1' }, role: 'maintainer' }]);
  updateProject.mockResolvedValue({});
});

describe('ExecutionSection — teto e escada (AT-916/917)', () => {
  it('o teto por tarefa vem com o padrão e grava em micro-USD pelo PATCH do projeto', async () => {
    montar();
    const campo = await screen.findByLabelText('Teto de gasto por tarefa (US$)');
    expect(campo).toHaveValue(0.5);
    await waitFor(() => expect(campo).toBeEnabled());
    fireEvent.change(campo, { target: { value: '2' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[1]);
    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { taskBudgetMicros: 2_000_000 }));
  });

  it('a escada mostra o padrão e grava os degraus com teto fixo', async () => {
    montar();
    const teto2 = await screen.findByLabelText('Teto do degrau 2 (US$)');
    expect(teto2).toHaveValue(2);
    await waitFor(() => expect(teto2).toBeEnabled());
    fireEvent.change(teto2, { target: { value: '3' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Salvar' })[2]);
    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith('p1', {
        modelEscalation: {
          ladder: [
            { modelId: 'claude-haiku-5-5', taskBudgetMicros: 500_000 },
            { modelId: 'claude-sonnet-5', taskBudgetMicros: 3_000_000 },
          ],
        },
      }),
    );
  });

  it('sem maintainer os controles ficam inertes com o motivo em texto', async () => {
    listWorkspaces.mockResolvedValue([{ workspace: { id: 'w1' }, role: 'developer' }]);
    montar();
    expect(await screen.findByLabelText('Teto de gasto por tarefa (US$)')).toBeDisabled();
    await screen.findAllByText('Editar exige o papel maintainer no projeto.');
    expect(screen.getAllByText('Editar exige o papel maintainer no projeto.').length).toBeGreaterThan(0);
  });
});
