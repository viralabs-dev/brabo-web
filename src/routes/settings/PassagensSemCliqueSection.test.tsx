import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import settingsPtBR from '../../locales/pt-BR/settings.json';
import { ToastProvider } from '../../components/ui/ToastProvider';

const listAutomacoes = vi.fn();
const setAutomacao = vi.fn();
let role = 'maintainer';

vi.mock('../../lib/api-client', () => ({
  listAutomacoes: (...a: unknown[]) => listAutomacoes(...a),
  setAutomacao: (...a: unknown[]) => setAutomacao(...a),
  listWorkspaces: () => Promise.resolve([{ id: 'ws-1', role }]),
}));

const { PassagensSemCliqueSection } = await import('./PassagensSemCliqueSection');

function montar() {
  const i18n = i18next.createInstance();
  void i18n.use(initReactI18next).init({
    resources: { 'pt-BR': { settings: settingsPtBR } },
    lng: 'pt-BR', fallbackLng: 'pt-BR', defaultNS: 'settings', ns: ['settings'],
    interpolation: { escapeValue: false }, returnNull: false,
  });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <I18nextProvider i18n={i18n}>
        <ToastProvider><PassagensSemCliqueSection projectId="p1" /></ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('PassagensSemCliqueSection (RN-1421)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'maintainer';
    listAutomacoes.mockResolvedValue([
      { categoria: 'handoff', chave: 'arquiteto->infra', ligada: true, origem: 'padrao' },
      { categoria: 'handoff', chave: 'infra->dev-lead', ligada: true, origem: 'padrao' },
    ]);
    setAutomacao.mockResolvedValue([]);
  });

  it('nasce ligada e desligar grava a chave da passagem', async () => {
    montar();
    const chaves = await screen.findAllByRole('switch');
    expect(chaves).toHaveLength(2);
    expect((chaves[0] as HTMLInputElement).checked).toBe(true);
    fireEvent.click(chaves[0]);
    await waitFor(() => expect(setAutomacao).toHaveBeenCalledWith('p1', 'handoff', 'arquiteto->infra', false));
  });

  it('viewer vê as chaves inertes com o motivo em texto', async () => {
    role = 'viewer';
    montar();
    const chaves = await screen.findAllByRole('switch');
    expect(chaves.every((c) => (c as HTMLInputElement).disabled)).toBe(true);
    expect((await screen.findAllByTestId('passagem-sem-clique-motivo'))[0].textContent).toMatch(/maintainer/);
  });
});
