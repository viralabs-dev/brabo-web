import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { simularLayoutMovel } from '../test/match-media';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './Dashboard';
import { ApiError } from '../lib/api-client';
// A instância REAL do app: `Dashboard.tsx` usa `useTranslation('dashboard')`
// sem `I18nextProvider` próprio (mesmo padrão de `ProjectExecutorsTab.test.tsx`)
// — `changeLanguage('pt-BR')` mantém as asserções abaixo no texto de sempre.
import i18n from '../lib/i18n';
import type { Project, ProjectCardSummary, WorkspaceSummary } from '../lib/api-types';

const PROJECT: Project = {
  id: 'project-1',
  workspaceId: 'ws-1',
  name: 'Core API',
  slug: 'core-api',
  createdBy: 'user-1',
  maxConsecutiveBlocked: null,
  storyPromotion: 'manual',
  executionMode: 'container',
  workspacePath: null,
  workspaceVerifiedAt: null,
  mirrorPath: null,
  language: 'pt-BR',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SUMMARY: WorkspaceSummary = { activeProjects: 1, agentCount: 2, spentMicros: 5_000_000 };

const useProjectsMock = vi.fn();
const useWorkspaceSummaryMock = vi.fn();
const useProjectsSummaryMock = vi.fn();
const useDecisionInboxMock = vi.fn();
const fila = (total: number, truncada = false) => ({ total, truncada, itens: [] });
const CAIXA = {
  filas: { aprovacoes: fila(2), prs: fila(1), promocoes: fila(0), arquitetura: fila(0), hipoteses: fila(3, true) },
  projetos: [{ projectId: 'project-1', nome: 'Core API', aprovacoes: 2, prs: 1, promocoes: 0, arquitetura: 0, hipoteses: 3, agentesAguardando: ['arquiteto'] }],
};

function cardDoProjeto(over: Partial<ProjectCardSummary> = {}): ProjectCardSummary {
  return {
    projectId: PROJECT.id,
    provider: 'local',
    provisioningStatus: 'provisioned',
    budget: null,
    latestSessionId: 'sess-1',
    latestSeq: 0,
    lastEvent: null,
    storiesAwaitingPromotion: 0,
    pendingApprovalsCount: 0,
    onlineAgentCount: 0,
    roster: {
      executionActivated: false,
      moduleNames: [],
      gatesEverOpened: false,
      delegatedSubagents: [],
      activatedAgents: [],
      infraActive: false,
      uxDesignerActive: false,
      staffActive: false,
    },
    ...over,
  };
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('../lib/hooks', () => ({
  useCurrentWorkspace: () => ({ data: { id: 'ws-1', name: 'Acme', slug: 'acme' } }),
  useCurrentWorkspaceWithRole: () => ({ data: { role: 'viewer' } }),
  useDecisionInbox: () => useDecisionInboxMock(),
  useWorkspaceBudget: () => ({ data: undefined, isError: false }),
  useProjects: () => useProjectsMock(),
  useWorkspaceSummary: () => useWorkspaceSummaryMock(),
  useProjectsSummary: () => useProjectsSummaryMock(),
}));

vi.mock('../lib/notifications', () => ({
  useProjectsUnread: (projects: Project[] | undefined) =>
    (projects ?? []).map((project) => ({
      project,
      latestSessionId: null,
      latestSeq: 0,
      unreadCount: 0,
    })),
  useNotificationGroups: () => [],
  storiesAwaitingPromotion: () => 0,
}));

vi.mock('../lib/api-client', async () => {
  // `ApiError`/`mensagemDaApi` reais: é a frase da api que precisa chegar à
  // tela no caminho de erro.
  const real =
    await vi.importActual<typeof import('../lib/api-client')>('../lib/api-client');
  return {
    ApiError: real.ApiError,
    mensagemDaApi: real.mensagemDaApi,
  };
});

vi.mock('./NewProjectWizard', () => ({
  NewProjectWizard: () => <div data-testid="wizard-stub" />,
}));

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('pt-BR');
  useProjectsMock.mockReset();
  useWorkspaceSummaryMock.mockReset();
  useWorkspaceSummaryMock.mockReturnValue({ data: SUMMARY, isError: false });
  useProjectsSummaryMock.mockReset();
  useDecisionInboxMock.mockReset();
  useDecisionInboxMock.mockReturnValue({ data: CAIXA, isError: false });
  useProjectsSummaryMock.mockReturnValue({ data: [], isLoading: false });
});

