import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ProposedAction } from '../lib/api-types';
import i18n from '../lib/i18n';
import { acaoEstaNoBloco } from '../lib/acoes-no-bloco';
import { ToastProvider } from './ui/ToastProvider';
import { CartaoOuReferenciaNoFio } from './CartaoOuReferenciaNoFio';

const getProjectPendingActions = vi.fn();
const approveAction = vi.fn();
const denyAction = vi.fn();
const approveAlwaysAction = vi.fn();
const listSessionEvents = vi.fn();
const getOpenPullRequestsDoChat = vi.fn();
const getCodePullRequests = vi.fn();
const listBacklog = vi.fn();
const proposeAction = vi.fn();
const unblockTask = vi.fn();
const getOpenQuestions = vi.fn();
const getActiveExecutionSession = vi.fn();
const rearmDevAgent = vi.fn();
const listWorkspaces = vi.fn();
const updateProject = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    getProjectPendingActions: (...a: unknown[]) => getProjectPendingActions(...a),
    approveAction: (...a: unknown[]) => approveAction(...a),
    denyAction: (...a: unknown[]) => denyAction(...a),
    approveAlwaysAction: (...a: unknown[]) => approveAlwaysAction(...a),
    listSessionEvents: (...a: unknown[]) => listSessionEvents(...a),
    getOpenPullRequestsDoChat: (...a: unknown[]) => getOpenPullRequestsDoChat(...a),
    getCodePullRequests: (...a: unknown[]) => getCodePullRequests(...a),
    listBacklog: (...a: unknown[]) => listBacklog(...a),
    proposeAction: (...a: unknown[]) => proposeAction(...a),
    unblockTask: (...a: unknown[]) => unblockTask(...a),
    getOpenQuestions: (...a: unknown[]) => getOpenQuestions(...a),
    getActiveExecutionSession: (...a: unknown[]) => getActiveExecutionSession(...a),
    rearmDevAgent: (...a: unknown[]) => rearmDevAgent(...a),
    listWorkspaces: (...a: unknown[]) => listWorkspaces(...a),
    updateProject: (...a: unknown[]) => updateProject(...a),
  };
});

const { PendenciasDeOutrasSessoes } = await import('./PendenciasDeOutrasSessoes');
const { ApiError } = await import('../lib/api-client');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const AQUI = '11111111-aaaa-4aaa-8aaa-111111111111';
const EXECUCAO = 'd7e9d7e9-bbbb-4bbb-8bbb-222222222222';

