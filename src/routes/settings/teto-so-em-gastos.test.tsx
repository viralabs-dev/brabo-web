import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import i18n from '../../lib/i18n';
import { ToastProvider } from '../../components/ui/ToastProvider';

const getProject = vi.fn();
const getProjectBudget = vi.fn();

vi.mock('../../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../lib/api-client')>();
  return {
    ...original,
    getProject: (...a: unknown[]) => getProject(...a),
    getProjectBudget: (...a: unknown[]) => getProjectBudget(...a),
  };
});

// Com roteador no contexto a linha do teto usa o `Link` (sem recarregar a página).
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({}),
  Link: ({ to, params, search, hash, children }: Record<string, unknown> & { children: React.ReactNode }) => (
    <a
      data-router-link
      data-to={String(to)}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
      data-hash={String(hash)}
    >
      {children}
    </a>
  ),
}));

const { ExecutionSection } = await import('./ExecutionSection');
const { BarraDeSalvar, ProvedorDoSalvarDoCabecalho } = await import('./salvar-do-cabecalho');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

beforeEach(() => {
  getProject.mockResolvedValue({ id: 'p1', maxConsecutiveBlocked: null });
  getProjectBudget.mockResolvedValue(null);
});

describe('teto do mês só em Gastos (RN-1455)', () => {
  it('"Editar em Gastos" é o Link do roteador para ?tab=spend#teto, não um <a href> que recarrega', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ProvedorDoSalvarDoCabecalho>
            <BarraDeSalvar />
            <ExecutionSection projectId="p1" />
          </ProvedorDoSalvarDoCabecalho>
        </ToastProvider>
      </QueryClientProvider>,
    );

    const link = await screen.findByText('Editar em Gastos');
    expect(link).toHaveAttribute('data-router-link');
    expect(link).toHaveAttribute('data-to', '/projects/$projectId');
    expect(link).toHaveAttribute('data-params', '{"projectId":"p1"}');
    expect(link).toHaveAttribute('data-search', '{"tab":"spend"}');
    expect(link).toHaveAttribute('data-hash', 'teto');
    expect(link).not.toHaveAttribute('href');
  });
});
