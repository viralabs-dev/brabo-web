import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import settingsPtBR from '../../locales/pt-BR/settings.json';
import { ToastProvider } from '../../components/ui/ToastProvider';

const listAutomacoes = vi.fn();
const desfazerAutomacao = vi.fn();
let role = 'maintainer';

vi.mock('../../lib/api-client', () => ({
  listAutomacoes: (...a: unknown[]) => listAutomacoes(...a),
  desfazerAutomacao: (...a: unknown[]) => desfazerAutomacao(...a),
  listWorkspaces: () => Promise.resolve([{ id: 'ws-1', role }]),
}));

const { RegrasDeOfertaSection } = await import('./RegrasDeOfertaSection');

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
        <ToastProvider><RegrasDeOfertaSection projectId="p1" /></ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe('RegrasDeOfertaSection (RN-1443)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'maintainer';
    listAutomacoes.mockResolvedValue([
      { categoria: 'handoff', chave: 'arquiteto->infra', ligada: true, origem: 'padrao' },
      { categoria: 'aprovacao', chave: 'git_commit@dev', ligada: true, origem: 'oferta' },
    ]);
    desfazerAutomacao.mockResolvedValue(undefined);
  });

  it('lista só as regras de oferta e Desfazer chama o DELETE', async () => {
    montar();
    const botao = await screen.findByRole('button', { name: 'Desfazer' });
    expect(screen.getAllByRole('button', { name: 'Desfazer' })).toHaveLength(1);
    fireEvent.click(botao);
    await waitFor(() => expect(desfazerAutomacao).toHaveBeenCalledWith('p1', 'aprovacao', 'git_commit@dev'));
  });

  it('viewer vê Desfazer inerte com o motivo em texto', async () => {
    role = 'viewer';
    montar();
    expect(await screen.findByRole('button', { name: 'Desfazer' })).toBeDisabled();
    expect((await screen.findByTestId('regra-de-oferta-motivo')).textContent).toMatch(/maintainer/);
  });
});
