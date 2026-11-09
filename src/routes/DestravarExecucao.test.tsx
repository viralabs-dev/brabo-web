import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SessionEvent } from '../lib/api-types';
import type { ExecucaoParada } from '../lib/execution';
import i18n from '../lib/i18n';

const rearmDevAgent = vi.fn();
const unblockTask = vi.fn();
const showToast = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    rearmDevAgent: (...a: unknown[]) => rearmDevAgent(...a),
    unblockTask: (...a: unknown[]) => unblockTask(...a),
  };
});
vi.mock('../components/ui/ToastProvider.helpers', () => ({
  useToast: () => ({ showToast }),
}));

const { DestravarExecucao } = await import('./DestravarExecucao');
const { montarTimeline } = await import('./session-timeline-montagem');
const { ApiError } = await import('../lib/api-client');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});
beforeEach(() => vi.clearAllMocks());

const parada: ExecucaoParada = {
  agentesOciosos: ['dev-auth'],
  agentesTravados: [{ agentId: 'dev-catalogo', module: 'catalogo' }],
  tarefasBloqueadas: [{ taskId: 'task-1', title: 'Fundação do catálogo', module: 'catalogo', reason: 'conflito' }],
  tarefasPendentes: 10,
};

describe('DestravarExecucao (RN-1061)', () => {
  it('Rearmar chama rearmDevAgent com o agentId; Desbloquear chama unblockTask com o taskId', async () => {
    rearmDevAgent.mockResolvedValue({ ok: true });
    unblockTask.mockResolvedValue({ ok: true });
    render(<DestravarExecucao projectId="p1" sessionId="exec-1" parada={parada} podeDecidir />);

    fireEvent.click(screen.getByRole('button', { name: /Rearmar dev-catalogo/ }));
    await waitFor(() => expect(rearmDevAgent).toHaveBeenCalledWith('p1', 'exec-1', 'dev-catalogo'));
    fireEvent.click(screen.getByRole('button', { name: /Desbloquear "Fundação do catálogo"/ }));
    await waitFor(() => expect(unblockTask).toHaveBeenCalledWith('p1', 'exec-1', 'task-1'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Rearmar dev-catalogo/ })).toBeDisabled());
    expect(screen.getByTestId('destravar-execucao-nota').textContent).toContain('Feito');
  });

  it('sem o papel os botões ficam inertes, com o motivo em texto', () => {
    render(<DestravarExecucao projectId="p1" sessionId="exec-1" parada={parada} podeDecidir={false} />);
    expect(screen.getByRole('button', { name: /Rearmar/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Desbloquear/ })).toBeDisabled();
    expect(screen.getByTestId('destravar-execucao-nota').textContent).toContain('developer');
  });

  it('a recusa da api vira toast e o botão volta', async () => {
    rearmDevAgent.mockRejectedValue(new ApiError(409, { message: 'recusado' }));
    render(<DestravarExecucao projectId="p1" sessionId="exec-1" parada={parada} podeDecidir />);
    fireEvent.click(screen.getByRole('button', { name: /Rearmar dev-catalogo/ }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ tone: 'danger' })));
    expect(screen.getByRole('button', { name: /Rearmar dev-catalogo/ })).not.toBeDisabled();
  });
});

describe('a timeline mostra a execução parada (RN-1061)', () => {
  const stalled = (seq: number): SessionEvent =>
    ({
      id: `s${seq}`,
      seq,
      type: 'execution.stalled',
      actor: { kind: 'system', id: 'execucao' },
      payload: parada,
      createdAt: '2026-11-07T12:00:00.000Z',
    }) as SessionEvent;
  const rearmed = { id: 'r', seq: 5, type: 'dev.rearmed', actor: { kind: 'system', id: 'x' }, payload: {}, createdAt: '2026-11-07T12:01:00.000Z' } as SessionEvent;

  function montar(events: SessionEvent[]) {
    const nada = vi.fn();
    const ctx = {
      events, actions: [], backlogQuery: { data: undefined }, projectId: 'p1', sessionId: 'exec-1',
      t: i18n.getFixedT('pt-BR', 'sessionPage'), autoria: { meuId: null, meuEmail: null, membros: undefined },
      queryClient: {} as never, invalidateActions: nada, ofertasAcionaveis: [], isActive: true, semRepositorio: false,
      promovendoStoryId: null, promovendoTodas: false, ativandoExecucao: false, podeAtivarAutoMode: false, podeDecidir: true,
      setRecusandoStory: nada, setMotivoRecusa: nada, handlePromoteStory: nada, handlePromoteAll: nada, handleAcceptHandoff: nada,
      handleActivateExecution: nada, handleActivateAutoMode: nada, iniciarTurnoDoAgente: nada, acompanharTurnoPeloLog: nada,
      finalizarTurnoDoAgente: nada,
    } as unknown as Parameters<typeof montarTimeline>[0];
    return render(<>{montarTimeline(ctx).map((e) => <div key={e.chave}>{e.node}</div>)}</>);
  }

  it('o evento renderiza o aviso nomeando o que segura, com Rearmar e Desbloquear', () => {
    montar([stalled(4)]);
    const aviso = screen.getByTestId('execucao-parada');
    expect(aviso.textContent).toContain('10 tarefas pendentes');
    expect(aviso.textContent).toContain('Fundação do catálogo');
    expect(aviso.textContent).toContain('dev-catalogo');
    expect(screen.getByTestId('destravar-execucao')).toBeInTheDocument();
  });

  it('depois do destrave o aviso fica no histórico, sem os botões', () => {
    montar([stalled(4), rearmed]);
    expect(screen.getByTestId('execucao-parada')).toBeInTheDocument();
    expect(screen.queryByTestId('destravar-execucao')).toBeNull();
  });
});
