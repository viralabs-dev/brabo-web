import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type React from 'react';
import { describe, expect, it, vi, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ContainersPage } from './ContainersPage';
import { ToastProvider } from '../components/ui/ToastProvider';
import type {
  ContainerOverviewItem,
  ProposedAction,
  RegistroDeContainer,
  Role,
  Session,
} from '../lib/api-types';
import i18n from '../lib/i18n';
import { simularLayoutMovel } from '../test/match-media';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const getContainerState = vi.fn();
const proposeAction = vi.fn();
const approveAction = vi.fn();
const denyAction = vi.fn();
const approveAlwaysAction = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    getContainerState: (...args: unknown[]) => getContainerState(...args),
    proposeAction: (...args: unknown[]) => proposeAction(...args),
    approveAction: (...args: unknown[]) => approveAction(...args),
    denyAction: (...args: unknown[]) => denyAction(...args),
    approveAlwaysAction: (...args: unknown[]) => approveAlwaysAction(...args),
  };
});

const useContainersOverview = vi.fn();
const useCurrentWorkspaceWithRole = vi.fn();
const useLatestSession = vi.fn();
const useRemocoesPendentes = vi.fn(() => ({ data: [] as unknown[] }));

vi.mock('../lib/hooks', () => ({
  useContainersOverview: (...args: unknown[]) => useContainersOverview(...args),
  useCurrentWorkspaceWithRole: (...args: unknown[]) =>
    useCurrentWorkspaceWithRole(...args),
  useLatestSession: (...args: unknown[]) => useLatestSession(...args),
  useRemocoesPendentes: () => useRemocoesPendentes(),
}));

vi.mock('../lib/auth', () => ({
  userIdDaSessao: () => 'user-1',
  // O card nomeia o ator humano pela leitura de membros (RN-705).
  emailDaSessao: () => null,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...rest }: { children: React.ReactNode; to: string; params?: unknown } & Record<string, unknown>) => (
    <a href={params ? `${to}-${JSON.stringify(params)}` : to} {...rest}>
      {children}
    </a>
  ),
}));

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ContainersPage />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function comPapel(role: Role) {
  useCurrentWorkspaceWithRole.mockReturnValue({
    data: { workspace: { id: 'ws-1', name: 'Acme', slug: 'acme' }, role },
  });
}

function sessaoRecente(id = 'sess-1'): Session {
  return {
    id,
    projectId: 'proj-1',
    createdBy: 'user-1',
    status: 'active',
    kind: 'criativa',
    name: null,
    nextSeq: 5,
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-08-20T10:00:00.000Z',
    closedAt: null,
  };
}

function registro(
  overrides: Partial<RegistroDeContainer> = {},
): RegistroDeContainer {
  return {
    status: 'running',
    imageVersion: 2,
    imagem: 'node:22-bookworm-slim',
    resources: { cpus: 2, memoryMb: 4096, pidsLimit: 512 },
    failureReason: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    statusChangedAt: '2026-08-01T10:05:00.000Z',
    ...overrides,
  };
}

function item(overrides: Partial<ContainerOverviewItem> = {}): ContainerOverviewItem {
  return {
    projectId: 'proj-1',
    projectName: 'core',
    projectSlug: 'core',
    executionMode: 'container',
    registrado: registro(),
    temImagemDecidida: true,
    workspaceVerifiedAt: null,
    observado: null,
    naoObservado: null,
    detalheDaObservacao: null,
    naoVerificado: null,
    acaoPendente: null,
    brokerConfigurado: true,
    decisaoVigente: null,
    imagemDesatualizada: false,
    motivoDaFalha: null,
    ...overrides,
  };
}

/** O cenário real do `exp004`: projeto `runner`, sem linha em
 *  `project_containers`, imagem decidida e agente local já tendo confirmado a
 *  pasta um dia. */
function itemRunnerSemContainer(
  overrides: Partial<ContainerOverviewItem> = {},
): ContainerOverviewItem {
  return item({
    executionMode: 'runner',
    registrado: null,
    temImagemDecidida: true,
    workspaceVerifiedAt: '2026-09-01T10:00:00.000Z',
    naoVerificado: 'sem_container_registrado',
    ...overrides,
  });
}