describe('Dashboard — estados', () => {
  it('carregando: mostra skeletons no lugar da grade', () => {
    useProjectsMock.mockReturnValue({ data: undefined, isLoading: true });

    renderDashboard();

    expect(screen.getAllByTestId('project-card-skeleton').length).toBeGreaterThan(0);
  });

  it('primeiro uso: workspace sem projeto nenhum mostra CTA de criar', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false });

    renderDashboard();

    expect(screen.getByText('Nenhum projeto por aqui ainda.')).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /Criar projeto/ });
    expect(cta).toBeInTheDocument();

    fireEvent.click(cta);
    expect(screen.getByTestId('wizard-stub')).toBeInTheDocument();
  });

  it('busca sem resultado: copy diferente do primeiro uso, sem CTA de criar', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });

    renderDashboard();

    fireEvent.change(screen.getByPlaceholderText('Buscar projetos…'), {
      target: { value: 'não existe' },
    });

    expect(
      screen.getByText('Nenhum projeto encontrado para "não existe".'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Criar projeto/ })).not.toBeInTheDocument();
  });

  // O caso perigoso não é o branco: é a tela AFIRMANDO o contrário. Com a api
  // limitando, `!projects` era verdadeiro e o dashboard convidava a criar o
  // primeiro projeto de um workspace que podia ter vinte (RN-088).
  it('erro na lista: diz o que a api respondeu, e não "nenhum projeto ainda"', () => {
    useProjectsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError(429, {
        message: 'Limite de requisições excedido. Tente novamente em instantes.',
      }),
      refetch: vi.fn(),
    });

    renderDashboard();

    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('Não foi possível carregar seus projetos.');
    expect(alerta).toHaveTextContent(
      'Limite de requisições excedido. Tente novamente em instantes.',
    );
    expect(screen.queryByText('Nenhum projeto por aqui ainda.')).toBeNull();
  });

  it('erro no resumo do workspace não derruba a grade de cards', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useWorkspaceSummaryMock.mockReturnValue({ data: undefined, isError: true });

    renderDashboard();

    expect(screen.getAllByText('indisponível').length).toBeGreaterThan(0);
    expect(screen.getByText('Core API')).toBeInTheDocument();
  });
});

/**
 * RN-648 (AT-325) — a linha de atividade do card tinha UM texto ("Sem atividade
 * ainda") para quatro estados, e o levantamento visual o achou num projeto com
 * três sessões e dezesseis eventos: o resumo do workspace tinha FALHADO. A
 * linha lê a sessão mais recente, a mesma da Visão geral e da sidebar.
 */
describe('Dashboard — linha de atividade do card (RN-648)', () => {
  it('o resumo que falhou diz "indisponível", nunca "sem atividade"', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    renderDashboard();

    expect(screen.getByText('atividade indisponível')).toBeInTheDocument();
    expect(screen.queryByText(/Sem atividade/)).toBeNull();
  });

  it('enquanto o resumo carrega, o card não afirma nada sobre atividade', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({ data: undefined, isLoading: true });

    renderDashboard();

    expect(screen.getByText('carregando atividade…')).toBeInTheDocument();
    expect(screen.queryByText(/Sem atividade/)).toBeNull();
  });

  it('projeto sem sessão nenhuma e sessão mais recente vazia têm textos diferentes', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({
      data: [cardDoProjeto({ latestSessionId: null })],
      isLoading: false,
    });
    const { unmount } = renderDashboard();
    expect(screen.getByText('Nenhuma sessão ainda')).toBeInTheDocument();
    unmount();

    useProjectsSummaryMock.mockReturnValue({
      data: [cardDoProjeto({ latestSessionId: 'sess-1', lastEvent: null })],
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText('Sem atividade na sessão mais recente ainda')).toBeInTheDocument();
  });

  it('com evento na sessão mais recente, mostra o evento e não o vazio', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({
      data: [
        cardDoProjeto({
          lastEvent: {
            id: 'ev-1',
            sessionId: 'sess-1',
            seq: 3,
            type: 'agent.response',
            actor: { kind: 'agent', id: 'criativo' },
            payload: { content: 'oi' },
            createdAt: new Date().toISOString(),
          } as ProjectCardSummary['lastEvent'],
        }),
      ],
      isLoading: false,
    });

    renderDashboard();

    expect(screen.queryByText(/Sem atividade/)).toBeNull();
    expect(screen.queryByText('Nenhuma sessão ainda')).toBeNull();
  });
});

