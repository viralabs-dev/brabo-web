import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import i18n from '../lib/i18n';
import { ChipsDaArquitetura } from './ChipsDaArquitetura';

await i18n.changeLanguage('pt-BR');

const getArchitecture = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getArchitecture: (...a: unknown[]) => getArchitecture(...a),
}));

describe('ChipsDaArquitetura (v9, P16)', () => {
  it('mostra módulos · v<N>, C4 nível 2 e a hora do module_map', async () => {
    getArchitecture.mockResolvedValue({
      moduleMap: { version: 3, modules: [], createdAt: '2026-08-10T10:00:00.000Z' },
      adrs: [],
      pendencies: [],
      c4Diagram: { status: 'gerado' },
    });
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ChipsDaArquitetura projectId="p1" />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('módulos · v3')).toBeInTheDocument();
    expect(screen.getByText('C4 nível 2')).toBeInTheDocument();
    expect(screen.getByText(/^pelo Arquiteto · /)).toBeInTheDocument();
  });
});
