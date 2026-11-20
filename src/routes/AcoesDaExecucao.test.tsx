import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../lib/i18n';
import { AcoesDaExecucao } from './AcoesDaExecucao';

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
    await userEvent.click(screen.getByRole('button', { name: /^desbloquear$|^unblock$/i }));
    expect(unblockTask).toHaveBeenCalledWith('p', 'x', 't1', undefined);
    expect(await screen.findByTestId('desbloqueada')).toBeTruthy();
  });

  it('RN-1491: nasce recolhida numa linha com a contagem; abre ao clicar', async () => {
    montar(true);
    const cab = screen.getByRole('button', { name: /Pendências da execução/ });
    expect(cab).toHaveAttribute('aria-expanded', 'false');
    expect(cab).toHaveTextContent('1 tarefa bloqueada · nenhuma PR aguardando você · Ver');
    expect(screen.queryByTestId('desbloqueada')).toBeNull();
    expect(screen.queryByRole('button', { name: /^desbloquear$/i })).toBeNull();
    await userEvent.click(cab);
    expect(cab).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /^desbloquear$/i })).toBeInTheDocument();
  });

  it('sem papel developer o botão fica inerte', async () => {
    montar(false);
    await userEvent.click(screen.getByRole('button', { name: /Pendências da execução/ }));
    expect((screen.getByRole('button', { name: /^desbloquear$/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
