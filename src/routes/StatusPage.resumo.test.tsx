import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

const fetchHealth = vi.fn();
vi.mock('../lib/health', () => ({
  API_URL: 'http://api.test',
  ENGINE_URL: 'http://engine.test',
  fetchHealth: (url: string) => fetchHealth(url),
}));

const { StatusPage } = await import('./StatusPage');
const { default: i18n } = await import('../lib/i18n');
await i18n.changeLanguage('pt-BR');

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <StatusPage irPara={() => {}} voltarPara="/login" />
    </QueryClientProvider>,
  );
}

describe('StatusPage — cartão de resumo (AT-896)', () => {
  it('tudo no ar: "Tudo funcionando"', async () => {
    fetchHealth.mockResolvedValue({ service: 'api', status: 'ok', timestamp: '2026-09-30T00:00:00Z' });
    montar();
    expect(await screen.findByText('Tudo funcionando')).toBeInTheDocument();
  });

  it('um serviço fora: o cartão não afirma que tudo funciona', async () => {
    fetchHealth.mockImplementation((url: string) =>
      url === 'http://api.test'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve({ service: 'engine', status: 'ok', timestamp: '2026-09-30T00:00:00Z' }),
    );
    montar();
    expect(await screen.findByText('Algum serviço fora do ar')).toBeInTheDocument();
    expect(screen.queryByText('Tudo funcionando')).toBeNull();
  });
});