function acaoPendente(overrides: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'pa-1',
    projectId: 'proj-1',
    sessionId: 'sess-original',
    seq: 3,
    actionType: 'container_stop',
    payload: {},
    status: 'pending',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'user', id: 'user-1' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    updatedAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  comPapel('maintainer');
  useLatestSession.mockReturnValue({ latest: sessaoRecente() });
});

const INDISPONIVEIS = '(Por que as ações estão indisponíveis|Why the actions are unavailable)';

/** AT-976 (RN-1481): parar/remover moram no menu "…" da linha. */
function itemDoMenu(nome: string) {
  if (!screen.queryByRole('menuitem', { name: nome })) {
    fireEvent.click(screen.getByRole('button', { name: /Mais ações de/ }));
  }
  return screen.getByRole('menuitem', { name: nome });
}

function abrirAjuda(nome: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`(Ajuda|Help): ${nome}`) }));
}

describe('ContainersPage', () => {
  it('carregando: mostra o estado de loading, não a tabela nem erro', () => {
    useContainersOverview.mockReturnValue({ isPending: true, isError: false, data: undefined, refetch: vi.fn() });

    montar();

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('erro: mostra ErroDeCarregamento com botão de tentar de novo', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('falhou'),
      data: undefined,
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByText('Não foi possível carregar os containers.')).toBeInTheDocument();
  });

  it('vazio: mostra a mensagem de vazio da tabela', () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [], refetch: vi.fn() });

    montar();

    expect(
      screen.getByText('Este workspace ainda não tem projeto nenhum.'),
    ).toBeInTheDocument();
  });

  it('renderiza imagem+versão, estado registrado e recursos de uma linha', () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });

    montar();

    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.getByText('node:22-bookworm-slim')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('rodando')).toBeInTheDocument();
  });

  it('AT-714: ordena pelo cabeçalho e pagina no cliente (10 por página)', () => {
    const dados = Array.from({ length: 12 }, (_, i) =>
      item({ projectId: `p${i}`, projectName: `proj-${String(i).padStart(2, '0')}` }),
    );
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: dados, refetch: vi.fn() });

    montar();

    expect(screen.getByText('proj-00')).toBeInTheDocument();
    expect(screen.queryByText('proj-11')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Próxima/ }));
    expect(screen.getByText('proj-11')).toBeInTheDocument();
    expect(screen.queryByText('proj-00')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));
    const cabecalho = screen.getByRole('button', { name: /^Projeto/i });
    fireEvent.click(cabecalho);
    fireEvent.click(cabecalho);
    expect(screen.getByText('proj-11')).toBeInTheDocument();
    expect(screen.queryByText('proj-00')).toBeNull();
  });

  it('AT-278 (RN-632): a linha lê a sessão mais recente SEM poll — uma por projeto a cada 5s estourava o teto', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item(), item({ projectId: 'proj-2', projectName: 'api', projectSlug: 'api' })],
      refetch: vi.fn(),
    });

    montar();

    expect(useLatestSession).toHaveBeenCalledWith('proj-1', false);
    expect(useLatestSession).toHaveBeenCalledWith('proj-2', false);
    // Nenhuma linha pede o poll default (o segundo argumento ausente).
    expect(useLatestSession.mock.calls.every((args) => args[1] === false)).toBe(true);
  });

  it('naoVerificado (teto atingido) NUNCA é confundido com naoObservado — texto próprio', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ naoVerificado: 'teto_de_verificacoes_atingido' })],
      refetch: vi.fn(),
    });

    montar();

    expect(
      screen.getByText('não verificado — teto de verificações da carga foi atingido'),
    ).toBeInTheDocument();
  });

  it('naoObservado (broker sem resposta) tem texto distinto de naoVerificado', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ naoObservado: 'broker-sem-resposta', detalheDaObservacao: 'timeout' })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByText('broker não respondeu')).toBeInTheDocument();
  });

  it('clique em "Parar" propõe container_stop na sessão mais recente do PROJETO', async () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
    proposeAction.mockResolvedValue(acaoPendente());

    montar();
    fireEvent.click(itemDoMenu('Parar'));

    await waitFor(() => {
      expect(proposeAction).toHaveBeenCalledWith('proj-1', 'sess-1', {
        actionType: 'container_stop',
        actor: { kind: 'user', id: 'user-1' },
        payload: {},
      });
    });
  });

  it('clique em "Remover" propõe container_remove', async () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
    proposeAction.mockResolvedValue(acaoPendente({ actionType: 'container_remove' }));

    montar();
    fireEvent.click(itemDoMenu('Remover'));

    await waitFor(() => {
      expect(proposeAction).toHaveBeenCalledWith(
        'proj-1',
        'sess-1',
        expect.objectContaining({ actionType: 'container_remove' }),
      );
    });
  });

  it('"Subir de novo" busca a decisão vigente e propõe container_start com ela — nunca inventa payload', async () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ registrado: registro({ status: 'stopped' }) })],
      refetch: vi.fn(),
    });
    getContainerState.mockResolvedValue({
      status: 'decidido',
      decisao: {
        image: 'node:22-bookworm-slim',
        rationale: 'stack combina',
        network: 'none',
        resources: { cpus: 2, memoryMb: 4096, pidsLimit: 512 },
      },
      version: 3,
      eventId: 'evt-1',
      decidedAt: '2026-08-01T10:00:00.000Z',
    });
    proposeAction.mockResolvedValue(acaoPendente({ actionType: 'container_start' }));

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Subir de novo' }));

    await waitFor(() => {
      expect(getContainerState).toHaveBeenCalledWith('proj-1');
      expect(proposeAction).toHaveBeenCalledWith('proj-1', 'sess-1', {
        actionType: 'container_start',
        actor: { kind: 'user', id: 'user-1' },
        payload: {
          imagem: 'node:22-bookworm-slim',
          network: 'none',
          resources: { cpus: 2, memoryMb: 4096, pidsLimit: 512 },
          rationale: 'Subida pedida por um humano na página de containers.',
        },
      });
    });
  });

  it('decisão sumiu entre a carga e o clique: "Subir de novo" falha com toast, sem propor nada', async () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ registrado: registro({ status: 'stopped' }) })],
      refetch: vi.fn(),
    });
    getContainerState.mockResolvedValue({
      status: 'sem_decisao',
      decisao: null,
      version: 0,
      eventId: null,
      decidedAt: null,
    });

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Subir de novo' }));

    await waitFor(() => {
      expect(screen.getByText('Sem decisão de imagem para este projeto')).toBeInTheDocument();
    });
    expect(proposeAction).not.toHaveBeenCalled();
  });

  it('sem sessão no projeto: os três botões ficam desabilitados, com o motivo em texto', () => {
    useLatestSession.mockReturnValue({ latest: undefined });
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ registrado: registro({ status: 'stopped' }) })],
      refetch: vi.fn(),
    });

    montar();

    expect(itemDoMenu('Parar')).toHaveAttribute('aria-disabled', 'true');
    expect(itemDoMenu('Remover')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Subir de novo' })).toBeDisabled();
    abrirAjuda(INDISPONIVEIS);
    expect(
      screen.getByText(
        'Este projeto ainda não tem sessão — a ação precisa de uma para ser proposta.',
      ),
    ).toBeInTheDocument();
  });

  it('com ação pendente: mostra o card de decisão em vez dos botões', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ acaoPendente: acaoPendente() })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.queryByRole('button', { name: 'Parar' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });

  it('aprovar a ação pendente usa o sessionId da PRÓPRIA ação, não a sessão mais recente', async () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ acaoPendente: acaoPendente({ sessionId: 'sess-original' }) })],
      refetch: vi.fn(),
    });
    approveAction.mockResolvedValue(acaoPendente({ status: 'approved' }));

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => {
      expect(approveAction).toHaveBeenCalledWith('proj-1', 'sess-original', 'pa-1');
    });
  });

  // AT-422 (RN-738): a decisão executada relê a linha e o ciclo de vida.
  it('aprovar container_stop relê a visão geral e o ciclo de vida do projeto', async () => {
    const spy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ acaoPendente: acaoPendente() })],
      refetch: vi.fn(),
    });
    approveAction.mockResolvedValue(acaoPendente({ status: 'executed' }));

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['containers-overview'] });
      expect(spy).toHaveBeenCalledWith({ queryKey: ['container-lifecycle', 'proj-1'] });
    });
    spy.mockRestore();
  });

  it('aprovação recusada pela api ainda relê a linha (nada de estado de antes)', async () => {
    const spy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ acaoPendente: acaoPendente() })],
      refetch: vi.fn(),
    });
    approveAction.mockRejectedValue(new Error('409'));

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['containers-overview'] });
    });
    spy.mockRestore();
  });

  it('container_remove pendente: o card NÃO oferece "sempre permitir" (teto absoluto)', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ acaoPendente: acaoPendente({ actionType: 'container_remove' }) })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovar e criar regra' })).not.toBeInTheDocument();
  });

  // --- RN-521: o terceiro estado e a subida ramificada por modo ---

  it('projeto que NUNCA provisionou aparece na lista, com texto próprio — nunca "parado"', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer()],
      refetch: vi.fn(),
    });

    montar();

    abrirAjuda(INDISPONIVEIS);
    expect(screen.getByText('nunca provisionado')).toBeInTheDocument();
    expect(screen.queryByText('parado')).not.toBeInTheDocument();
    expect(screen.getByText('não há container para observar')).toBeInTheDocument();
  });

  it('CENÁRIO REAL (exp004): projeto runner, sem container, imagem decidida, pasta confirmada → propõe container_start_via_runner com payload SÓ de rationale', async () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer()],
      refetch: vi.fn(),
    });
    proposeAction.mockResolvedValue(
      acaoPendente({ actionType: 'container_start_via_runner' }),
    );

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Subir container' }));

    await waitFor(() => {
      expect(proposeAction).toHaveBeenCalledWith('proj-1', 'sess-1', {
        actionType: 'container_start_via_runner',
        actor: { kind: 'user', id: 'user-1' },
        payload: { rationale: 'Subida pedida por um humano na página de containers.' },
      });
    });
    // O payload de `container_start` NUNCA é copiado: ela elege imagem, esta
    // sobe a já decidida (RN-508).
    expect(getContainerState).not.toHaveBeenCalled();
  });

  it('projeto runner: a tela DIZ que confirmação de pasta não é presença de agente', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer()],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByText(/Agente local pode estar desconectado|local agent may be disconnected/)).toBeVisible();
    abrirAjuda('(Ações do container|Container actions)');
    expect(
      screen.getByText(/se ele não estiver rodando agora, a ação falha ao ser aprovada/),
    ).toBeInTheDocument();
  });

  it('projeto mounted sem container: propõe container_start (broker), não a variante do runner', async () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        itemRunnerSemContainer({ executionMode: 'mounted', workspaceVerifiedAt: null }),
      ],
      refetch: vi.fn(),
    });
    getContainerState.mockResolvedValue({
      status: 'decidido',
      decisao: {
        image: 'node:22-bookworm-slim',
        rationale: 'stack combina',
        network: 'none',
        resources: { cpus: 2, memoryMb: 4096, pidsLimit: 512 },
      },
      version: 1,
      eventId: 'evt-1',
      decidedAt: '2026-08-01T10:00:00.000Z',
    });
    proposeAction.mockResolvedValue(acaoPendente({ actionType: 'container_start' }));

    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Subir container' }));

    await waitFor(() => {
      expect(proposeAction).toHaveBeenCalledWith(
        'proj-1',
        'sess-1',
        expect.objectContaining({ actionType: 'container_start' }),
      );
    });
  });

  it('sem imagem decidida: não propõe às cegas — botão inerte e o motivo dito em TEXTO', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer({ temImagemDecidida: false })],
      refetch: vi.fn(),
    });

    montar();

    // AT-976 (RN-1481): sem imagem a ação da linha é "Decidir imagem", um link; nada de "Subir".
    expect(screen.getByRole('link', { name: 'Decidir imagem' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir container' })).toBeNull();
    abrirAjuda(INDISPONIVEIS);
    expect(
      screen.getByText(
        'Sem imagem decidida: o Arquiteto (ou a Infra) precisa decidir uma antes de qualquer container subir.',
      ),
    ).toBeInTheDocument();
    expect(proposeAction).not.toHaveBeenCalled();
  });

  // ADR 0161, RN-574 — a instalação do AT-085: sem broker, a tela deixou
  // aprovar duas `container_start` que só podiam falhar. Agora ela recusa
  // ANTES do clique, para `container` E `mounted`, e diz por quê em TEXTO.
  it.each(['container', 'mounted'] as const)(
    'instalação SEM broker, projeto %s: botão inerte e o motivo dito em TEXTO — nunca propõe',
    (executionMode) => {
      useContainersOverview.mockReturnValue({
        isPending: false,
        isError: false,
        data: [
          itemRunnerSemContainer({
            executionMode,
            workspaceVerifiedAt: null,
            brokerConfigurado: false,
          }),
        ],
        refetch: vi.fn(),
      });

      montar();

      expect(screen.getByRole('button', { name: 'Subir container' })).toBeDisabled();
      abrirAjuda(INDISPONIVEIS);
      expect(
        screen.getByText(/Esta instalação não sobe container para projetos Container ou Pasta montada/),
      ).toBeInTheDocument();
      expect(proposeAction).not.toHaveBeenCalled();
    },
  );

  // AT-105, RN-591 — parar/remover também passam pelo broker.
  it('instalação SEM broker, container registrado: Parar/Remover inertes, com o motivo em TEXTO', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ brokerConfigurado: false })],
      refetch: vi.fn(),
    });

    montar();

    expect(itemDoMenu('Parar')).toHaveAttribute('aria-disabled', 'true');
    expect(itemDoMenu('Remover')).toHaveAttribute('aria-disabled', 'true');
    abrirAjuda(INDISPONIVEIS);
    expect(screen.getByText(/stops and removes containers|para e remove os containers/)).toBeInTheDocument();
    expect(proposeAction).not.toHaveBeenCalled();
  });

  it('ADR 0240: sem nenhum motivo de inércia não há "?" de indisponibilidade', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item()],
      refetch: vi.fn(),
    });

    montar();

    expect(
      screen.queryByRole('button', { name: new RegExp(`(Ajuda|Help): ${INDISPONIVEIS}`) }),
    ).not.toBeInTheDocument();
  });

  it('RN-902: container de pé com imagem desatualizada mostra o aviso com os três passos e o motivo de "Subir de novo"', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        item({
          imagemDesatualizada: true,
          decisaoVigente: { version: 3, image: 'node:22', network: 'egress' },
        }),
      ],
      refetch: vi.fn(),
    });

    montar();

    // A linha curta fica visível; os três passos moram no "?".
    expect(screen.queryByText(/Parar → Remover|Stop → Remove/)).not.toBeInTheDocument();
    abrirAjuda('(Ações do container|Container actions)');
    expect(screen.getByText(/Parar → Remover → Subir de novo|Stop → Remove → Start again/)).toBeInTheDocument();
    abrirAjuda(INDISPONIVEIS);
    expect(screen.getByText(/subir de novo não aplica|starting again does not apply/)).toBeInTheDocument();
    // (a coluna "Detalhe" também diz "Abrir"; a ação da linha é a que mora ao lado do menu.)
    const acoes = screen.getByRole('button', { name: /Mais ações de/ }).closest('[class*="acoes"]') as HTMLElement;
    expect(within(acoes).getByRole('link', { name: 'Abrir' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subir de novo' })).toBeNull();
  });

  it('RN-902: sem divergência o aviso e o motivo "já está de pé" não aparecem', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item()],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.queryByText(/Parar → Remover|Stop → Remove/)).not.toBeInTheDocument();
    expect(screen.queryByText(/não aplica uma imagem nova|does not apply a new image/)).not.toBeInTheDocument();
  });

  it('com broker, Parar segue habilitado num container de pé', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item()],
      refetch: vi.fn(),
    });

    montar();

    expect(itemDoMenu('Parar')).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('instalação SEM broker não afeta projeto runner: ele sobe pelo agente local', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer({ brokerConfigurado: false })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByRole('button', { name: 'Subir container' })).not.toBeDisabled();
    expect(screen.queryByText(/Esta instalação não sobe container/)).toBeNull();
  });

  it('runner que nunca confirmou pasta: botão inerte, motivo próprio — nunca confundido com "sem imagem"', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [itemRunnerSemContainer({ workspaceVerifiedAt: null })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByRole('button', { name: 'Subir container' })).toBeDisabled();
    abrirAjuda(INDISPONIVEIS);
    expect(
      screen.getByText(
        'Nenhum agente local jamais confirmou a pasta deste projeto — rode o `brabo-runner` na máquina dele antes de subir.',
      ),
    ).toBeInTheDocument();
  });

  it('developer NÃO decide ciclo de vida (o mínimo do endpoint é maintainer), mas CONTINUA vendo o estado', () => {
    comPapel('developer');
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ registrado: registro({ status: 'stopped' }) })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByRole('button', { name: 'Subir de novo' })).toBeDisabled();
    expect(itemDoMenu('Remover')).toHaveAttribute('aria-disabled', 'true');
    expect(
      screen.getByText('Subir container exige o papel maintainer neste workspace.'),
    ).toBeInTheDocument();
    // O que se tira é o CONTROLE, nunca a INFORMAÇÃO (ADR 0064).
    expect(screen.getByText('parado')).toBeInTheDocument();
    expect(screen.getByText('node:22-bookworm-slim')).toBeInTheDocument();
  });

  it('owner alcança o mínimo — a comparação é por hierarquia, nunca por igualdade de papel', () => {
    comPapel('owner');
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [item({ registrado: registro({ status: 'stopped' }) })],
      refetch: vi.fn(),
    });

    montar();

    expect(screen.getByRole('button', { name: 'Subir de novo' })).toBeEnabled();
  });
});

