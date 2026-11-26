import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../lib/i18n';
import { AcoesDaExecucao } from './AcoesDaExecucao';
import { ouvirPedidosDeAba } from '../lib/contagens-do-projeto';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const unblockTask = vi.fn();
vi.mock('../lib/api-client', () => ({
  unblockTask: (...a: unknown[]) => unblockTask(...a),
  requestParallelization: vi.fn(),
  mensagemDaApi: (_e: unknown, f: string) => f,
}));
vi.mock('../components/ui/ToastProvider.helpers', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const epics = [
  {
    id: 'e1',
    stories: [{ id: 's1', title: 'Hist', tasks: [{ id: 't1', title: 'Tarefa', status: 'todo', blocked: true, blockedReason: 'porque' }] }],
  },
] as never;

function montar(podeDecidir: boolean) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AcoesDaExecucao projectId="p" sessionId="x" events={[]} epics={epics} acoes={[]} podeDecidir={podeDecidir} />
    </QueryClientProvider>,
  );
}

describe('AcoesDaExecucao (RN-1220)', () => {
  it('desbloqueia a tarefa bloqueada com a orientação', async () => {
    unblockTask.mockResolvedValue(undefined);
    montar(true);
    await userEvent.click(screen.getByRole('button', { name: /Pendências da execução/ }));
    // AT-1021: sem explicação (dado antigo), "Tentar de novo" com orientação vazia, em um clique.
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(unblockTask).toHaveBeenCalledWith('p', 'x', 't1', '');
    expect(await screen.findByTestId('desbloqueada')).toBeTruthy();
  });

  it('RN-1491: nasce recolhida numa linha com a contagem; abre ao clicar', async () => {
    montar(true);
    const cab = screen.getByRole('button', { name: /Pendências da execução/ });
    expect(cab).toHaveAttribute('aria-expanded', 'false');
    expect(cab).toHaveTextContent('1 tarefa bloqueada · nenhuma PR aguardando você · Ver');
    expect(screen.queryByTestId('desbloqueada')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    await userEvent.click(cab);
    expect(cab).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('sem papel developer o botão fica inerte', async () => {
    montar(false);
    await userEvent.click(screen.getByRole('button', { name: /Pendências da execução/ }));
    expect((screen.getByRole('button', { name: 'Tentar de novo' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('AcoesDaExecucao — bloqueio de teto (AT-1021)', () => {
  it('mostra a causa e leva às Configurações em um clique; "Tentar de novo" retoma', async () => {
    const teto = [
      {
        id: 'e1',
        stories: [{ id: 's1', title: 'Hist', tasks: [{
          id: 't1', title: 'Tarefa', status: 'todo', blocked: true, blockedReason: 'orçamento por tarefa excedido',
          blockedExplicacao: { codigo: 'orcamento_excedido', causa: 'O limite de gasto desta tarefa foi atingido, e só você pode liberar mais.', acoes: [{ id: 'aumentar_o_teto', rotulo: 'Aumentar o teto e continuar', orientacao: '' }] },
        }] }],
      },
    ] as never;
    unblockTask.mockReset();
    unblockTask.mockResolvedValue(undefined);
    const pedidos: unknown[] = [];
    const parar = ouvirPedidosDeAba((p) => pedidos.push(p));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AcoesDaExecucao projectId="p" sessionId="x" events={[]} epics={teto} acoes={[]} podeDecidir />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Pendências da execução/ }));
    expect(screen.getByTestId('causa-do-bloqueio')).toHaveTextContent('só você pode liberar mais');
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar o teto (nas Configurações)' }));
    expect(pedidos).toEqual([{ projectId: 'p', tab: 'settings' }]);
    expect(unblockTask).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(unblockTask).toHaveBeenCalledWith('p', 'x', 't1', '');
    parar();
  });
});
