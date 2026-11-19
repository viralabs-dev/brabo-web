import type React from 'react';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '@testing-library/react';
import i18n from '../lib/i18n';

const getActiveExecutionSession = vi.fn();
const listSessionEvents = vi.fn();
const listBacklog = vi.fn();
const getArchitecture = vi.fn();
const getSessionTokenUsage = vi.fn();
const getOpenPullRequestsDoChat = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    getActiveExecutionSession: (...a: unknown[]) => getActiveExecutionSession(...a),
    listSessionEvents: (...a: unknown[]) => listSessionEvents(...a),
    listBacklog: (...a: unknown[]) => listBacklog(...a),
    getArchitecture: (...a: unknown[]) => getArchitecture(...a),
    getSessionTokenUsage: (...a: unknown[]) => getSessionTokenUsage(...a),
    getOpenPullRequestsDoChat: (...a: unknown[]) => getOpenPullRequestsDoChat(...a),
  };
});
vi.mock('../lib/session-channel', () => ({ connectSessionHeartbeat: () => () => undefined }));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <a href="#" className={className}>
      {children}
    </a>
  ),
}));

const { FaixaDeEstado } = await import('./FaixaDeEstado');
const { ListaDeExecutores } = await import('./ListaDeExecutores');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const EXEC = 'd7e9d7e9-bbbb-4bbb-8bbb-222222222222';
const AQUI = '11111111-aaaa-4aaa-8aaa-111111111111';
const agora = () => new Date().toISOString();

function evento(seq: number, type: string, actorId: string, payload: unknown) {
  return { id: `e${seq}`, sessionId: EXEC, seq, type, actor: { kind: 'agent', id: actorId }, payload, createdAt: agora() };
}
function tarefa(id: string, module: string, status: string, title = `tarefa ${module}`) {
  return {
    id, storyId: 's', title, description: '', status, assignedTo: null, blocked: false, blockedReason: null,
    gateStatus: null, gateCorrectionCount: 0, module, createdAt: '', updatedAt: '',
  };
}

function montar(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      {ui}
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getActiveExecutionSession.mockResolvedValue({ id: EXEC, status: 'active' });
  listSessionEvents.mockResolvedValue({
    items: [
      evento(1, 'dev.working', 'dev-api', { agentId: 'dev-api', taskId: 'aaaa1111', taskTitle: 'Login' }),
      evento(2, 'dev.idle', 'dev-web', { reason: 'sem task pegável' }),
    ],
    nextCursor: null,
  });
  listBacklog.mockResolvedValue([
    { id: 'ep', stories: [{ id: 's', tasks: [tarefa('aaaa1111', 'api', 'in_progress'), tarefa('bbbb2222', 'web', 'todo'), tarefa('cccc3333', 'x', 'done')] }] },
  ]);
  getArchitecture.mockResolvedValue({
    moduleMap: { modules: [{ name: 'api', dependsOn: [] }, { name: 'web', dependsOn: ['api'] }] },
  });
  getSessionTokenUsage.mockResolvedValue([{ actorId: 'dev-api', costMicros: 412000, inputTokens: 1, outputTokens: 1 }]);
  getOpenPullRequestsDoChat.mockResolvedValue({ items: [] });
});

describe('FaixaDeEstado (AT-957)', () => {
  it('uma linha: progresso x de N, quantos esperam e custo; o clique abre a aba Executores', async () => {
    const u = userEvent.setup();
    const abrir = vi.fn();
    montar(<FaixaDeEstado projectId="p1" sessionId={AQUI} aoAbrirExecutores={abrir} />);
    const barra = await screen.findByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '1');
    expect(barra).toHaveAttribute('aria-valuemax', '3');
    const faixa = screen.getByTestId('faixa-de-estado');
    expect(within(faixa).getByText('1 de 3 tarefas')).toBeInTheDocument();
    expect(within(faixa).getByText('1 esperando')).toBeInTheDocument();
    expect(within(faixa).getByText('US$ 0.4120')).toBeInTheDocument();
    // Nada de cartão nem de carrossel na faixa: o detalhe mora no painel.
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByTestId('carrossel-executores')).not.toBeInTheDocument();
    await u.click(screen.getByTestId('faixa-abrir-executores'));
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('sem execução vigente e sem retrato anterior não renderiza nada', async () => {
    getActiveExecutionSession.mockResolvedValue(null);
    const { container } = montar(<FaixaDeEstado projectId="p1" sessionId={AQUI} aoAbrirExecutores={vi.fn()} />);
    await vi.waitFor(() => expect(getActiveExecutionSession).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ListaDeExecutores (AT-957)', () => {
  it('um item por executor, com tarefa, motivo da espera, custo e a ação "Ver no fio" na linha', async () => {
    montar(<ListaDeExecutores projectId="p1" sessionId={AQUI} />);
    const api = await screen.findByTestId('executor-dev-api');
    expect(within(api).getByText('trabalhando')).toBeInTheDocument();
    expect(within(api).getByText('Login')).toBeInTheDocument();
    expect(within(api).getByText('US$ 0.4120')).toBeInTheDocument();
    expect(within(api).getByText('Ver no fio')).toBeInTheDocument();
    const web = screen.getByTestId('executor-dev-web');
    expect(within(web).getByText(/Esperando a fundação de api/)).toBeInTheDocument();
  });

  it('com dependeDe, agrupa as lanes por rodada e diz o motivo da espera com o título (AT-993)', async () => {
    const t = (id: string, status: string, dependeDe: string[], title: string) => ({
      ...tarefa(id, 'api', status, title), dependeDe, archivedAt: null,
    });
    listBacklog.mockResolvedValue([
      { id: 'ep', stories: [{ id: 's', tasks: [
        t('t1', 'done', [], 'Criar acesso'), t('t2', 'in_progress', ['t1'], 'Login'),
        t('t3', 'todo', ['t2'], 'Sessão'), t('t4', 'todo', ['t3'], 'Logout'),
      ] }] },
    ]);
    montar(<ListaDeExecutores projectId="p1" sessionId={AQUI} />);
    const plano = await screen.findByTestId('plano-por-rodada');
    expect(within(plano).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Rodada 1 de 4', 'Rodada 2 de 4', 'Rodada 3 de 4', 'Rodada 4 de 4',
    ]);
    expect(within(screen.getByTestId('rodada-1')).getByText('mergeada')).toBeInTheDocument();
    expect(within(screen.getByTestId('rodada-2')).getByText('implementando')).toBeInTheDocument();
    expect(within(screen.getByTestId('lane-t3')).getByText('Espera «Login» entrar na main')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fechar rodada/i })).not.toBeInTheDocument();
  });

  it('sem execução vigente diz que não há execução', async () => {
    getActiveExecutionSession.mockResolvedValue(null);
    montar(<ListaDeExecutores projectId="p1" sessionId={AQUI} />);
    expect(await screen.findByText('Nenhuma execução em andamento.')).toBeInTheDocument();
  });
});