// AT-324 (RN-646): Parar/Remover sem container, e o motivo longo do broker.
describe('ContainersPage — Parar/Remover sem container e o motivo curto (AT-324)', () => {
  function comDados(dados: ContainerOverviewItem[]) {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: dados,
      refetch: vi.fn(),
    });
  }

  it('nunca provisionado: Parar e Remover inertes, com o motivo em TEXTO — clicar não propõe', () => {
    comDados([item({ registrado: null, naoVerificado: 'sem_container_registrado' })]);

    montar();

    const remover = itemDoMenu('Remover');
    expect(itemDoMenu('Parar')).toHaveAttribute('aria-disabled', 'true');
    expect(remover).toHaveAttribute('aria-disabled', 'true');
    abrirAjuda(INDISPONIVEIS);
    expect(
      screen.getByText('Nunca provisionado: não há container para parar nem remover.'),
    ).toBeInTheDocument();
    fireEvent.click(remover);
    expect(proposeAction).not.toHaveBeenCalled();
  });

  it('container removido: o motivo próprio, nunca o de "nunca provisionado"', () => {
    comDados([item({ registrado: registro({ status: 'removed' }) })]);

    montar();

    expect(itemDoMenu('Remover')).toHaveAttribute('aria-disabled', 'true');
    abrirAjuda(INDISPONIVEIS);
    expect(
      screen.getByText('Container removido: não há o que parar nem remover.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Nunca provisionado:/)).toBeNull();
  });

  it('container de pé: nenhum motivo de "sem container" — o texto não vira ruído em linha saudável', () => {
    comDados([item()]);

    montar();

    expect(itemDoMenu('Remover')).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText(/não há container para parar/)).toBeNull();
    expect(screen.queryByText(/Container removido/)).toBeNull();
  });

  it('sem broker: nada de texto solto embaixo dos botões; o motivo e o nome da variável só no "?", fechado', () => {
    comDados([
      item({
        registrado: null,
        brokerConfigurado: false,
        naoVerificado: 'sem_container_registrado',
      }),
    ]);

    montar();

    expect(screen.queryByText(/BROKER_URL/)).toBeNull();
    abrirAjuda(INDISPONIVEIS);
    expect(screen.getByText(/BROKER_URL/)).toBeInTheDocument();
  });

  it('sem broker com container parado: os dois detalhes moram atrás do MESMO "?"', () => {
    comDados([item({ registrado: registro({ status: 'stopped' }), brokerConfigurado: false })]);

    montar();

    abrirAjuda(INDISPONIVEIS);
    expect(screen.getByText(/Esta instalação não sobe container/)).toBeInTheDocument();
    expect(screen.getByText(/para e remove os containers/)).toBeInTheDocument();
  });
});

