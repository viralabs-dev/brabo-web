import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import settingsPtBR from '../../locales/pt-BR/settings.json';
import { ToastProvider } from '../../components/ui/ToastProvider';

const getWorkspaceToolRouter = vi.fn();
const setWorkspaceToolRouter = vi.fn();
let role = 'owner';

vi.mock('../../lib/api-client', () => ({
  getWorkspaceToolRouter: (...a: unknown[]) => getWorkspaceToolRouter(...a),
  setWorkspaceToolRouter: (...a: unknown[]) => setWorkspaceToolRouter(...a),
  mensagemDaApi: (e: Error) => e.message,
  listWorkspaces: () => Promise.resolve([{ workspace: { id: 'ws-1' }, role }]),
}));

const { RoteadorDeFerramentasSection } = await import('./RoteadorDeFerramentasSection');

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
        <ToastProvider><RoteadorDeFerramentasSection projectId="p1" /></ToastProvider>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

const laya = (o: object) => ({
  estado: 'proficiente', motivo: null, desde: '2026-11-09T12:00:00.000Z',
  dispositivo: 'cuda', vramLivreMiB: 5673, p95Ms: 59, ...o,
});
const resposta = (roteador: string, l: object) => ({ roteador, laya: laya(l) });
const opcao = async (nome: string) => {
  const b = await screen.findByRole('button', { name: nome });
  return { el: b, disabled: b.hasAttribute('disabled') || b.getAttribute('aria-disabled') === 'true' };
};
const estado = async () => (await screen.findByTestId('roteador-laya-estado')).textContent;

describe('RoteadorDeFerramentasSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    role = 'owner';
    setWorkspaceToolRouter.mockResolvedValue({});
  });

  it('proficiente: Laya ativa, com p95, VRAM e "desde"', async () => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', {}));
    montar();
    expect(await estado()).toMatch(/p95 59 ms · VRAM livre 5673 MiB/);
    expect(screen.getByText(/Visto assim desde/)).toBeTruthy();
    expect((await opcao('Laya')).disabled).toBe(false);
  });

  it('troca grava na hora', async () => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', {}));
    montar();
    fireEvent.click((await opcao('Desligado')).el);
    await waitFor(() => expect(setWorkspaceToolRouter).toHaveBeenCalledWith('ws-1', 'desligado'));
  });

  it.each([
    ['nao_configurado', null, /não tem o Laya/],
    ['sem_resposta', 'http_500', /não respondeu/],
    ['sem_gpu', 'sem_gpu', /sem GPU \(dispositivo: cuda\)/],
    ['sem_gpu', 'vram_insuficiente', /VRAM livre 1800 MiB, abaixo/],
    ['lento', 'p95_acima_do_teto', /p95 da sonda 900 ms/],
    ['lento', 'sonda_em_andamento', /Medindo o Laya/],
    ['lento', 'sonda_falhou', /sonda de boot falhou/],
  ])('%s/%s: texto próprio e Laya inerte', async (est, mot, texto) => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', { estado: est, motivo: mot, vramLivreMiB: 1800, p95Ms: 900 }));
    montar();
    expect(await estado()).toMatch(texto);
    expect((await opcao('Laya')).disabled).toBe(true);
  });

  it('motivo desconhecido mostra o código bruto', async () => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', { estado: 'sem_resposta', motivo: 'TimeoutError' }));
    montar();
    expect((await screen.findByTestId('roteador-codigo')).textContent).toBe('TimeoutError');
  });

  it('laya escolhido com o serviço fora: aviso de queda, sem "voltou ao Jev"', async () => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('laya', { estado: 'sem_resposta', motivo: 'http_500' }));
    montar();
    const aviso = (await screen.findByTestId('roteador-queda')).textContent!;
    expect(aviso).toMatch(/catálogo inteiro/);
    expect(aviso).not.toMatch(/voltou ao Jev/);
    expect((await opcao('Jev')).disabled).toBe(false);
  });

  it('não-owner: inerte, com o motivo em texto', async () => {
    role = 'developer';
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', {}));
    montar();
    expect((await screen.findByTestId('roteador-motivo')).textContent).toMatch(/owner/);
    expect((await opcao('Desligado')).disabled).toBe(true);
  });

  it('409: toast com a mensagem da api e relê o estado', async () => {
    getWorkspaceToolRouter.mockResolvedValue(resposta('jev', {}));
    setWorkspaceToolRouter.mockRejectedValue(new Error('Laya indisponível agora'));
    montar();
    fireEvent.click((await opcao('Laya')).el);
    expect(await screen.findByText('Laya indisponível agora')).toBeTruthy();
    await waitFor(() => expect(getWorkspaceToolRouter).toHaveBeenCalledTimes(2));
  });
});
