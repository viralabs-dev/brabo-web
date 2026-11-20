import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeShell } from './CodeShell';
// Instância REAL do app — `CodeShell` não tem `I18nextProvider` próprio
// (mesmo padrão de `Dashboard.test.tsx`/`ProjectExecutorsTab.test.tsx`).
import i18n from '../../lib/i18n';

const getRepository = vi.fn();
const getCodeBranches = vi.fn();
const getCodeTree = vi.fn();

vi.mock('../../lib/api-client', async () => {
  const real = await vi.importActual<typeof import('../../lib/api-client')>('../../lib/api-client');
  return {
    ApiError: real.ApiError,
    mensagemDaApi: real.mensagemDaApi,
    getRepository: (...args: unknown[]) => getRepository(...args),
    getCodeBranches: (...args: unknown[]) => getCodeBranches(...args),
    getCodeTree: (...args: unknown[]) => getCodeTree(...args),
  };
});

vi.mock('../../lib/hooks', () => ({
  useLatestSession: () => ({ latest: undefined }),
  useSessionEvents: () => ({ data: undefined }),
  useArchitecture: () => ({ data: undefined }),
  useHandoffs: () => ({ data: undefined }),
  useProjectPendingActions: () => ({ data: undefined }),
}));

vi.mock('./CodeExplorer', () => ({
  CodeExplorer: () => <div>painel explorador</div>,
}));
vi.mock('./CodeSearchPanel', () => ({
  CodeSearchPanel: () => <div>painel busca</div>,
}));
vi.mock('./CodeEditor', () => ({
  CodeEditor: ({
    activePath,
    openTabs,
    abertoPorPadrao,
  }: {
    activePath: string | null;
    openTabs: string[];
    abertoPorPadrao?: boolean;
  }) => (
    <div>
      painel editor · ativo: {activePath ?? 'nenhum'} · abas: {openTabs.length}
      {abertoPorPadrao && ' · padrão'}
    </div>
  ),
}));
vi.mock('./CodeBottomPanel', () => ({
  CodeBottomPanel: () => <div>painel inferior</div>,
}));
vi.mock('./CodeBranchPicker', () => ({
  CodeBranchPicker: ({ currentRef }: { currentRef: string }) => <div>branch: {currentRef}</div>,
}));

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CodeShell projectId="p-1" />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('pt-BR');
  vi.clearAllMocks();
  getRepository.mockResolvedValue({
    id: 'r-1', projectId: 'p-1', provider: 'github', externalId: 'x',
    url: 'https://github.com/x/y', defaultBranch: 'dev', visibility: 'private',
    origin: 'created', provisionedBy: 'u-1', createdAt: '', updatedAt: '',
  });
  getCodeTree.mockResolvedValue({ ref: 'dev', path: '', entries: [], truncated: false });
  getCodeBranches.mockResolvedValue({
    items: [
      { name: 'dev', commitSha: 'a1', protected: true, ahead: 3, behind: 1, pullRequest: null, producedBy: null },
    ],
    truncated: false,
  });
});

afterAll(() => {
  void i18n.changeLanguage('en');
});

