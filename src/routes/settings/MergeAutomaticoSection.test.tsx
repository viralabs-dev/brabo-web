import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import settingsPtBR from '../../locales/pt-BR/settings.json';
import { ToastProvider } from '../../components/ui/ToastProvider';

const getProject = vi.fn();
const setMergeAutomatico = vi.fn();
let role = 'owner';

vi.mock('../../lib/api-client', () => ({
  getProject: (...a: unknown[]) => getProject(...a),
  setMergeAutomatico: (...a: unknown[]) => setMergeAutomatico(...a),
  listWorkspaces: () => Promise.resolve([{ id: 'ws-1', role }]),
}));

const { MergeAutomaticoSection } = await import('./MergeAutomaticoSection');

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
        <ToastProvider><MergeAutomaticoSection projectId="p1" /></ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const chave = () => screen.findByRole('switch');

describe('MergeAutomaticoSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'owner';
    getProject.mockResolvedValue({ id: 'p1', mergeAutomatico: false });
    setMergeAutomatico.mockResolvedValue({});
  });

  it('nasce desligada e só grava depois de confirmar', async () => {
    montar();
    const c = await chave();
    expect((c as HTMLInputElement).checked).toBe(false);
    fireEvent.click(c);
    expect(setMergeAutomatico).not.toHaveBeenCalled();
    expect(screen.getByText(/única barreira/)).toBeTruthy();
    expect(screen.getByText(/Continua manual/)).toBeTruthy();
    fireEvent.click(screen.getByText('Ligar o merge automático'));
    await waitFor(() => expect(setMergeAutomatico).toHaveBeenCalledWith('p1', true));
  });

  it('cancelar a confirmação não grava', async () => {
    montar();
    fireEvent.click(await chave());
    fireEvent.click(screen.getByText('Cancelar'));
    expect(setMergeAutomatico).not.toHaveBeenCalled();
  });

  it('maintainer não liga: chave inerte com o motivo em texto', async () => {
    role = 'maintainer';
    montar();
    expect(((await chave()) as HTMLInputElement).disabled).toBe(true);
    expect((await screen.findByTestId('merge-automatico-motivo')).textContent).toMatch(/owner/);
  });

  it('maintainer desliga direto, sem confirmar', async () => {
    role = 'maintainer';
    getProject.mockResolvedValue({ id: 'p1', mergeAutomatico: true });
    montar();
    fireEvent.click(await chave());
    await waitFor(() => expect(setMergeAutomatico).toHaveBeenCalledWith('p1', false));
  });

  it('developer não desliga: inerte com motivo', async () => {
    role = 'developer';
    getProject.mockResolvedValue({ id: 'p1', mergeAutomatico: true });
    montar();
    expect(((await chave()) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId('merge-automatico-motivo')).toBeTruthy();
  });
});