/**
 * AT-330 (achado N3 da auditoria da Rodada 29): em 390px as sete colunas
 * espremidas sobrepunham os cabeçalhos e cortavam as ações à direita. No móvel
 * cada projeto é um CARTÃO (`Table`, RN-643), com o rótulo de cada coluna junto
 * do valor e as ações na largura inteira.
 */
describe('ContainersPage — layout estreito (AT-330)', () => {
  let largura: ReturnType<typeof simularLayoutMovel> | null = null;
  afterEach(() => {
    largura?.restaurar();
    largura = null;
  });

  it('no móvel, a linha vira cartão com os rótulos e as ações na largura inteira', () => {
    largura = simularLayoutMovel(true);
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });

    montar();

    const cartao = screen.getByTestId('linha-da-tabela');
    const noCartao = within(cartao);
    for (const rotulo of ['Projeto', 'Imagem', 'Registrado', 'Ações']) {
      expect(noCartao.getByText(rotulo)).toBeInTheDocument();
    }
    expect(noCartao.getByText('node:22-bookworm-slim')).toBeInTheDocument();
    const parar = noCartao.getByRole('button', { name: /Mais ações de/ });
    expect(parar.closest('[data-campo]')).toHaveAttribute('data-campo', 'actions');
    expect(parar.closest('[data-campo]')).toHaveAttribute('data-largo');
  });

  it('no desktop, a tabela mantém um cabeçalho só — nenhum cartão', () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });

    montar();

    expect(screen.queryByTestId('linha-da-tabela')).toBeNull();
    expect(screen.getAllByText('Ações')).toHaveLength(1);
  });
});