describe('CodeShell', () => {
  it('abre no explorador por padrão, com a ref default do repositório', async () => {
    montar();
    expect(await screen.findByText('painel explorador')).toBeInTheDocument();
    expect(screen.queryByText('painel busca')).not.toBeInTheDocument();
    expect(await screen.findAllByText(/dev/)).not.toHaveLength(0);
  });

  it('o rail troca para Buscar, e some o explorador', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('painel explorador');

    await user.click(screen.getByRole('tab', { name: 'Buscar' }));

    expect(await screen.findByText('painel busca')).toBeInTheDocument();
    expect(screen.queryByText('painel explorador')).not.toBeInTheDocument();
  });

  it('itens do rail sem dado real vêm desabilitados, com o motivo no tooltip', async () => {
    montar();
    const agentes = await screen.findByLabelText('Agentes (indisponível)');
    expect(agentes).toBeDisabled();
    expect(agentes.getAttribute('title')).toMatch(/Visão geral/);
  });

  it('o painel inferior nasce fechado, e o botão abre/fecha', async () => {
    const user = userEvent.setup();
    montar();
    await screen.findByText('painel explorador');

    expect(screen.queryByText('painel inferior')).not.toBeInTheDocument();
    const botao = screen.getByText('Painel inferior').closest('button')!;
    expect(botao.getAttribute('aria-expanded')).toBe('false');

    await user.click(botao);
    expect(await screen.findByText('painel inferior')).toBeInTheDocument();
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    // `aria-controls` aponta para uma região que existe — o defeito real que
    // a migração pro `Disclosure` fechou (o botão ad-hoc de antes não tinha
    // nenhum dos dois).
    const idRegiao = botao.getAttribute('aria-controls');
    expect(idRegiao).toBeTruthy();
    expect(document.getElementById(idRegiao!)).not.toBeNull();

    await user.click(screen.getByText('Fechar painel inferior'));
    expect(screen.queryByText('painel inferior')).not.toBeInTheDocument();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
  });

  it('sem sessão/eventos ainda, mostra 0 agentes ativos — dado real, não inventado', async () => {
    montar();
    // CLDR pt-BR: n=0 cai na categoria "one" (`Intl.PluralRules('pt-BR').select(0)
    // === 'one'`) — e por isso o pt-BR tem `activeAgents_zero` (AT-331): sem
    // ele a tela dizia "0 agente ativo".
    expect(await screen.findByText(/0 agentes ativos/)).toBeInTheDocument();
  });

  it('a status bar mostra ↑/↓ real da branch atual (getCodeBranches, não inventado)', async () => {
    montar();
    expect(await screen.findByText('↑3 ↓1')).toBeInTheDocument();
  });

  it('sem ahead/behind (branch em dia), a status bar não mostra o par vazio', async () => {
    getCodeBranches.mockResolvedValue({
      items: [
        { name: 'dev', commitSha: 'a1', protected: true, ahead: 0, behind: 0, pullRequest: null, producedBy: null },
      ],
      truncated: false,
    });
    montar();
    await screen.findByText('painel explorador');
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });

  it('AT-971 (RN-1473): sem arquivo escolhido, o editor abre o README.md da raiz', async () => {
    getCodeTree.mockResolvedValue({
      ref: 'dev',
      path: '',
      entries: [
        { path: 'docs', name: 'docs', type: 'dir', size: null },
        { path: 'README.md', name: 'README.md', type: 'file', size: 10 },
      ],
      truncated: false,
    });
    montar();
    expect(await screen.findByText(/ativo: README\.md · abas: 1 · padrão/)).toBeInTheDocument();
    expect(getCodeTree).toHaveBeenCalledWith('p-1', { ref: 'dev', path: '' });
  });

  it('AT-971: sem README na raiz, nada é aberto (o editor mostra o vazio)', async () => {
    getCodeTree.mockResolvedValue({
      ref: 'dev',
      path: '',
      entries: [{ path: 'package.json', name: 'package.json', type: 'file', size: 10 }],
      truncated: false,
    });
    montar();
    await waitFor(() => expect(getCodeTree).toHaveBeenCalled());
    expect(await screen.findByText(/ativo: nenhum · abas: 0/)).toBeInTheDocument();
  });

  it('AT-971: um README em subpasta não conta — só o da raiz', async () => {
    getCodeTree.mockResolvedValue({
      ref: 'dev',
      path: '',
      entries: [{ path: 'docs', name: 'docs', type: 'dir', size: null }],
      truncated: false,
    });
    montar();
    await waitFor(() => expect(getCodeTree).toHaveBeenCalled());
    expect(screen.getByText(/ativo: nenhum/)).toBeInTheDocument();
  });
});