/**
 * AT-330 (achado N6 da auditoria da Rodada 29): em 390px a busca encolhia para
 * "Bus" e "Novo projeto" quebrava em duas linhas. No móvel a barra se arruma
 * em duas linhas, com a busca inteira embaixo.
 */
describe('Dashboard — layout estreito (AT-330)', () => {
  let largura: ReturnType<typeof simularLayoutMovel> | null = null;
  afterEach(() => {
    largura?.restaurar();
    largura = null;
  });

  it('no móvel, a barra vira de duas linhas, com a busca e o botão inteiros', () => {
    largura = simularLayoutMovel(true);
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();

    const busca = screen.getByTestId('busca-de-projetos');
    const barra = busca.parentElement as HTMLElement;
    expect(barra).toHaveAttribute('data-layout', 'movel');
    expect(screen.getByPlaceholderText('Buscar projetos…')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Novo projeto/ }).length).toBeGreaterThan(0);
  });

  it('AT-682/AT-941: no desktop "Novo projeto" tem rótulo; o título é Início', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Início');
    const b = screen.getAllByRole('button', { name: 'Novo projeto' })[0];
    expect(b.textContent).toBe('Novo projeto');
    expect(b.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('AT-682: no móvel "Novo projeto" é só ícone, com nome e legenda no foco', async () => {
    largura = simularLayoutMovel(true);
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();
    const b = screen.getAllByRole('button', { name: 'Novo projeto' })[0];
    expect(b.textContent).toBe('');
    act(() => b.focus());
    expect(await screen.findByText('Novo projeto', { selector: '[data-slot="tooltip-content"]' })).toBeTruthy();
  });

  it('no desktop, a barra continua de uma linha — e cruzar o corte a rearruma', () => {
    largura = simularLayoutMovel(false);
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();

    const barra = screen.getByTestId('busca-de-projetos').parentElement as HTMLElement;
    expect(barra).not.toHaveAttribute('data-layout');

    act(() => largura!.mudar(true));
    expect(barra).toHaveAttribute('data-layout', 'movel');
  });
});

describe('Dashboard — cartões do Início (AT-896, RN-467)', () => {
  it('mostra uma contagem por fila, nunca somadas, e marca a fila cortada', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false, isError: false });
    renderDashboard();
    const cartoes = screen.getByTestId('cartoes-do-inicio');
    expect(cartoes.textContent).toContain('2 aprovações');
    expect(cartoes.textContent).toContain('PRs 1 · promoções 0 · arquitetura 0 · hipóteses 3+');
    expect(cartoes.textContent).toContain('1 aguardando você');
    expect(cartoes.textContent).toContain('teto visível ao owner');
    expect(screen.getByText('Arquiteto aguardando você')).toBeTruthy();
  });

  it('erro na Caixa vira "indisponível" só no cartão, sem derrubar a grade', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false, isError: false });
    useDecisionInboxMock.mockReturnValue({ data: undefined, isError: true });
    renderDashboard();
    expect(screen.getByTestId('cartoes-do-inicio').textContent).toContain('indisponível');
    expect(screen.getByText('Core API')).toBeTruthy();
  });
});

const evento = (id: string, minAtras: number) =>
  ({
    id,
    sessionId: 'sess-1',
    seq: 1,
    type: 'git.push',
    actor: { kind: 'agent', id: 'arquiteto' },
    payload: { branch: `b-${id}` },
    createdAt: new Date(Date.now() - minAtras * 60_000).toISOString(),
  }) as ProjectCardSummary['lastEvent'];