function acao(id: string, over: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id,
    projectId: 'proj-1',
    sessionId: EXECUCAO,
    seq: 1,
    actionType: 'terminal',
    payload: { command: `npm test ${id}` },
    status: 'pending',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'agent', id: 'dev-api' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult: null,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function montar(
  podeDecidir = true,
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  filasDoChat = true,
) {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <PendenciasDeOutrasSessoes projectId="proj-1" sessionId={AQUI} podeDecidir={podeDecidir} filasDoChat={filasDoChat} />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function abrir(nome: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${nome} \\d`) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // O motivo da política de cada card é lido pela ação (AT-340); por padrão
  // o log responde sem o evento.
  listSessionEvents.mockResolvedValue({ items: [], nextCursor: null });
  getOpenPullRequestsDoChat.mockResolvedValue({ items: [] });
  listBacklog.mockResolvedValue([]);
  getOpenQuestions.mockResolvedValue({ itens: [], total: 0 });
  getActiveExecutionSession.mockResolvedValue(null);
  listWorkspaces.mockResolvedValue([{ workspace: { id: 'w1' }, role: 'maintainer' }]);
});

describe('PendenciasDeOutrasSessoes (AT-265)', () => {
  it('RN-943: no chat, com pergunta da PRÓPRIA sessão, o título é do projeto', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: [{
        questionId: 'q1', eventId: 'ev-q1', sessionId: AQUI, pergunta: 'Qual banco?', sugestao: 'Postgres',
        afeta: { regras: [], historias: [], tarefas: [] }, autor: 'criativo',
        criadaEm: new Date().toISOString(), status: 'open', autorDaSessao: 'u', resposta: null,
      }],
      total: 1,
    });
    montar();
    const topo = await screen.findByRole('button', { name: /Pendências deste projeto/ });
    expect(topo).not.toHaveTextContent(/outras sessões/);
  });

  it('AT-713: a nota do atalho mora no "?" da seção', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    montar(true, undefined, false);
    // AT-1007 (RN-1491): na Execução a seção nasce recolhida e abre ao clicar.
    fireEvent.click(await screen.findByRole('button', { name: /Pendências de outras sessões deste projeto/ }));
    expect(await screen.findByRole('button', { name: 'Ajuda: Filas de pendências' })).toBeInTheDocument();
  });

  it('AT-721: o "?" fica na linha das abas, não numa linha sozinha', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    montar(true, undefined, false);
    fireEvent.click(await screen.findByRole('button', { name: /Pendências de outras sessões deste projeto/ }));
    const ajuda = await screen.findByRole('button', { name: 'Ajuda: Filas de pendências' });
    expect(ajuda.closest('[role="group"]')).not.toBeNull();
  });

  it('RN-943 (falha): sem as filas do chat (Executores) o título antigo continua', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    montar(true, undefined, false);
    expect(await screen.findByRole('button', { name: /Pendências de outras sessões deste projeto/ })).toBeInTheDocument();
  });

  it('mostra as pendências da outra sessão, com filas separadas e decide pelo endpoint com o sessionId DA AÇÃO', async () => {
    getProjectPendingActions.mockResolvedValue([
      acao('a1'),
      acao('a2'),
      acao('m1', {
        actionType: 'git_merge',
        payload: { pullRequestId: '7', sourceBranch: 'feature/x', targetBranch: 'dev' },
      }),
      // A da sessão atual o fio já desenha: não repete aqui.
      acao('propria', { sessionId: AQUI }),
    ]);
    approveAction.mockResolvedValue({});

    montar();

    await abrir('Merges de PR');
    const merges = await screen.findByRole('region', { name: 'Merges de PR' });
    await abrir('Aprovações');
    const aprovacoes = await screen.findByRole('region', { name: 'Aprovações' });
    // Contagens por fila, nunca somadas.
    expect(within(aprovacoes).getByText('2')).toBeInTheDocument();
    expect(within(merges).getByText('1')).toBeInTheDocument();
    expect(screen.queryByText(/npm test propria/)).toBeNull();
    // De onde vem é dito UMA vez por sessão (AT-318): as duas aprovações são
    // da mesma sessão, e o rótulo não se repete entre um card e outro.
    expect(within(aprovacoes).getAllByText(/propostas na sessão #/)).toHaveLength(1);
    expect(within(merges).getAllByText(/Proposta na sessão #/)).toHaveLength(1);

    fireEvent.click(within(aprovacoes).getAllByRole('button', { name: 'Aprovar' })[0]!);
    await waitFor(() => expect(approveAction).toHaveBeenCalledWith('proj-1', EXECUCAO, 'a1'));
  });

  it('CASO DE FALHA: papel abaixo de developer VÊ a pendência, com os controles inertes e o motivo em texto', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);

    montar(false);

    await abrir('Aprovações');

    expect((await screen.findAllByText(/npm test a1/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled();
    expect(screen.getByTestId('bloqueio-da-decisao')).toHaveTextContent('papel developer');
  });

  it('a recusa 409 da api aparece no card, sem toast genérico', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    approveAction.mockRejectedValue(new ApiError(409, { message: 'A ação já foi decidida.' }));

    montar();

    await abrir('Aprovações');

    fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }));
    expect(await screen.findByTestId('recusa-da-decisao')).toHaveTextContent('A ação já foi decidida.');
  });

  it('sem pendência de outra sessão, não desenha nada', async () => {
    getProjectPendingActions.mockResolvedValue([acao('propria', { sessionId: AQUI })]);
    const { container } = montar();
    await waitFor(() => expect(getProjectPendingActions).toHaveBeenCalled());
    expect(container.querySelector('[data-testid="pendencias-de-outras-sessoes"]')).toBeNull();
  });

  it('AT-680 (RN-975): 23 aprovações dão "1–3 de 23" e a fila diz que é recorte', async () => {
    getProjectPendingActions.mockResolvedValue(Array.from({ length: 23 }, (_, i) => acao(`t${i}`)));
    montar();
    expect(await screen.findByText('1–3 de 23')).toBeInTheDocument();
  });
});

describe('PendenciasDeOutrasSessoes — paginação por fila (AT-680, RN-975)', () => {
  const sete = () => Array.from({ length: 7 }, (_, i) => acao(`p${i}`));

  it('3 por página, navega com o teclado, anuncia a faixa e mantém o total da fila', async () => {
    getProjectPendingActions.mockResolvedValue(sete());
    montar();
    await abrir('Aprovações');
    const fila = await screen.findByRole('region', { name: 'Aprovações' });
    expect(within(fila).getAllByRole('button', { name: 'Aprovar' })).toHaveLength(3);
    expect(within(fila).getByRole('status')).toHaveTextContent('1–3 de 7');
    // O total da fila e o cabeçalho seguem 7, nunca a página nem a soma.
    expect(within(fila).getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pendências deste projeto/ })).toHaveTextContent('Aprovações 7');

    const proxima = within(fila).getByRole('button', { name: 'Próxima página de Aprovações' });
    proxima.focus();
    expect(proxima).toHaveFocus();
    fireEvent.click(proxima);
    expect(within(fila).getByRole('status')).toHaveTextContent('4–6 de 7');
    fireEvent.click(within(fila).getByRole('button', { name: 'Próxima página de Aprovações' }));
    expect(within(fila).getByRole('status')).toHaveTextContent('7–7 de 7');
    expect(within(fila).getByRole('button', { name: 'Próxima página de Aprovações' })).toBeDisabled();
  });

  it('decidir o último item da última página faz a página voltar', async () => {
    getProjectPendingActions.mockResolvedValue(sete());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    montar(true, client);
    await abrir('Aprovações');
    const fila = await screen.findByRole('region', { name: 'Aprovações' });
    fireEvent.click(within(fila).getByRole('button', { name: 'Próxima página de Aprovações' }));
    fireEvent.click(within(fila).getByRole('button', { name: 'Próxima página de Aprovações' }));
    expect(within(fila).getByRole('status')).toHaveTextContent('7–7 de 7');
    getProjectPendingActions.mockResolvedValue(sete().slice(0, 6));
    await client.invalidateQueries({ queryKey: ['project-pending-actions'] });
    await waitFor(() => expect(within(fila).getByRole('status')).toHaveTextContent('4–6 de 6'));
  });

  it('CASO DE FALHA: com 3 itens não há paginador', async () => {
    getProjectPendingActions.mockResolvedValue(sete().slice(0, 3));
    montar();
    await abrir('Aprovações');
    const fila = await screen.findByRole('region', { name: 'Aprovações' });
    expect(within(fila).queryByRole('status')).toBeNull();
    expect(within(fila).queryByRole('button', { name: /Próxima página/ })).toBeNull();
  });
});

describe('PendenciasDeOutrasSessoes — cabe na coluna e mostra todos (AT-318)', () => {
  it('três cards da mesma sessão: os três à vista, com o detalhe FECHADO, e a presença por fila no cabeçalho', async () => {
    getProjectPendingActions.mockResolvedValue([
      acao('c1', { actionType: 'container_start', payload: { imagem: 'node:22' } }),
      acao('c2'),
      acao('c3'),
      acao('m1', {
        actionType: 'git_merge',
        payload: { pullRequestId: '7', sourceBranch: 'feature/x', targetBranch: 'dev' },
      }),
    ]);

    montar();

    await abrir('Aprovações');

    const aprovacoes = await screen.findByRole('region', { name: 'Aprovações' });
    expect(within(aprovacoes).getAllByRole('button', { name: 'Aprovar' })).toHaveLength(3);
    // Nenhum detalhe nasce aberto: empilhados, eles empurravam os outros cards.
    expect(within(aprovacoes).queryAllByRole('button', { expanded: true })).toHaveLength(0);
    expect(within(aprovacoes).getAllByRole('button', { expanded: false }).length).toBeGreaterThanOrEqual(3);
    // Presença por fila, cada uma com o próprio número — nunca "4".
    const topo = screen.getByRole('button', { name: /Pendências deste projeto/ });
    expect(topo).toHaveTextContent('Aprovações 3 · Merges de PR 1');
    expect(topo).not.toHaveTextContent(/\b4\b/);
  });

  it('recolhido, o bloco some do fio mas a presença continua no cabeçalho', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    montar();

    const topo = await screen.findByRole('button', { name: /Pendências deste projeto/ });
    fireEvent.click(topo);

    expect(topo).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    expect(topo).toHaveTextContent('Aprovações 1');
  });
});

/**
 * AT-340 (RN-656) — cada card das pendências de outras sessões mostra o motivo
 * da política, lido pela ação na sessão que a propôs, com o MESMO cache da aba
 * Aprovações.
 */
describe('PendenciasDeOutrasSessoes — motivo da política (AT-340)', () => {
  const criada = (actionId: string) => ({
    id: `evt-${actionId}`,
    sessionId: EXECUCAO,
    seq: 3,
    type: 'proposed_action.created',
    actor: { kind: 'agent', id: 'dev-api' },
    payload: {
      actionId,
      actionType: 'terminal',
      status: 'pending',
      reason: 'comando fora da allowlist',
      scopeRoot: { ancora: 'workspace', segmento: 'proj-1' },
    },
    createdAt: new Date().toISOString(),
  });

  it('lê o motivo pela ação, na sessão DELA, uma vez só enquanto o cache viver', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    listSessionEvents.mockResolvedValue({ items: [criada('a1')], nextCursor: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { unmount } = montar(true, client);
    const motivo = await screen.findByTestId('motivo-da-politica');
    expect(motivo).toHaveTextContent('comando fora da allowlist');
    expect(listSessionEvents).toHaveBeenCalledWith('proj-1', EXECUCAO, {
      actionId: 'a1',
      limit: 200,
    });

    // Remontar (voltar ao chat, abrir outra sessão) não relê: evento é
    // imutável, `staleTime: Infinity` — a mesma chave da aba Aprovações.
    unmount();
    montar(true, client);
    expect(await screen.findByTestId('motivo-da-politica')).toHaveTextContent(
      'comando fora da allowlist',
    );
    expect(listSessionEvents).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('motivo-nao-lido')).toBeNull();
  });

  it('CASO DE FALHA: a leitura que falha deixa o card calado e diz a lacuna UMA vez', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1'), acao('a2')]);
    listSessionEvents.mockImplementation(
      async (_p: string, _s: string, o: { actionId: string }) => {
        if (o.actionId === 'a2') throw new ApiError(500, 'falhou');
        return { items: [criada('a1')], nextCursor: null };
      },
    );

    montar();

    const nota = await screen.findByTestId('motivo-nao-lido');
    expect(nota).toHaveTextContent('1 dos 2 cards');
    // Só o card lido fala; o da leitura falha não inventa motivo nem diz
    // "não registrado", que é o que a api afirma quando responde sem evento.
    expect(screen.getAllByTestId('motivo-da-politica')).toHaveLength(1);
  });
});

function pr(id: string, sourceBranch: string) {
  return {
    id,
    number: Number(id),
    title: `PR ${id}`,
    url: '',
    author: null,
    state: 'open',
    sourceBranch,
    targetBranch: 'dev',
    updatedAt: null,
  };
}

function backlog(tarefas: Record<string, unknown>[], moduleIds?: string[]) {
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
          moduleIds,
          tasks: tarefas.map((t) => ({
            storyId: 's1',
            description: '',
            status: 'in_review',
            assignedTo: null,
            blocked: false,
            blockedReason: null,
            gateStatus: null,
            gateCorrectionCount: 0,
            createdAt: '',
            updatedAt: '',
            ...t,
          })),
        },
      ],
    },
  ];
}

describe('PendenciasDeOutrasSessoes — PRs prontas e tarefas bloqueadas (AT-497, RN-825/826)', () => {
  it('a PR com os gates aprovados aparece, a com gate pendente não, e a proposta pendente da sessão vira o cartão ali', async () => {
    getProjectPendingActions.mockResolvedValue([
      acao('m-novo', {
        sessionId: AQUI,
        actionType: 'git_merge',
        actor: { kind: 'user', id: 'u' },
        payload: { pullRequestId: '1', sourceBranch: 'feature/task-aaaaaaaa', targetBranch: 'dev' },
      }),
    ]);
    getOpenPullRequestsDoChat.mockResolvedValue({
      items: [pr('1', 'feature/task-aaaaaaaa'), pr('2', 'feature/task-bbbbbbbb'), pr('3', 'docs/adr-0300')],
    });
    listBacklog.mockResolvedValue(
      backlog([
        { id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_user' },
        { id: 'bbbbbbbb-1', title: 'Em QA', gateStatus: 'awaiting_qa' },
      ]),
    );

    montar();
    // RN-1063: a PR que entra na fila abre a aba sozinha.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^PRs prontas para merge \d/ })).toHaveAttribute('aria-pressed', 'true'),
    );

    const fila = await screen.findByTestId('fila-prs-prontas');
    expect(within(fila).getByText(/PR 1/)).toBeInTheDocument();
    // PR de ADR (sem tarefa) também é pronta; a de gate pendente, não.
    expect(within(fila).getByText(/PR 3/)).toBeInTheDocument();
    expect(within(fila).queryByText(/PR 2/)).toBeNull();

    // A PR 3 (sem proposta) oferece o Mergear; a 1 mostra o cartão.
    expect(within(fila).getAllByRole('button', { name: 'Mergear' })).toHaveLength(1);
    expect(await within(fila).findByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    // RN-843: a ação desenhada aqui fica registrada para o fio recolher a dele.
    expect(acaoEstaNoBloco('m-novo')).toBe(true);

    // RN-843: recolher o bloco desmonta o cartão e o desregistra — o fio volta
    // ao cartão completo; abrir de novo devolve a referência.
    const fioDaAcao = {
      id: 'm-novo',
      status: 'pending',
    } as unknown as ProposedAction;
    render(
      <div data-testid="fio">
        <CartaoOuReferenciaNoFio action={fioDaAcao}>
          <button type="button">Aprovar</button>
        </CartaoOuReferenciaNoFio>
      </div>,
    );
    const fio = screen.getByTestId('fio');
    expect(within(fio).queryByRole('button', { name: 'Aprovar' })).toBeNull();
    const cabecalho = document.querySelector('[aria-expanded="true"]') as HTMLElement;
    fireEvent.click(cabecalho);
    expect(acaoEstaNoBloco('m-novo')).toBe(false);
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
    expect(within(fio).getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    fireEvent.click(document.querySelector('[aria-expanded="false"]') as HTMLElement);
    expect(await within(screen.getByTestId('fila-prs-prontas')).findByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(acaoEstaNoBloco('m-novo')).toBe(true);
    expect(within(fio).queryByRole('button', { name: 'Aprovar' })).toBeNull();
  });

  it('AT-843: com /code/pull-requests em 409 (sem imagem decidida), a fila "prontas" mostra a PR', async () => {
    getCodePullRequests.mockRejectedValue(new Error('409 sem_decisao'));
    getProjectPendingActions.mockResolvedValue([]);
    getOpenPullRequestsDoChat.mockResolvedValue({ items: [pr('1', 'feature/task-aaaaaaaa')] });
    listBacklog.mockResolvedValue(backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_user' }]));
    montar();
    expect(await screen.findByTestId('fila-prs-prontas')).toBeInTheDocument();
    expect(getCodePullRequests).not.toHaveBeenCalled();
  });

  it('AT-753 (UX-2): Mergear confirma num Popover (AT-960); Confirmar propõe e aprova, Cancelar não chama nada', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    getOpenPullRequestsDoChat.mockResolvedValue({ items: [pr('1', 'feature/task-aaaaaaaa')] });
    listBacklog.mockResolvedValue(backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_user' }]));
    proposeAction.mockResolvedValue(acao('m-vis', { sessionId: AQUI, actionType: 'git_merge' }));
    approveAction.mockResolvedValue(acao('m-vis', { sessionId: AQUI, actionType: 'git_merge', status: 'executed' }));
    const user = userEvent.setup();
    montar();
    // RN-1063: a aba `prontas` abre sozinha quando a PR entra na fila.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^PRs prontas para merge \d/ })).toHaveAttribute('aria-pressed', 'true'),
    );
    const fila = await screen.findByTestId('fila-prs-prontas');
    await user.click(within(fila).getByRole('button', { name: 'Mergear' }));
    // O Popover vive em portal, fora da fila.
    expect(screen.getByText('Mergear #1 em dev?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(proposeAction).not.toHaveBeenCalled();
    await user.click(within(fila).getByRole('button', { name: 'Mergear' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(approveAction).toHaveBeenCalledWith('proj-1', AQUI, 'm-vis'));
    expect(proposeAction).toHaveBeenCalledTimes(1);
    expect(await within(fila).findByText('Mergeada')).toBeInTheDocument();
  });

  it('AT-1021 (RN-1531): o relato cru só aparece em "Ver detalhes técnicos"; a frase principal é a causa genérica', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 't9', title: 'Tarefa 9', blocked: true, blockedReason: 'Falta o validador — o diagnóstico longo' }]),
    );
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).getByTestId('causa-do-bloqueio')).toHaveTextContent('O agente parou e precisa de você para continuar.');
    expect(within(fila).queryByText(/o diagnóstico longo/)).toBeNull();
    fireEvent.click(within(fila).getByRole('button', { name: 'Ver detalhes técnicos' }));
    expect(within(fila).getByText('Falta o validador — o diagnóstico longo')).toBeInTheDocument();
  });

  it('AT-912/RN-1397: com a execução ativa, a tarefa sem módulo em história de vários módulos aparece', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    getActiveExecutionSession.mockResolvedValue({ id: 'exec-1', status: 'active' });
    listBacklog.mockResolvedValue(backlog([{ id: 't7', title: 'Tarefa 7', status: 'todo' }], ['a', 'b']));
    montar();
    await abrir('Tarefas sem módulo');
    const fila = await screen.findByTestId('fila-tarefas-sem-modulo');
    expect(within(fila).getByText('Tarefa 7')).toBeInTheDocument();
    expect(within(fila).getByText(/Sem módulo: ninguém vai pegar/)).toBeInTheDocument();
  });

  it('RN-1397 (falha): antes do plano (sem execução ativa) a fila "Tarefas sem módulo" não aparece', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    getActiveExecutionSession.mockResolvedValue(null);
    listBacklog.mockResolvedValue(backlog([{ id: 't7', title: 'Tarefa 7', status: 'todo' }], ['a', 'b']));
    montar();
    await waitFor(() => expect(listBacklog).toHaveBeenCalled());
    await waitFor(() => expect(getActiveExecutionSession).toHaveBeenCalled());
    expect(screen.queryByTestId('fila-tarefas-sem-modulo')).toBeNull();
  });

  it('AT-912 (falha): história de um módulo só não gera a fila', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(backlog([{ id: 't7', title: 'Tarefa 7', status: 'todo' }], ['a']));
    montar();
    await waitFor(() => expect(listBacklog).toHaveBeenCalled());
    expect(screen.queryByTestId('fila-tarefas-sem-modulo')).toBeNull();
  });

  it('AT-753 (UX-7): a PR que sai da fila dá um aviso; a primeira leitura não avisa nada', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    getOpenPullRequestsDoChat.mockResolvedValue({ items: [pr('1', 'feature/task-aaaaaaaa')] });
    listBacklog.mockResolvedValue(backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_user' }]));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    montar(true, client);
    await screen.findByTestId('fila-prs-prontas');
    expect(screen.queryByTestId('saidas-da-fila')).toBeNull();
    getOpenPullRequestsDoChat.mockResolvedValue({ items: [] });
    await client.invalidateQueries({ queryKey: ['code-pull-requests'] });
    expect(await screen.findByTestId('saidas-da-fila')).toHaveTextContent('Saiu da fila: 1 PR pronta');
    fireEvent.click(screen.getByRole('button', { name: 'Dispensar' }));
    expect(screen.queryByTestId('saidas-da-fila')).toBeNull();
  });

  it('RN-841: a tarefa que entra em awaiting_user relê as PRs, e a PR nova aparece sem remontar', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    getOpenPullRequestsDoChat.mockResolvedValueOnce({ items: [] });
    listBacklog.mockResolvedValueOnce(
      backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_qa' }]),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidar = vi.spyOn(client, 'invalidateQueries');
    montar(true, client);
    await waitFor(() => expect(getOpenPullRequestsDoChat).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(listBacklog).toHaveBeenCalledTimes(1));

    getOpenPullRequestsDoChat.mockResolvedValue({ items: [pr('1', 'feature/task-aaaaaaaa')] });
    listBacklog.mockResolvedValue(
      backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_user' }]),
    );
    // A leitura de 15 s do backlog, simulada.
    await client.invalidateQueries({ queryKey: ['backlog'] });

    const fila = await screen.findByTestId('fila-prs-prontas');
    expect(within(fila).getByText(/PR 1/)).toBeInTheDocument();
    expect(getOpenPullRequestsDoChat).toHaveBeenCalledTimes(2);
    // RN-847 (AT-518): o resumo do contexto é invalidado junto.
    expect(
      invalidar.mock.calls.some(
        ([f]) => JSON.stringify(f?.queryKey) === JSON.stringify(['session-context-summary', 'proj-1']),
      ),
    ).toBe(true);
  });

  it('CASO DE FALHA RN-841: backlog relido sem mudança não relê as PRs', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 'aaaaaaaa-1', title: 'Pronta', gateStatus: 'awaiting_qa' }]),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    montar(true, client);
    await waitFor(() => expect(listBacklog).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getOpenPullRequestsDoChat).toHaveBeenCalledTimes(1));
    await client.invalidateQueries({ queryKey: ['backlog'] });
    await waitFor(() => expect(listBacklog).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(getOpenPullRequestsDoChat).toHaveBeenCalledTimes(1);
  });

  it('CASO DE FALHA: desbloquear com erro diz o erro da api na linha da tarefa', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 't8', title: 'Tarefa 8', blocked: true, blockedReason: 'ciclo de correção esgotado' }]),
    );
    unblockTask.mockRejectedValue(new ApiError(409, { message: 'a tarefa não está bloqueada' }));

    montar();

    await abrir('Tarefas bloqueadas');

    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).queryByText('ciclo de correção esgotado')).toBeNull();
    fireEvent.click(within(fila).getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(unblockTask).toHaveBeenCalledWith('proj-1', AQUI, 't8', ''));
    expect(await within(fila).findByTestId('retorno-desbloqueio')).toHaveTextContent(
      'a tarefa não está bloqueada',
    );
  });

  it('AT-917: a tarefa bloqueada por orçamento oferece "Aumentar o teto" e grava o teto do projeto (maintainer)', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 'tp', title: 'Tarefa P', blocked: true, blockedReason: 'teto', blockedOrigin: 'politica' }]),
    );
    updateProject.mockResolvedValue({});
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    fireEvent.click(await within(fila).findByRole('button', { name: 'Aumentar o teto por tarefa' }));
    fireEvent.change(within(fila).getByLabelText('Novo teto por tarefa (US$)'), { target: { value: '2' } });
    fireEvent.click(within(fila).getByRole('button', { name: 'Gravar o teto' }));
    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('proj-1', { taskBudgetMicros: 2_000_000 }));
  });

  it('AT-917: sem o papel maintainer o botão fica inerte e o motivo aparece em texto', async () => {
    listWorkspaces.mockResolvedValue([{ workspace: { id: 'w1' }, role: 'developer' }]);
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 'tq', title: 'Tarefa Q', blocked: true, blockedReason: 'teto', blockedOrigin: 'politica' }]),
    );
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(await within(fila).findByRole('button', { name: 'Aumentar o teto por tarefa' })).toBeDisabled();
    expect(within(fila).getByText('Aumentar o teto exige o papel maintainer no projeto.')).toBeInTheDocument();
  });

  it('AT-909: a orientação digitada vai no desbloqueio e o botão fica inerte durante o envio (um clique, uma chamada)', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(backlog([{ id: 't9', title: 'Tarefa 9', blocked: true, blockedReason: 'x' }]));
    let liberar: (v: unknown) => void = () => {};
    unblockTask.mockReturnValue(new Promise((r) => (liberar = r)));

    montar();
    await abrir('Tarefas bloqueadas');

    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    fireEvent.click(within(fila).getByRole('button', { name: 'Escrever outra orientação' }));
    fireEvent.change(within(fila).getByLabelText('Orientação para o dev (opcional)'), {
      target: { value: '  suba pelo start  ' },
    });
    const botao = within(fila).getByRole('button', { name: 'Desbloquear com este texto' });
    fireEvent.click(botao);
    fireEvent.click(botao);
    await waitFor(() => expect(botao).toBeDisabled());
    expect(unblockTask).toHaveBeenCalledTimes(1);
    expect(unblockTask).toHaveBeenCalledWith('proj-1', AQUI, 't9', 'suba pelo start');
    liberar({ ok: true });
    expect(await within(fila).findByTestId('retorno-desbloqueio')).toBeInTheDocument();
  });
});

// AT-1021 (RN-1531): as paradas do TP-01 30ª (L2, L3, L5, L7, L8, L10) com os textos reais. Em cada
// uma: causa sem jargão, um botão que retoma em UM clique com a orientação da ação, relato cru recolhido.
const JARGAO = /`|[a-z]+_[a-z]+|\.(json|lock|ts|ex|yml)\b|ECONN|\d+\.\d+\.\d+\.\d+/;
const PARADAS: {
  l: string;
  cru: string;
  explicacao?: Record<string, unknown>;
  botao: string;
  orientacao: string;
}[] = [
  {
    l: 'L2',
    cru: 'QA de Automação não subiu a instância de QA (teto de 1 instância atingido)',
    explicacao: {
      codigo: 'qa_instancia_indisponivel',
      causa: 'O ambiente de teste de qualidade não ficou disponível agora.',
      acoes: [{ id: 'tentar_de_novo', rotulo: 'Tentar de novo', orientacao: '' }],
    },
    botao: 'Tentar de novo',
    orientacao: '',
  },
  {
    l: 'L3',
    cru: 'A prova por HTTP com o processo de pé não foi feita: printRoutes mostra as rotas, mas o nohup encerrou com FST_ERR_CTP_INVALID_JSON_BODY.',
    explicacao: {
      causa: 'O agente não conseguiu testar o app rodando, mas os testes automáticos já passam.',
      acoes: [
        { rotulo: 'Concluir sem subir o app', orientacao: 'Conclua a tarefa sem subir o app.' },
        { rotulo: 'Deixar para o fim', orientacao: 'Deixe a subida do app para o fim.' },
      ],
    },
    botao: 'Concluir sem subir o app',
    orientacao: 'Conclua a tarefa sem subir o app.',
  },
  {
    l: 'L5',
    cru: 'package-lock.json da raiz alterado pelo npm install, sem cópia original para restaurar. report_done recusado.',
    explicacao: {
      causa: 'O agente alterou um arquivo de instalação do projeto e não sabe se pode mantê-lo.',
      acoes: [{ rotulo: 'Manter a alteração e concluir', orientacao: 'Mantenha a alteração e conclua.' }],
    },
    botao: 'Manter a alteração e concluir',
    orientacao: 'Mantenha a alteração e conclua.',
  },
  {
    l: 'L7',
    cru: 'run.qa.services indisponível: o módulo que monta o app ainda não entrou',
    explicacao: {
      causa: 'O app só sobe quando o módulo que o monta entrar.',
      acoes: [{ rotulo: 'Deixar para quando o módulo que monta o app entrar', orientacao: 'Adie o teste de subida.' }],
    },
    botao: 'Deixar para quando o módulo que monta o app entrar',
    orientacao: 'Adie o teste de subida.',
  },
  {
    l: 'L8',
    cru: 'app_saiu (código 1): connect ECONNREFUSED 127.0.0.1:5432',
    explicacao: {
      causa: 'O app não sobe porque o banco de dados só existe no ambiente completo.',
      acoes: [{ rotulo: 'Seguir: o banco só existe no compose', orientacao: 'Siga sem subir o banco.' }],
    },
    botao: 'Seguir: o banco só existe no compose',
    orientacao: 'Siga sem subir o banco.',
  },
  {
    l: 'L10 (sem explicação: dado antigo)',
    cru: 'o commit ou o push da correção foi recusado — desfechos (commit, push): [:refused, :executed]',
    botao: 'Tentar de novo',
    orientacao: '',
  },
];

describe('PendenciasDeOutrasSessoes — retomada em um clique (AT-1021, RN-1531)', () => {
  it.each(PARADAS)('$l: causa sem jargão, um clique retoma e o relato cru fica recolhido', async (p) => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([{ id: 'tl', title: 'Tarefa L', blocked: true, blockedReason: p.cru, blockedExplicacao: p.explicacao ?? null }]),
    );
    unblockTask.mockResolvedValue({ ok: true });
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    const causa = within(fila).getByTestId('causa-do-bloqueio').textContent ?? '';
    expect(causa).not.toMatch(JARGAO);
    expect(causa).not.toBe(p.cru);
    expect(within(fila).queryByText(p.cru)).toBeNull();
    fireEvent.click(within(fila).getByRole('button', { name: 'Ver detalhes técnicos' }));
    expect(within(fila).getByText(p.cru)).toBeInTheDocument();
    fireEvent.click(within(fila).getByRole('button', { name: p.botao }));
    await waitFor(() => expect(unblockTask).toHaveBeenCalledWith('proj-1', AQUI, 'tl', p.orientacao));
    expect(unblockTask).toHaveBeenCalledTimes(1);
    expect(await within(fila).findByTestId('retorno-desbloqueio')).toHaveTextContent('Retomado.');
  });

  it('o bloqueio do sistema é traduzido pelo código; sem tradução vale o texto da api', async () => {
    await i18n.changeLanguage('en');
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([
        {
          id: 'tl', title: 'T', blocked: true, blockedReason: 'x',
          blockedExplicacao: { codigo: 'qa_instancia_indisponivel', causa: 'texto pt', acoes: [{ id: 'tentar_de_novo', rotulo: 'Tentar de novo', orientacao: '' }] },
        },
        {
          id: 'tm', title: 'U', blocked: true, blockedReason: 'y',
          blockedExplicacao: { codigo: 'codigo_novo', causa: 'texto novo do catálogo', acoes: [{ rotulo: 'Seguir', orientacao: '' }] },
        },
      ]),
    );
    montar();
    await abrir('Blocked tasks');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).getByText('QA Automation could not start the test environment.')).toBeInTheDocument();
    expect(within(fila).getByText('texto novo do catálogo')).toBeInTheDocument();
    expect(within(fila).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    await i18n.changeLanguage('pt-BR');
  });

  it('o campo livre fica recolhido e continua disponível: a orientação digitada retoma', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(backlog([{ id: 'tf', title: 'F', blocked: true, blockedReason: 'x' }]));
    unblockTask.mockResolvedValue({ ok: true });
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).queryByLabelText('Orientação para o dev (opcional)')).toBeNull();
    fireEvent.click(within(fila).getByRole('button', { name: 'Escrever outra orientação' }));
    fireEvent.change(within(fila).getByLabelText('Orientação para o dev (opcional)'), { target: { value: 'faça assim' } });
    fireEvent.click(within(fila).getByRole('button', { name: 'Desbloquear com este texto' }));
    await waitFor(() => expect(unblockTask).toHaveBeenCalledWith('proj-1', AQUI, 'tf', 'faça assim'));
  });

  it('o teto: "Aumentar o teto e continuar" grava o teto e só então retoma; sem valor fica inerte', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([
        {
          id: 'tt', title: 'T', blocked: true, blockedReason: 'orçamento por tarefa excedido', blockedOrigin: 'politica',
          blockedExplicacao: {
            codigo: 'orcamento_excedido',
            causa: 'Esta tarefa gastou o limite de custo definido para cada tarefa.',
            acoes: [{ id: 'aumentar_o_teto', rotulo: 'Aumentar o teto e continuar', orientacao: 'Continue de onde parou.' }],
          },
        },
      ]),
    );
    updateProject.mockResolvedValue({});
    unblockTask.mockResolvedValue({ ok: true });
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    const botao = within(fila).getByRole('button', { name: 'Aumentar o teto e continuar' });
    expect(botao).toBeDisabled();
    fireEvent.change(within(fila).getByLabelText('Novo teto por tarefa (US$)'), { target: { value: '3' } });
    fireEvent.click(botao);
    await waitFor(() => expect(unblockTask).toHaveBeenCalledWith('proj-1', AQUI, 'tt', 'Continue de onde parou.'));
    expect(updateProject).toHaveBeenCalledWith('proj-1', { taskBudgetMicros: 3_000_000 });
  });

  it('o teto: se a gravação falha, a tarefa não é retomada', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([
        {
          id: 'tt', title: 'T', blocked: true, blockedReason: 'x', blockedOrigin: 'politica',
          blockedExplicacao: { causa: 'Gastou o limite.', acoes: [{ id: 'aumentar_o_teto', rotulo: 'Aumentar o teto e continuar', orientacao: 'Siga.' }] },
        },
      ]),
    );
    updateProject.mockRejectedValue(new ApiError(403, { message: 'sem papel' }));
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    fireEvent.change(within(fila).getByLabelText('Novo teto por tarefa (US$)'), { target: { value: '3' } });
    fireEvent.click(within(fila).getByRole('button', { name: 'Aumentar o teto e continuar' }));
    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(unblockTask).not.toHaveBeenCalled();
  });

  it('o bloqueio que só o dono resolve diz o que só ele pode fazer, e o botão repete a tentativa', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(
      backlog([
        {
          id: 'tc', title: 'C', blocked: true, blockedReason: '402 Payment Required',
          blockedExplicacao: { codigo: 'credito_do_provedor', causa: 'O saldo da conta do provedor de IA acabou, e só você pode recarregá-lo.', acoes: [] },
        },
      ]),
    );
    montar();
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).getByTestId('so-voce-pode')).toHaveTextContent('Recarregar o saldo na conta do provedor de IA');
    expect(within(fila).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('sem o papel developer os botões ficam inertes e o motivo é dito em texto', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    listBacklog.mockResolvedValue(backlog([{ id: 'ts', title: 'S', blocked: true, blockedReason: 'x' }]));
    montar(false);
    await abrir('Tarefas bloqueadas');
    const fila = await screen.findByTestId('fila-tarefas-bloqueadas');
    expect(within(fila).getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
    expect(within(fila).getByText('Desbloquear exige o papel developer no projeto.')).toBeInTheDocument();
  });
});