it('AT-1006 (RN-1503): falhou mostra a primeira linha do motivo e "Ver detalhe"; sem motivo, só "falhou"', () => {
  useContainersOverview.mockReturnValue({
    isPending: false,
    isError: false,
    data: [
      item({
        projectId: 'p-f',
        projectName: 'quebrado',
        registrado: registro({ status: 'failed', failureReason: 'port is already allocated\nstack' }),
        motivoDaFalha: 'port is already allocated',
      }),
      item({ projectId: 'p-g', projectName: 'mudo', registrado: registro({ status: 'failed' }) }),
    ],
    refetch: vi.fn(),
  });
  montar();
  expect(screen.getByText('port is already allocated')).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'Ver detalhe' })).toHaveLength(1);
  expect(screen.getAllByText('falhou')).toHaveLength(2);
});

it('AT-1006: sem a coluna "Detalhe" (7 colunas) e o nome do projeto abre o detalhe', () => {
  useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
  montar();
  for (const r of ['Projeto', 'Imagem', 'Registrado', 'Observado', 'Recursos', 'Desde', 'Ações']) {
    expect(screen.getAllByText(r).length).toBeGreaterThan(0);
  }
  expect(screen.queryByText('Detalhe')).toBeNull();
  expect(screen.getByRole('link', { name: 'core' })).toHaveAttribute('href', '/containers/$projectId-{"projectId":"proj-1"}');
});

