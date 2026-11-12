import { describe, expect, it, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import i18n from '../lib/i18n';
import { ProjectTodasTab } from './ProjectSessionsTab';
import { ToastProvider } from '../components/ui/ToastProvider';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }));

// A busca do RAG é medida (RN-479..481): o painel só monta com Enter/botão.
vi.mock('./ProjectRagTab', () => ({
  ProjectRagTab: ({ consultaInicial }: { consultaInicial?: string }) => (
    <div>painel rag [{consultaInicial ?? ''}]</div>
  ),
}));

const base = { projectId: 'p', createdBy: 'u', status: 'active', name: null, nextSeq: 1, closedAt: null };
const listSessions = vi.fn();
vi.mock('../lib/api-client', async () => {
  const real = await vi.importActual<typeof import('../lib/api-client')>('../lib/api-client');
  return {
    ApiError: real.ApiError,
    mensagemDaApi: real.mensagemDaApi,
    listSessions: () => listSessions(),
    listActions: () => Promise.resolve({ items: [], nextCursor: null }),
    getActiveExecutionSession: () => Promise.resolve(null),
    getProjectSpendTeam: () => Promise.resolve({ totalMicros: 0 }),
  };
});

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ProjectTodasTab projectId="p" />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  listSessions.mockResolvedValue([
    { ...base, id: 'aaaaaaaa-1', kind: 'criativa', name: 'Ideia do carrinho', createdAt: '2026-11-02T00:00:00Z', updatedAt: '', costMicros: 47000, chamadas: 3, agentes: ['criativo'], passos: 12, technical: false },
    { ...base, id: 'bbbbbbbb-2', kind: 'consultiva', name: 'Dúvida de deploy', createdAt: '2026-11-01T00:00:00Z', updatedAt: '', costMicros: 0, chamadas: 0, agentes: [], passos: 0, technical: false },
  ]);
});
afterEach(() => window.history.pushState({}, '', '/'));

describe('Sessões › Todas (AT-893, RN-1215)', () => {
  it('lista a união dos dois tipos, com passos e custo, e filtra digitando sem abrir o RAG', async () => {
    montar();
    expect(await screen.findByText(/Ideia do carrinho/)).toBeInTheDocument();
    expect(screen.getByText(/Dúvida de deploy/)).toBeInTheDocument();
    expect(screen.getByText(/12 passos/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: /Buscar nas sessões/ }), { target: { value: 'deploy' } });
    expect(screen.queryByText(/Ideia do carrinho/)).toBeNull();
    expect(screen.getByText(/Dúvida de deploy/)).toBeInTheDocument();
    expect(screen.queryByText(/painel rag/)).toBeNull();
  });

  it('Enter abre o RAG com o termo; termo curto demais abre sem consulta (falha)', async () => {
    montar();
    const campo = await screen.findByRole('textbox', { name: /Buscar nas sessões/ });
    fireEvent.change(campo, { target: { value: 'x' } });
    fireEvent.submit(campo.closest('form')!);
    expect(await screen.findByText('painel rag []')).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: 'carrinho' } });
    fireEvent.submit(campo.closest('form')!);
    expect(await screen.findByText('painel rag [carrinho]')).toBeInTheDocument();
  });

  it('?tab=rag abre já em modo RAG', async () => {
    window.history.pushState({}, '', '/projects/p?tab=rag');
    montar();
    expect(await screen.findByText(/painel rag/)).toBeInTheDocument();
  });
});