describe('PendenciasDeOutrasSessoes — faixa de abas (AT-680, RN-975)', () => {
  it('a aba só existe com fila > 0, nenhuma nasce aberta e o conteúdo fechado fica montado', async () => {
    getProjectPendingActions.mockResolvedValue([acao('a1'), acao('a2')]);
    montar();
    const aba = await screen.findByRole('button', { name: /^Aprovações 2/ });
    expect(screen.queryByRole('button', { name: /^Merges de PR \d/ })).toBeNull();
    expect(aba).toHaveAttribute('aria-pressed', 'false');
    // montado, só escondido
    expect(screen.getByTestId('pendencias-de-outras-sessoes').querySelectorAll('[hidden]').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/npm test a1/, { ignore: 'script' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    fireEvent.click(aba);
    expect(aba).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(2);
    fireEvent.click(aba);
    expect(aba).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
  });

  it('CASO DE FALHA: sem pendência nenhuma não há faixa', async () => {
    getProjectPendingActions.mockResolvedValue([]);
    montar();
    await waitFor(() => expect(getProjectPendingActions).toHaveBeenCalled());
    expect(screen.queryByRole('group', { name: 'Filas de pendências' })).toBeNull();
  });
});

describe('AT-799: fila Agentes travados', () => {
  const evento = (seq: number, type: string, id: string, payload = {}) => ({
    id: `e${seq}`, sessionId: 'exec-1', seq, type, actor: { kind: 'agent', id }, payload,
    createdAt: new Date().toISOString(),
  });

  it('mostra o agente travado com o motivo e Rearmar chama a rota com o agentId', async () => {
    getActiveExecutionSession.mockResolvedValue({ id: 'exec-1', status: 'active' });
    listSessionEvents.mockResolvedValue({
      items: [
        evento(1, 'dev.idle_tripped', 'dev-core', { consecutiveBlocked: 3 }),
        evento(2, 'backlog.task_blocked', 'dev-core'),
      ],
      nextCursor: null,
    });
    rearmDevAgent.mockResolvedValue({ ok: true });
    montar();
    await abrir('Agentes travados');
    const item = await screen.findByTestId('agente-travado');
    expect(item).toHaveTextContent('dev-core');
    fireEvent.click(within(item).getByRole('button', { name: 'Rearmar' }));
    await waitFor(() => expect(rearmDevAgent).toHaveBeenCalledWith('proj-1', 'exec-1', 'dev-core'));
    expect(await screen.findByTestId('retorno-rearme')).toHaveTextContent('Agente rearmado');
  });

  it('sem agente travado a fila não aparece', async () => {
    getActiveExecutionSession.mockResolvedValue({ id: 'exec-1', status: 'active' });
    getProjectPendingActions.mockResolvedValue([acao('a1')]);
    montar();
    await screen.findByRole('button', { name: /^Aprovações \d/ });
    expect(screen.queryByTestId('fila-agentes-travados')).toBeNull();
  });

  it('AT-950 (RN-626): no Sheet, Tabs só das filas com itens, UMA pergunta por vez e o campo só quando pedido', async () => {
    const pergunta = (id: string, texto: string) => ({
      questionId: id, eventId: `ev-${id}`, sessionId: AQUI, pergunta: texto, sugestao: 'Postgres',
      afeta: { regras: [], historias: [], tarefas: [] }, autor: 'criativo',
      criadaEm: new Date().toISOString(), status: 'open', autorDaSessao: 'u', resposta: null,
    });
    getOpenQuestions.mockResolvedValue({ itens: [pergunta('q1', 'Qual banco?'), pergunta('q2', 'Qual fila?')], total: 2 });
    getProjectPendingActions.mockResolvedValue([]);
    const contar = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider>
          <PendenciasDeOutrasSessoes
            modo="sheet"
            aberto
            aoContar={contar}
            projectId="proj-1"
            sessionId={AQUI}
            podeDecidir
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    // Só a fila com itens vira aba.
    const abas = await screen.findAllByRole('tab');
    expect(abas).toHaveLength(1);
    expect(abas[0]).toHaveTextContent('Perguntas em aberto');
    await waitFor(() => expect(contar).toHaveBeenLastCalledWith(2));
    // Uma pergunta por vez; "Aceitar sugestão" com texto; o campo só abre em "Responder com texto".
    expect(await screen.findAllByTestId('pergunta-em-aberto')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aceitar sugestão' })).toHaveTextContent('Aceitar sugestão');
    expect(screen.queryByRole('textbox', { name: /Sua resposta/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Responder com texto' }));
    expect(screen.getByRole('textbox', { name: /Sua resposta/ })).toBeInTheDocument();
  });
});

describe('PendenciasDeOutrasSessoes — fila "Esperando você neste chat" (RN-1510, AT-1022)', () => {
  const oferta = (id: string, status: 'offered' | 'accepted') =>
    ({ id, sessionId: AQUI, projectId: 'proj-1', fromAgent: 'po', toAgent: 'dev-lead', artifactId: null, status, createdAt: '', updatedAt: '' }) as never;

  function montarNoChat(acoes: ProposedAction[], ofertas: never[] = [], aoContar = vi.fn(), aoVerNoChat = vi.fn()) {
    getProjectPendingActions.mockResolvedValue([]);
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider>
          <PendenciasDeOutrasSessoes
            modo="painel"
            projectId="proj-1"
            sessionId={AQUI}
            podeDecidir
            acoesDaSessao={acoes}
            ofertasDaSessao={ofertas}
            aoContar={aoContar}
            aoVerNoChat={aoVerNoChat}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );
    return { aoContar, aoVerNoChat };
  }

  it('ação da sessão aberta vira UMA linha com "Ver no chat" e entra na contagem, sem segundo cartão', async () => {
    const a = acao('a1', { sessionId: AQUI, actionType: 'open_adr_pr', payload: {} });
    const alvo = document.createElement('div');
    alvo.id = 'acao-a1';
    alvo.scrollIntoView = vi.fn();
    document.body.append(alvo);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { aoContar, aoVerNoChat } = montarNoChat([a]);
    expect(await screen.findByTestId('fila-no-chat')).toBeInTheDocument();
    expect(screen.getAllByTestId('linha-no-chat')).toHaveLength(1);
    expect(screen.queryByText('Aprovar')).toBeNull();
    expect(acaoEstaNoBloco('a1')).toBe(false);
    await waitFor(() => expect(aoContar).toHaveBeenLastCalledWith(1));
    fireEvent.click(screen.getByRole('button', { name: 'Ver no chat' }));
    expect(aoVerNoChat).toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(alvo.scrollIntoView).toHaveBeenCalled();
    vi.useRealTimers();
    alvo.remove();
  });

  it('só oferta `offered` entra; ação decidida ou de outra sessão não conta aqui', async () => {
    montarNoChat(
      [acao('x', { sessionId: AQUI, status: 'approved' }), acao('y', { sessionId: EXECUCAO })],
      [oferta('h1', 'offered'), oferta('h2', 'accepted')],
    );
    expect(await screen.findAllByTestId('linha-no-chat')).toHaveLength(1);
    expect(screen.getByText(/passou a vez para/)).toBeInTheDocument();
  });

  it('sem nada, a fila não existe e nada é desenhado (o vazio é do painel)', async () => {
    const { aoContar } = montarNoChat([]);
    await waitFor(() => expect(aoContar).toHaveBeenCalledWith(0));
    expect(screen.queryByTestId('fila-no-chat')).toBeNull();
  });
});