it('AT-1006 (RN-1503): o nome de imagem quebra a linha, sem reticências', () => {
  const css = readFileSync(resolve(__dirname, 'ContainersPage.module.css'), 'utf8');
  const bloco = /\.imagemTexto \{[^}]*\}/.exec(css)?.[0] ?? '';
  expect(bloco).toContain('overflow-wrap: anywhere');
  expect(bloco).not.toContain('text-overflow');
  expect(bloco).not.toContain('nowrap');
});

it('AT-976 (RN-1481): o menu "…" é só ícone, com nome e legenda no hover e no foco', async () => {
  useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
  montar();
  const botao = screen.getByRole('button', { name: /Mais ações de core/ });
  expect(botao.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(botao.textContent?.trim()).toBe('');
  const nome = botao.getAttribute('aria-label')!;
  act(() => botao.focus());
  expect(await screen.findByText(nome, { selector: '[data-slot="tooltip-content"]' })).toBeTruthy();
});

describe('ContainersPage — uma ação por linha (AT-976, RN-1481)', () => {
  const textoDasAcoes = (linha: HTMLElement) =>
    [...linha.querySelectorAll('a, button')]
      .filter((e) => e.textContent?.trim() && !e.closest('[data-slot="popover-trigger"]') && !/^(Ajuda|Help)/.test(e.getAttribute('aria-label') ?? ''))
      .map((e) => e.textContent!.trim());

  it('cada estado tem UMA ação com texto, escolhida pelo estado, e nenhum botão primário', () => {
    useContainersOverview.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        item({ projectId: 'p-run', projectName: 'rodando' }),
        item({ projectId: 'p-stop', projectName: 'parado', registrado: registro({ status: 'stopped' }) }),
        item({ projectId: 'p-img', projectName: 'sem-imagem', registrado: null, temImagemDecidida: false, naoVerificado: 'sem_container_registrado' }),
      ],
      refetch: vi.fn(),
    });
    montar();
    const acoes = screen.getAllByRole('button', { name: /Mais ações de/ }).map((b) => b.closest('[class*="acoes"]') as HTMLElement);
    expect(acoes).toHaveLength(3);
    expect(acoes.map((a) => textoDasAcoes(a))).toEqual([['Abrir'], ['Subir de novo'], ['Decidir imagem']]);
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(0);
  });

  it('parar, remover e ver detalhes moram no menu, com o remover separado e destrutivo', () => {
    useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
    montar();
    expect(screen.queryByRole('button', { name: 'Parar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remover' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Mais ações de core/ }));
    const itens = screen.getAllByRole('menuitem').map((i) => i.textContent);
    expect(itens).toEqual(['Parar', 'Ver detalhes', 'Remover']);
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toHaveAttribute('data-variant', 'destructive');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

it('AT-980 (RN-1446): remoção pendente lista o projeto apagado; sem pendência, a seção some', () => {
  useContainersOverview.mockReturnValue({ isPending: false, isError: false, data: [item()], refetch: vi.fn() });
  montar();
  expect(screen.queryByTestId('remocoes-pendentes')).toBeNull();
  cleanup();
  useRemocoesPendentes.mockReturnValue({
    data: [
      { projectId: 'aaaaaaaa-1111-2222-3333-444444444444', projetoNome: null, recursos: 2, motivo: 'broker fora do ar', tentativas: 3, atualizadoEm: '2026-11-19T10:00:00.000Z' },
    ],
  });
  montar();
  const secao = screen.getByTestId('remocoes-pendentes');
  expect(secao).toHaveTextContent('Remoção pendente');
  expect(secao).toHaveTextContent('projeto apagado · aaaaaaaa');
  expect(secao).toHaveTextContent(new Date('2026-11-19T10:00:00.000Z').toLocaleString(i18n.language));
  expect(secao).toHaveTextContent('2 recursos');
  expect(secao).toHaveTextContent('3 tentativas');
  expect(secao).toHaveTextContent('broker fora do ar');
  useRemocoesPendentes.mockReturnValue({ data: [] });
});
