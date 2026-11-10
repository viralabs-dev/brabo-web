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

const { CarrosselDeExecutores } = await import('./CarrosselDeExecutores');

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

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CarrosselDeExecutores projectId="p1" sessionId={AQUI} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
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

describe('CarrosselDeExecutores', () => {
  it('expandido: cartão com tarefa, motivo do ócio, custo, barra e link do fio', async () => {
    montar();
    const api = await screen.findByRole('group', { name: /dev-api, trabalhando/ });
    expect(within(api).getByText('Login')).toBeInTheDocument();
    expect(within(api).getByText('US$ 0.4120')).toBeInTheDocument();
    expect(within(api).getByText('Ver no fio')).toBeInTheDocument();
    const web = screen.getByRole('group', { name: /dev-web, ocioso/ });
    expect(within(web).getByText(/Esperando a fundação de api/)).toBeInTheDocument();
    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '1');
    expect(barra).toHaveAttribute('aria-valuemax', '3');
    expect(screen.getByRole('button', { name: 'Minimizar o carrossel de executores' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('minimizado: só nome, estado, tempo e gasto; a barra fica; a escolha persiste', async () => {
    const u = userEvent.setup();
    const { unmount } = montar();
    await screen.findByRole('group', { name: /dev-api/ });
    await u.click(screen.getByRole('button', { name: 'Minimizar o carrossel de executores' }));

    const lista = screen.getByRole('list', { name: 'Executores (resumo)' });
    expect(within(lista).getByText('dev-api')).toBeInTheDocument();
    expect(within(lista).getByText('trabalhando')).toBeInTheDocument();
    expect(within(lista).getByText('US$ 0.4120')).toBeInTheDocument();
    expect(screen.queryByText('Login')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver no fio')).not.toBeInTheDocument();
    expect(screen.queryByText(/Esperando a fundação/)).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(window.localStorage.getItem('brabo:carrossel-de-executores:minimizado')).toBe('1');

    unmount();
    montar();
    expect(await screen.findByRole('list', { name: 'Executores (resumo)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar os detalhes dos executores' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('sem execução vigente não renderiza nada', async () => {
    getActiveExecutionSession.mockResolvedValue(null);
    const { container } = montar();
    await vi.waitFor(() => expect(getActiveExecutionSession).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