describe('Dashboard — Novo projeto e Atividade recente (AT-941)', () => {
  it('a grade termina no cartão "Novo projeto", que abre o assistente', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();
    fireEvent.click(screen.getByText('Comece de um brief ou adote um repositório existente.'));
    expect(screen.getByTestId('wizard-stub')).toBeInTheDocument();
  });

  it('o cartão não aparece no primeiro uso nem com busca ativa', () => {
    useProjectsMock.mockReturnValue({ data: [], isLoading: false });
    const { unmount } = renderDashboard();
    expect(screen.queryByText(/Comece de um brief/)).toBeNull();
    unmount();
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    renderDashboard();
    fireEvent.change(screen.getByPlaceholderText('Buscar projetos…'), { target: { value: 'core' } });
    expect(screen.queryByText(/Comece de um brief/)).toBeNull();
  });

  it('lista o último evento por projeto, do mais recente, no máximo 5', () => {
    const projetos = Array.from({ length: 7 }, (_, i) => ({ ...PROJECT, id: `p${i}`, name: `Proj ${i}` }));
    useProjectsMock.mockReturnValue({ data: projetos, isLoading: false });
    useProjectsSummaryMock.mockReturnValue({
      data: projetos.map((p, i) => cardDoProjeto({ projectId: p.id, lastEvent: evento(`e${i}`, 10 - i) })),
      isLoading: false,
    });
    renderDashboard();
    const linhas = screen.getByTestId('atividade-recente').querySelectorAll('li');
    expect(linhas).toHaveLength(5);
    expect(linhas[0].textContent).toContain('Proj 6');
    expect(linhas[4].textContent).toContain('Proj 2');
  });

  it('sem eventos a seção não aparece; resumo com erro diz "indisponível"', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    const { unmount } = renderDashboard();
    expect(screen.queryByTestId('atividade-recente')).toBeNull();
    unmount();
    useProjectsSummaryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderDashboard();
    expect(screen.getByTestId('atividade-recente')).toHaveTextContent('Não foi possível ler a atividade recente.');
  });
});

const diasAtras = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const projetoParado = { ...PROJECT, id: 'p-parado', name: 'Projeto antigo' };
const eventoHa = (dias: number, type = 'git.push') =>
  ({
    id: `e-${dias}`,
    sessionId: 'sess-1',
    seq: 1,
    type,
    actor: { kind: 'agent', id: 'arquiteto' },
    payload: { branch: 'b' },
    createdAt: diasAtras(dias),
  }) as ProjectCardSummary['lastEvent'];

function comUmAtivoEUmParado() {
  useProjectsMock.mockReturnValue({ data: [PROJECT, projetoParado], isLoading: false });
  useProjectsSummaryMock.mockReturnValue({
    data: [
      cardDoProjeto({ lastEvent: eventoHa(1) }),
      cardDoProjeto({ projectId: projetoParado.id, lastEvent: eventoHa(46) }),
    ],
    isLoading: false,
  });
}

const grade = () => within(screen.getByTestId('grade-de-projetos'));

