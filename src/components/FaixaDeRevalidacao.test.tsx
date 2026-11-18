import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import uiPtBR from '../locales/pt-BR/ui.json';
import { ApiError } from '../lib/api-client';
import { FaixaDeRevalidacao } from './FaixaDeRevalidacao';

function montar(client: QueryClient) {
  const i18n = i18next.createInstance();
  void i18n.use(initReactI18next).init({
    resources: { 'pt-BR': { ui: uiPtBR } },
    lng: 'pt-BR',
    defaultNS: 'ui',
    ns: ['ui'],
    interpolation: { escapeValue: false },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <FaixaDeRevalidacao projectId="p1" />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

describe('FaixaDeRevalidacao (AT-965)', () => {
  it('sem consulta em erro, não aparece', () => {
    montar(new QueryClient());
    expect(screen.queryByTestId('faixa-de-revalidacao')).toBeNull();
  });

  it('com dado em cache e a revalidação em 429, mostra a faixa e "Tentar agora" refaz a consulta', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['architecture', 'p1'], { ok: true });
    montar(client);
    const fn = vi.fn().mockRejectedValue(new ApiError(429, {}));
    await client.fetchQuery({ queryKey: ['architecture', 'p1'], queryFn: fn, staleTime: 0 }).catch(() => {});

    await waitFor(() =>
      expect(screen.getByTestId('faixa-de-revalidacao')).toHaveTextContent('Muitas requisições agora.'),
    );
    // O dado em cache segue lá: a tela não o joga fora.
    expect(client.getQueryData(['architecture', 'p1'])).toEqual({ ok: true });
    screen.getByRole('button', { name: 'Tentar agora' }).click();
    await waitFor(() => expect(fn.mock.calls.length).toBeGreaterThan(1));
  });
});
