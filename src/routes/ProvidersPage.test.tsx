import { afterAll, beforeAll, describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ProvidersPage } from './ProvidersPage';
import i18n from '../lib/i18n';

const listProviderCapabilities = vi.fn();
const listCredentialedProviders = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  listProviderCapabilities: () => listProviderCapabilities(),
  listCredentialedProviders: (...a: unknown[]) => listCredentialedProviders(...a),
}));

const useCurrentWorkspaceWithRole = vi.fn();
vi.mock('../lib/hooks', () => ({
  useCurrentWorkspaceWithRole: () => useCurrentWorkspaceWithRole(),
}));

vi.mock('./settings/CredentialsSection', () => ({
  CredentialsSection: () => <div>credenciais</div>,
}));
vi.mock('../components/ModelCatalogSection', () => ({
  ModelCatalogSection: (p: { projectId?: string }) => (
    <div>{p.projectId === undefined ? 'catalogo-sem-projeto' : 'catalogo-com-projeto'}</div>
  ),
}));

const caps = (extra: Record<string, boolean>) => ({
  streaming: true,
  toolCalling: true,
  listModels: false,
  embeddings: false,
  routingPreference: false,
  stickySession: false,
  priceCeiling: false,
  promptCaching: false,
  vision: false,
  ...extra,
});

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ProvidersPage />
    </QueryClientProvider>,
  );
}

describe('ProvidersPage', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });
  afterAll(() => {
    void i18n.changeLanguage('en');
  });
  beforeEach(() => {
    vi.clearAllMocks();
    listCredentialedProviders.mockRejectedValue(new Error('indisponível'));
    useCurrentWorkspaceWithRole.mockReturnValue({
      data: { workspace: { id: 'w1' }, role: 'owner' },
    });
  });

  it('compõe as quatro partes e itera as chaves das capabilities (provider/chave nova aparece)', async () => {
    listProviderCapabilities.mockResolvedValue([
      { provider: 'openrouter', capabilities: caps({ stickySession: true }) },
      { provider: 'ficticio', capabilities: caps({ stickySession: false }) },
    ]);
    montar();
    expect(await screen.findByText('ficticio')).toBeInTheDocument();
    expect(screen.getByText('Sessão fixa')).toBeInTheDocument();
    expect(screen.getByText('Sessão fixa')).toHaveAttribute('title', 'stickySession');
    expect(screen.queryByText('stickySession')).toBeNull();
    expect(screen.getByText('credenciais')).toBeInTheDocument();
    expect(screen.getByText('catalogo-sem-projeto')).toBeInTheDocument();
    // O gasto das chaves mudou para a página global Gastos (AT-632).
    expect(screen.queryByText('Gasto das suas chaves')).toBeNull();
  });

  it('a capability do teto de preço aparece como coluna e a nota explica o teto', async () => {
    listProviderCapabilities.mockResolvedValue([
      { provider: 'openrouter', capabilities: caps({ priceCeiling: true }) },
    ]);
    montar();
    expect(await screen.findByText('Cache de preço')).toBeInTheDocument();
    expect(screen.queryByText(/teto de preço|price ceiling/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Ajuda: |^Help: / }));
    expect(await screen.findByText(/teto de preço|price ceiling/)).toBeInTheDocument();
  });

  it('AT-976 (RN-1482): nenhum identificador em camelCase na matriz; "não provado" é texto sem selo', async () => {
    listProviderCapabilities.mockResolvedValue([
      { provider: 'openrouter', capabilities: caps({ stickySession: true, reasoningText: false, novaCapacidade: true }) },
    ]);
    montar();
    const tabela = await screen.findByRole('table');
    const cabecalhos = within(tabela).getAllByRole('columnheader').map((c) => c.textContent);
    expect(cabecalhos).toEqual(expect.arrayContaining([
      'Streaming', 'Ferramentas', 'Lista de modelos', 'Embeddings', 'Raciocínio',
      'Roteamento', 'Sessão fixa', 'Cache de preço', 'Cache de prompt', 'Visão',
    ]));
    // Só a chave futura, ainda sem rótulo, cai no identificador.
    expect(cabecalhos.filter((c) => /[a-z][A-Z]/.test(c ?? ''))).toEqual(['novaCapacidade']);
    const naoProvado = within(tabela).getAllByText('não provado')[0];
    expect(naoProvado.getAttribute('data-slot')).not.toBe('badge');
    expect(within(tabela).getAllByText('provado').length).toBeGreaterThan(0);
  });

  it('capabilities falhando mostram erro nomeado', async () => {
    listProviderCapabilities.mockRejectedValue(new Error('boom'));
    montar();
    expect(
      await screen.findByText(/Não foi possível carregar as capacidades|Could not load the provider capabilities/),
    ).toBeInTheDocument();
  });

  it('só os providers com chave do titular entram na tabela, com rótulo e a linha "de fora"', async () => {
    listCredentialedProviders.mockResolvedValue({ providers: ['openrouter'] });
    listProviderCapabilities.mockResolvedValue([
      { provider: 'openrouter', capabilities: caps({ stickySession: true }) },
      { provider: 'anthropic', capabilities: caps({}) },
      { provider: 'ollama', capabilities: caps({}) },
    ]);
    montar();
    expect(await screen.findByText(/(1 de fora, sem chave do titular|1 left out, no key from the owner of record): Anthropic/)).toBeInTheDocument();
    const tabela = screen.getByRole('table');
    expect(tabela).toHaveTextContent('OpenRouter');
    expect(tabela).toHaveTextContent('Ollama');
    expect(tabela).not.toHaveTextContent('Anthropic');
  });

  it('chave do titular que falha mostra TODOS os providers ("não sei" não é "não tem")', async () => {
    listProviderCapabilities.mockResolvedValue([
      { provider: 'openrouter', capabilities: caps({}) },
      { provider: 'anthropic', capabilities: caps({}) },
    ]);
    montar();
    expect(await screen.findByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.queryByText(/de fora|left out/)).toBeNull();
  });
});
