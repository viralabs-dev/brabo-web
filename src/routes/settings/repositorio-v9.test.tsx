import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import i18n from '../../lib/i18n';
import { ProvedorDoSumario } from './SecaoDeConfiguracoes';

const getRepository = vi.fn();
vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  getRepository: (...a: unknown[]) => getRepository(...a),
}));
const { RepositorySection } = await import('./RepositorySection');

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ProvedorDoSumario>
        <RepositorySection projectId="p1" />
      </ProvedorDoSumario>
    </QueryClientProvider>,
  );
}

describe('RepositorySection — P18 (v9)', () => {
  it('sem repositório a seção continua na moldura e diz "não provisionado"', async () => {
    await i18n.changeLanguage('pt-BR');
    getRepository.mockResolvedValue(null);
    montar();
    expect(await screen.findByText('Ainda não provisionado')).toBeInTheDocument();
  });

  it('com repositório mostra o caminho e os chips de provider e branch', async () => {
    await i18n.changeLanguage('pt-BR');
    getRepository.mockResolvedValue({ origin: 'created', externalId: '/data/x.git', provider: 'local', defaultBranch: 'main' });
    montar();
    expect(await screen.findByText('/data/x.git')).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });
});
