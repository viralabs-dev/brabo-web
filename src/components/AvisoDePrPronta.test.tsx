import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { act, render, screen, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import { EVENTO_ABRIR_FILA } from '../lib/perguntas-em-aberto';
import { esperaRelativa, tituloComContador } from './AvisoDePrPronta.helpers';

/** AT-810 (RN-1063): PR pronta para o dono mergear avisa na borda do fio. */
const getProjectPendingActions = vi.fn();
const getCodePullRequests = vi.fn();
const listBacklog = vi.fn();
const proposeAction = vi.fn();
const approveAction = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getProjectPendingActions: (...a: unknown[]) => getProjectPendingActions(...a),
  getCodePullRequests: (...a: unknown[]) => getCodePullRequests(...a),
  listBacklog: (...a: unknown[]) => listBacklog(...a),
  proposeAction: (...a: unknown[]) => proposeAction(...a),
  approveAction: (...a: unknown[]) => approveAction(...a),
}));

const { AvisoDePrPronta } = await import('./AvisoDePrPronta');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const AQUI = '11111111-aaaa-4aaa-8aaa-111111111111';
const EXECUCAO = 'd7e9d7e9-bbbb-4bbb-8bbb-222222222222';

const pr = (id: string, sourceBranch: string) => ({
  id,
  number: Number(id),
  title: `Fundação ${id}`,
  url: '',
  author: null,
  state: 'open',
  sourceBranch,
  targetBranch: 'dev',
  updatedAt: null,
});

function backlog(tarefas: { id: string; gateStatus: string | null }[]) {
  return [
    {
      id: 'e1',
      projectId: 'proj-1',
      sessionId: EXECUCAO,
      title: 'Épico',
      description: '',
      createdAt: '',
      updatedAt: '',
      stories: [
        {
          id: 's1',
          tasks: tarefas.map((t) => ({
            storyId: 's1',
            title: `tarefa ${t.id}`,
            description: '',
            status: 'in_review',
            assignedTo: null,
            blocked: false,
            blockedReason: null,
            gateCorrectionCount: 0,
            createdAt: '',
            updatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
            ...t,
          })),
        },
      ],
    },
  ];
}

function montar(client = new QueryClient({ defaultOptions: { queries: { retry: false } } }), podeDecidir = true) {
  const tela = (
    <QueryClientProvider client={client}>
      <AvisoDePrPronta projectId="proj-1" sessionId={AQUI} podeDecidir={podeDecidir} />
    </QueryClientProvider>
  );
  return { client, ...render(tela) };
}

const reler = (client: QueryClient) => act(async () => void (await client.invalidateQueries()));

beforeEach(() => {
  vi.clearAllMocks();
  document.title = 'Brabo';
  getProjectPendingActions.mockResolvedValue([]);
  getCodePullRequests.mockResolvedValue({ items: [] });
  listBacklog.mockResolvedValue(backlog([]));
});

describe('AvisoDePrPronta', () => {
  it('a tarefa passa a awaiting_user e a PR #3 entra: o aviso aparece com Mergear e o tempo, e o título da aba conta', async () => {
    const { client } = montar();
    await waitFor(() => expect(listBacklog).toHaveBeenCalled());
    expect(screen.queryByTestId('aviso-pr-pronta')).toBeNull();

    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'feature/task-aaaaaaaa')] });
    listBacklog.mockResolvedValue(backlog([{ id: 'aaaaaaaa-1', gateStatus: 'awaiting_user' }]));
    await reler(client);

    const aviso = await screen.findByTestId('aviso-pr-pronta');
    expect(aviso.textContent).toContain('PR #3 "Fundação 3" está pronta para você mergear');
    expect(aviso.textContent).toContain('12 minutos');
    expect(screen.getByRole('button', { name: 'Mergear' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toContainElement(aviso);
    expect(document.title).toBe('(1) Brabo');
  });

  it('na abertura, a PR que já esperava também é avisada', async () => {
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300')] });
    montar();
    expect(await screen.findByTestId('aviso-pr-pronta')).toBeInTheDocument();
  });

  it('Mergear → Confirmar propõe e aprova o git_merge', async () => {
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300')] });
    proposeAction.mockResolvedValue({ id: 'm1', status: 'pending' });
    approveAction.mockResolvedValue({ id: 'm1', status: 'executed', executionResult: null });
    const user = userEvent.setup();
    montar();
    await user.click(await screen.findByRole('button', { name: 'Mergear' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(approveAction).toHaveBeenCalledWith('proj-1', AQUI, 'm1'));
    expect(proposeAction).toHaveBeenCalledWith(
      'proj-1',
      AQUI,
      expect.objectContaining({ actionType: 'git_merge', payload: expect.objectContaining({ pullRequestId: '3' }) }),
    );
  });

  it('"Agora não" esconde o aviso, que não volta com a mesma PR, mas volta com uma PR nova; o título segue contando', async () => {
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300')] });
    const user = userEvent.setup();
    const { client } = montar();
    await user.click(await screen.findByRole('button', { name: 'Agora não' }));
    expect(screen.queryByTestId('aviso-pr-pronta')).toBeNull();

    await reler(client);
    expect(screen.queryByTestId('aviso-pr-pronta')).toBeNull();
    expect(document.title).toBe('(1) Brabo');

    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300'), pr('4', 'docs/adr-0301')] });
    await reler(client);
    const aviso = await screen.findByTestId('aviso-pr-pronta');
    expect(aviso.textContent).toContain('PR #4');
    expect(document.title).toBe('(2) Brabo');
  });

  it('com 2 PRs mostra "Ver as 2" e abre a aba prontas', async () => {
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300'), pr('4', 'docs/adr-0301')] });
    const aberta = vi.fn();
    window.addEventListener(EVENTO_ABRIR_FILA, aberta);
    const user = userEvent.setup();
    montar();
    expect((await screen.findByTestId('aviso-pr-pronta')).textContent).toContain('2 PRs prontas para você mergear');
    await user.click(screen.getByRole('button', { name: 'Ver as 2' }));
    expect((aberta.mock.calls[0]![0] as CustomEvent).detail).toBe('prontas');
    window.removeEventListener(EVENTO_ABRIR_FILA, aberta);
  });

  it('o título volta ao normal quando a PR sai da fila ou a tela desmonta', async () => {
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300')] });
    const { client, unmount } = montar();
    await screen.findByTestId('aviso-pr-pronta');
    getCodePullRequests.mockResolvedValue({ items: [] });
    await reler(client);
    await waitFor(() => expect(document.title).toBe('Brabo'));
    getCodePullRequests.mockResolvedValue({ items: [pr('3', 'docs/adr-0300')] });
    await reler(client);
    await waitFor(() => expect(document.title).toBe('(1) Brabo'));
    unmount();
    expect(document.title).toBe('Brabo');
  });
});

describe('helpers do aviso', () => {
  it('esperaRelativa fala no idioma da tela', () => {
    const agora = Date.parse('2026-11-07T12:00:00Z');
    expect(esperaRelativa('2026-11-07T11:48:00Z', 'pt-BR', agora)).toBe('há 12 minutos');
    expect(esperaRelativa('2026-11-07T11:48:00Z', 'en', agora)).toBe('12 minutes ago');
    expect(esperaRelativa('2026-11-07T09:00:00Z', 'en', agora)).toBe('3 hours ago');
  });
  it('tituloComContador', () => {
    expect(tituloComContador('Brabo', 0)).toBe('Brabo');
    expect(tituloComContador('Brabo', 2)).toBe('(2) Brabo');
  });
});