describe('Dashboard — Ativos, Parados e Todos (AT-967, RN-1460, RN-1461)', () => {
  afterEach(() => localStorage.clear());

  it('o padrão é Ativos: o parado sai da grade e as contagens aparecem no seletor', () => {
    comUmAtivoEUmParado();
    renderDashboard();
    expect(grade().getByText('Core API')).toBeInTheDocument();
    expect(grade().queryByText('Projeto antigo')).toBeNull();
    const filtro = screen.getByTestId('filtro-de-projetos');
    expect(filtro).toHaveTextContent('Ativos · 1');
    expect(filtro).toHaveTextContent('Parados · 1');
  });

  it('Parados e Todos trocam a grade, e a escolha fica no localStorage', () => {
    comUmAtivoEUmParado();
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Parados · 1/ }));
    expect(grade().queryByText('Core API')).toBeNull();
    expect(grade().getByText('Projeto antigo')).toBeInTheDocument();
    expect(localStorage.getItem('brabo.inicio.filtro')).toBe('parados');
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(grade().getByText('Core API')).toBeInTheDocument();
    expect(grade().getByText('Projeto antigo')).toBeInTheDocument();
  });

  it('a escolha guardada vale na próxima visita', () => {
    localStorage.setItem('brabo.inicio.filtro', 'todos');
    comUmAtivoEUmParado();
    renderDashboard();
    expect(grade().getByText('Projeto antigo')).toBeInTheDocument();
  });

  it('o indicador "Projetos ativos" conta só os ativos e diz quantos estão parados', () => {
    comUmAtivoEUmParado();
    renderDashboard();
    const cartoes = screen.getByTestId('cartoes-do-inicio');
    expect(cartoes).toHaveTextContent(/PROJETOS ATIVOS/i);
    expect(cartoes).toHaveTextContent('1 parado há mais de 30 dias');
    // O WorkspaceSummary diz 1 ativo, mas o número vem da grade lida.
    expect(cartoes.querySelector('[data-slot="section-card"] p:nth-of-type(2)')).toHaveTextContent('1');
  });

  it('sem filtro que case, a mensagem é do filtro e o seletor continua lá', () => {
    useProjectsMock.mockReturnValue({ data: [projetoParado], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({
      data: [cardDoProjeto({ projectId: projetoParado.id, lastEvent: eventoHa(46) })],
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText(/Nenhum projeto ativo/)).toBeInTheDocument();
    expect(screen.getByTestId('filtro-de-projetos')).toBeInTheDocument();
  });

  it('sem o resumo lido ninguém é dado como parado nem contado', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT, projetoParado], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderDashboard();
    expect(grade().getByText('Projeto antigo')).toBeInTheDocument();
    expect(screen.getByTestId('cartoes-do-inicio')).not.toHaveTextContent('parado há');
  });

  it('nenhum botão "Definir orçamento": o cartão sem teto diz "sem teto do mês · definir"', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    useProjectsSummaryMock.mockReturnValue({
      data: [cardDoProjeto({ lastEvent: eventoHa(1) })],
      isLoading: false,
    });
    renderDashboard();
    expect(screen.queryByText('Definir orçamento')).toBeNull();
    expect(screen.getByTestId('token-meter')).toHaveTextContent('sem teto do mês · definir');
    expect(screen.getByRole('link', { name: 'definir' })).toBeInTheDocument();
  });

  it('a Caixa diz há quanto tempo espera o item mais antigo, só com as filas inteiras', () => {
    useProjectsMock.mockReturnValue({ data: [PROJECT], isLoading: false });
    const item = (desde: string) => ({ projectId: 'project-1', projectName: 'Core API', storyId: 's', titulo: 't', desde, decididaEm: null });
    const filas = {
      ...CAIXA.filas,
      aprovacoes: fila(0),
      hipoteses: fila(0),
      promocoes: { total: 2, truncada: false, itens: [item(diasAtras(3)), item(diasAtras(46))] },
    };
    useDecisionInboxMock.mockReturnValue({ data: { ...CAIXA, filas }, isError: false });
    const { unmount } = renderDashboard();
    expect(screen.getByTestId('caixa-mais-antiga')).toHaveTextContent('a mais antiga espera há 46 d');
    unmount();

    useDecisionInboxMock.mockReturnValue({
      data: { ...CAIXA, filas: { ...filas, promocoes: { ...filas.promocoes, truncada: true } } },
      isError: false,
    });
    renderDashboard();
    expect(screen.queryByTestId('caixa-mais-antiga')).toBeNull();
  });
});

describe('Dashboard — Atividade recente só com sujeito e resultado (AT-967, RN-1462)', () => {
  it('"atividade em anamnese" não aparece; o evento com resultado sim', () => {
    const outro = { ...PROJECT, id: 'p2', name: 'Outro' };
    useProjectsMock.mockReturnValue({ data: [PROJECT, outro], isLoading: false });
    const generico = {
      ...eventoHa(1, 'tipo.desconhecido'),
      actor: { kind: 'agent', id: 'anamnese' },
    } as ProjectCardSummary['lastEvent'];
    useProjectsSummaryMock.mockReturnValue({
      data: [
        cardDoProjeto({ lastEvent: generico }),
        cardDoProjeto({ projectId: 'p2', lastEvent: eventoHa(2) }),
      ],
      isLoading: false,
    });
    renderDashboard();
    const secao = screen.getByTestId('atividade-recente');
    expect(secao).not.toHaveTextContent('atividade em');
    expect(secao.querySelectorAll('li')).toHaveLength(1);
    expect(secao).toHaveTextContent('Outro');
  });
});
