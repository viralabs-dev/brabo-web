import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import type { ProposedAction } from '../lib/api-types';

/**
 * AT-476 (RN-804): o cartão do plano do Dev Lead oferece o modo automático em
 * lote ANTES de aprovar — mesmo controle da RN-661, só com o clique.
 */
const setAgentAutonomy = vi.fn();
const listAgentAutonomy = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  setAgentAutonomy: (...args: unknown[]) => setAgentAutonomy(...args),
  listAgentAutonomy: (...args: unknown[]) => listAgentAutonomy(...args),
}));

const { ApprovalCard } = await import('./ApprovalCard');
const { agentesDoPlano } = await import('./ModoAutomaticoDoPlano');

function plano(overrides: Partial<ProposedAction> = {}): ProposedAction {
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
      tarefas: [],
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
    ...overrides,
  };
}

function montar(action: ProposedAction, comPapel = true, onApprove: () => void | Promise<unknown> = vi.fn()) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ApprovalCard
        action={action}
        onApprove={onApprove}
        onDeny={vi.fn()}
        onAlwaysAllow={vi.fn()}
        onActivateAutoMode={comPapel ? vi.fn() : undefined}
      />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('pt-BR');
  listAgentAutonomy.mockResolvedValue([]);
  setAgentAutonomy.mockResolvedValue(undefined);
});

afterAll(() => {
  void i18n.changeLanguage('en');
});

describe('ApprovalCard — plano do Dev Lead enxuto, com o piloto no próprio cartão (AT-753, UX-4)', () => {
  it('deriva os dev agents dos módulos do plano, mais os gates', () => {
    const agentes = agentesDoPlano(plano().payload);
    expect(agentes[0]).toBe('dev-backend');
    expect(agentes).toContain('qa');
  });

  it('à vista: o que será feito, o custo, "Aprovar plano" e "Negar"; o jargão fica em Detalhes, fechado', () => {
    montar(
      plano({
        payload: {
          ...plano().payload,
          tarefas: [{ modulo: 'Backend' }, { modulo: 'Backend' }],
          orcamentoPorTarefaMicros: 500_000,
        },
      }),
    );
    expect(screen.getByTestId('resumo-do-plano')).toHaveTextContent(
      'Começa a execução com 1 dev agent, um por módulo. São 2 tarefas.',
    );
    expect(screen.getByTestId('custo-do-plano')).toHaveTextContent('até US$ 1,00');
    expect(screen.getByRole('button', { name: 'Aprovar plano' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Negar' })).toBeEnabled();
    // Nada de jargão fora de Detalhes: nem Payload cru, nem permissions.json, nem os botões velhos.
    expect(screen.queryByText('Payload cru')).toBeNull();
    expect(screen.queryByTestId('nota-sempre-permitir')).toBeNull();
    expect(screen.queryByTestId('nota-modo-automatico-nao-aprova')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modo automático' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Ligar para/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Detalhes' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('Detalhes guarda o payload, o permissions.json e a lista do que o piloto libera', () => {
    montar(plano());
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }));
    expect(screen.getByTestId('nota-sempre-permitir')).toHaveTextContent('permissions.json');
    expect(screen.getByTestId('piloto-libera')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sempre permitir' })).toBeInTheDocument();
  });

  it('o checkbox do piloto nasce marcado e nada grava ao montar', () => {
    montar(plano());
    expect(screen.getByRole('checkbox', { name: /Ligar o piloto automático para o time/ })).toBeChecked();
    expect(setAgentAutonomy).not.toHaveBeenCalled();
  });

  it('aprovar com o checkbox marcado liga a curinga de cada agente ANTES de aprovar', async () => {
    const ordem: string[] = [];
    setAgentAutonomy.mockImplementation(async (_p: string, corpo: { agentId: string }) => {
      ordem.push(`liga:${corpo.agentId}`);
    });
    const onApprove = vi.fn(() => {
      ordem.push('aprova');
    });
    montar(plano(), true, onApprove);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar plano' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(setAgentAutonomy.mock.calls[0]).toEqual([
      'proj-1',
      { agentId: 'dev-backend', actionType: '*', mode: 'auto_approve' },
    ]);
    expect(setAgentAutonomy).toHaveBeenCalledTimes(agentesDoPlano(plano().payload).length);
    expect(ordem[0]).toBe('liga:dev-backend');
    expect(ordem[ordem.length - 1]).toBe('aprova');
  });

  it('desmarcado, aprova sem ligar o piloto de ninguém', async () => {
    const onApprove = vi.fn();
    montar(plano(), true, onApprove);
    fireEvent.click(screen.getByRole('checkbox', { name: /Ligar o piloto automático/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar plano' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
    expect(setAgentAutonomy).not.toHaveBeenCalled();
  });

  it('CASO DE FALHA: se a api recusa ligar o piloto, o plano é aprovado do mesmo jeito', async () => {
    setAgentAutonomy.mockRejectedValue(new Error('403'));
    const onApprove = vi.fn();
    montar(plano(), true, onApprove);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar plano' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalledTimes(1));
  });

  it('CASO DE FALHA: sem papel (sem callback) não oferece o piloto e não grava; outro tipo de ação não muda', async () => {
    const onApprove = vi.fn();
    montar(plano(), false, onApprove);
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar plano' }));
    await waitFor(() => expect(onApprove).toHaveBeenCalled());
    expect(setAgentAutonomy).not.toHaveBeenCalled();
    montar(plano({ id: 'a2', actionType: 'terminal', payload: { command: 'ls' } }));
    expect(screen.queryByRole('checkbox', { name: /piloto/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });
});
