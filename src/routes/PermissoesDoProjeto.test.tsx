import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PermissoesDoProjeto } from './PermissoesDoProjeto';
import type { PermissionsFile } from '../lib/api-types';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const getProjectPermissions = vi.fn();
const setProjectPermissions = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    getProjectPermissions: (...a: unknown[]) => getProjectPermissions(...a),
    setProjectPermissions: (...a: unknown[]) => setProjectPermissions(...a),
  };
});

const PERMISSOES = { allow: ['pnpm test'], deny: ['rm -rf *'], ask: [] } as PermissionsFile;

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PermissoesDoProjeto projectId="proj-1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getProjectPermissions.mockResolvedValue(PERMISSOES);
});

describe('PermissoesDoProjeto (AT-895, extraída da aba Aprovações)', () => {
  it('permissões que FALHARAM não viram "nenhuma regra configurada"', async () => {
    getProjectPermissions.mockRejectedValue(new Error('sem acesso ao projeto'));
    montar();
    expect(await screen.findByText('Não foi possível carregar as permissões do projeto.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma regra configurada ainda.')).not.toBeInTheDocument();
  });

  it('cada regra tem um revogar que diz o que revoga', async () => {
    setProjectPermissions.mockResolvedValue(PERMISSOES);
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar rm -rf *' }));
    await waitFor(() => expect(setProjectPermissions).toHaveBeenCalledTimes(1));
    expect(setProjectPermissions.mock.calls[0][1].deny).toEqual([]);
  });

  it('a busca que não acha nada diz isso, e não "nenhuma regra configurada"', async () => {
    montar();
    await screen.findByText('rm -rf *');
    fireEvent.change(screen.getByPlaceholderText('Buscar regra ou padrão…'), { target: { value: 'nao-existe' } });
    expect(await screen.findByText('Nenhuma regra corresponde à busca.')).toBeInTheDocument();
  });
});
