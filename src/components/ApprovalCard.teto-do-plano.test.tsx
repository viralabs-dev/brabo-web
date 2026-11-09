import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import type { AgentArea, Budget, ProposedAction } from '../lib/api-types';

/**
 * AT-808 (RN-1062): o cartão do plano mostra o teto do projeto e das áreas
 * dev/qa ao lado do custo esperado, avisa (sem travar o Aprovar) quando a
 * estimativa passa do que resta e ajusta o teto da área dev ali.
 */
const getProjectBudget = vi.fn();
const listAgentAreas = vi.fn();
const setAreaBudget = vi.fn();
const listWorkspaces = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getProjectBudget: (...a: unknown[]) => getProjectBudget(...a),
  listAgentAreas: (...a: unknown[]) => listAgentAreas(...a),
  setAreaBudget: (...a: unknown[]) => setAreaBudget(...a),
  listWorkspaces: (...a: unknown[]) => listWorkspaces(...a),
}));

const { ApprovalCard } = await import('./ApprovalCard');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});
beforeEach(() => {
  vi.clearAllMocks();
  getProjectBudget.mockResolvedValue(null);
  listAgentAreas.mockResolvedValue([]);
  listWorkspaces.mockResolvedValue([{ id: 'w1', role: 'maintainer' }]);
});

// 21 tarefas × US$ 0,50 = US$ 10,50 de custo esperado.
function plano(): ProposedAction {
  return {
    id: 'a1',
    projectId: 'proj-1',
    sessionId: 's1',
    seq: 1,
    actionType: 'propose_execution_plan',
    payload: {
      modulos: [{ modulo: 'Backend', agentes: 1, porque: 'x' }],
      resumo: 'plano',
      totalAgentes: 1,
      orcamentoPorTarefaMicros: 500_000,
      tarefas: Array.from({ length: 21 }, (_, i) => ({ titulo: `t${i}`, modulo: 'Backend' })),
    },
    status: 'pending',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'agent', id: 'dev-lead' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProposedAction;
}

const area = (key: string, budgetMicros: number | null, spentMicros = 0): AgentArea =>
  ({ id: key, projectId: 'proj-1', key, leadAgentId: `${key}-lead`, maxParallel: 1, budgetMicros, spentMicros }) as AgentArea;
const orcamento = (policy: 'block' | 'allow', limitMicros: number, spentMicros = 0): Budget =>
  ({ id: 'b', projectId: 'proj-1', sessionId: null, limitMicros, spentMicros, policy, lastThresholdNotified: 0 }) as Budget;

function montar(comQueryClient = true, onApprove = vi.fn()) {
  const card = (
    <ApprovalCard action={plano()} onApprove={onApprove} onDeny={vi.fn()} onAlwaysAllow={vi.fn()} />
  );
  return render(
    comQueryClient ? (
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{card}</QueryClientProvider>
    ) : (
      card
    ),
  );
}

describe('ApprovalCard — teto do plano (RN-1062)', () => {
  it('sem teto nenhum: diz "sem teto" e não mostra o aviso', async () => {
    listAgentAreas.mockResolvedValue([area('dev', null), area('qa', null)]);
    montar();
    const linha = await screen.findByTestId('teto-do-plano');
    expect(linha.textContent).toContain('projeto sem teto');
    expect(linha.textContent).toContain('dev sem teto');
    expect(screen.queryByTestId('estimativa-acima-do-teto')).toBeNull();
  });

  it('teto da área dev menor que a estimativa: aviso com o que resta, e o Aprovar segue ativo', async () => {
    listAgentAreas.mockResolvedValue([area('dev', 4_400_000, 350_000), area('qa', 500_000)]);
    montar();
    const aviso = await screen.findByTestId('estimativa-acima-do-teto');
    expect(aviso.textContent).toContain('US$');
    expect(aviso.textContent).toContain('10,50');
    expect(aviso.textContent).toContain('4,05');
    expect(aviso.textContent).toContain('área dev');
    expect((await screen.findByTestId('teto-do-plano')).textContent).toContain('qa');
    expect(screen.getByRole('button', { name: /Aprovar/ })).not.toBeDisabled();
  });

  it('o teto do projeto com política allow não conta para o aviso; block conta', async () => {
    listAgentAreas.mockResolvedValue([area('dev', null)]);
    getProjectBudget.mockResolvedValue(orcamento('allow', 1_000_000));
    const { unmount } = montar();
    expect((await screen.findByTestId('teto-do-plano')).textContent).toContain('projeto');
    expect(screen.queryByTestId('estimativa-acima-do-teto')).toBeNull();
    unmount();

    getProjectBudget.mockResolvedValue(orcamento('block', 1_000_000, 200_000));
    montar();
    const aviso = await screen.findByTestId('estimativa-acima-do-teto');
    expect(aviso.textContent).toContain('do projeto');
    expect(aviso.textContent).toContain('0,80');
  });

  it('Ajustar teto → 4,40 → Salvar chama setAreaBudget(projectId, "dev", 4.4) e relê as áreas', async () => {
    listAgentAreas.mockResolvedValue([area('dev', null)]);
    setAreaBudget.mockResolvedValue(area('dev', 4_400_000));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: /Ajustar teto/ }));
    fireEvent.change(screen.getByLabelText(/Teto da área dev/), { target: { value: '4.4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(setAreaBudget).toHaveBeenCalledWith('proj-1', 'dev', 4.4));
    await waitFor(() => expect(listAgentAreas).toHaveBeenCalledTimes(2));
  });

  it('papel developer: o botão fica inerte, com o motivo em texto', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'w1', role: 'developer' }]);
    listAgentAreas.mockResolvedValue([area('dev', null)]);
    montar();
    expect(await screen.findByRole('button', { name: /Ajustar teto/ })).toBeDisabled();
    expect((await screen.findByTestId('teto-sem-papel')).textContent).toContain('maintainer');
  });

  it('sem QueryClient: nada quebra e a linha de teto não aparece', () => {
    montar(false);
    expect(screen.getByTestId('custo-do-plano')).toBeInTheDocument();
    expect(screen.queryByTestId('teto-do-plano')).toBeNull();
  });
});
