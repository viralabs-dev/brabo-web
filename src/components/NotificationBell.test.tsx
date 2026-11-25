import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { NotificationBell, type NotificationGroup } from './NotificationBell';
import type { ItemQuePrecisaDeVoce } from '../lib/notificacoes';
import shellEn from '../locales/en/shell.json';
import shellPtBR from '../locales/pt-BR/shell.json';

/**
 * Instância REAL de i18next, própria do teste (mesmo padrão de
 * `AccountPage.test.tsx`) — `NotificationBell.tsx` só usa `useTranslation`,
 * sem provider ela cairia no fallback interno do react-i18next. `pt-BR`
 * trocado de propósito: as asserções abaixo continuam literais em
 * português.
 */
function novaInstanciaI18n() {
  const instancia = i18next.createInstance();
  void instancia.use(initReactI18next).init({
    resources: {
      en: { shell: shellEn },
      'pt-BR': { shell: shellPtBR },
    },
    lng: 'pt-BR',
    fallbackLng: 'en',
    defaultNS: 'shell',
    ns: ['shell'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instancia;
}

function comProvider(children: React.ReactNode) {
  return <I18nextProvider i18n={novaInstanciaI18n()}>{children}</I18nextProvider>;
}

/**
 * AT-966 (RN-1469, RN-1470, RN-1471): o selo conta só o que precisa de você;
 * a atividade vira uma linha por projeto e os parados somam numa linha só.
 */
const DIA = 86_400_000;
const atras = (dias: number) => new Date(Date.now() - dias * DIA).toISOString();

function item(id: string, over: Partial<ItemQuePrecisaDeVoce> = {}): ItemQuePrecisaDeVoce {
  return { id, fila: 'aprovacoes', sujeito: 'dev-api', motivo: 'Terminal · pnpm', projectId: 'p-1', projectName: 'Acme', desde: atras(2), tab: 'approvals', ...over };
}

function grupo(over: Partial<NotificationGroup> = {}): NotificationGroup {
  return { projectId: 'p-1', projectName: 'Acme', events: [{ createdAt: atras(1) } as never], unreadCount: 8404, olderCount: 0, ...over };
}

function montar(p: Partial<React.ComponentProps<typeof NotificationBell>> = {}) {
  const props = {
    precisam: [item('a'), item('b', { sujeito: 'qa-lead' })],
    precisamTotal: 2,
    groups: [grupo()],
    open: true,
    onOpenChange: () => {},
    onMarkRead: vi.fn(),
    onAbrirItem: vi.fn(),
    onAbrirProjeto: vi.fn(),
    ...p,
  };
  render(comProvider(<NotificationBell {...props} />));
  return props;
}

describe('NotificationBell (AT-966)', () => {
  it('com 8.404 eventos de atividade e 2 itens de decisão, o selo mostra 2', () => {
    montar({ open: false });
    expect(screen.getByLabelText('Notificações').textContent).toBe('2');
  });

  it('sem itens que precisam de você, o sino fica sem selo mesmo com atividade', () => {
    montar({ open: false, precisam: [], precisamTotal: 0 });
    expect(screen.getByLabelText('Notificações').textContent).toBe('');
  });

  it('"Precisam de você" tem uma linha por item com sujeito, motivo, projeto, idade e Abrir', () => {
    const p = montar();
    expect(screen.getByText('Precisam de você')).toBeTruthy();
    expect(screen.getByText('qa-lead')).toBeTruthy();
    expect(screen.getAllByText('Terminal · pnpm')).toHaveLength(2);
    expect(screen.getAllByText(/Acme · há 2 d/)).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir' })[0]);
    expect(p.onAbrirItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('a atividade é UMA linha por projeto (contagem e idade) e abre a Visão geral', () => {
    const p = montar();
    expect(screen.getByText('Atividade por projeto')).toBeTruthy();
    expect(screen.getByText(/8.404 eventos · há 1 d/)).toBeTruthy();
    expect(screen.queryByText(/atividade em/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Acme/ }));
    expect(p.onAbrirProjeto).toHaveBeenCalledWith('p-1');
  });

  it('projetos sem evento há mais de 30 dias somam numa linha só', () => {
    montar({
      groups: [
        grupo(),
        grupo({ projectId: 'p-2', projectName: 'Velho 1', unreadCount: 10, events: [{ createdAt: atras(46) } as never] }),
        grupo({ projectId: 'p-3', projectName: 'Velho 2', unreadCount: 5, events: [{ createdAt: atras(40) } as never] }),
      ],
    });
    expect(screen.getByText('2 projetos parados há mais de 30 dias · 15 eventos')).toBeTruthy();
    expect(screen.queryByText('Velho 1')).toBeNull();
  });

  it('o rodapé "Marcar atividade como lida" chama o mesmo corte de leitura', () => {
    const p = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar atividade como lida' }));
    expect(p.onMarkRead).toHaveBeenCalledTimes(1);
  });

  it('erro de leitura não vira "nada espera por você"', () => {
    montar({ precisam: undefined, precisamErro: true });
    expect(screen.getByText('Não foi possível ler o que espera por você.')).toBeTruthy();
    expect(screen.queryByText('Nada espera por você agora.')).toBeNull();
  });

  it('gaveta fechada não renderiza conteúdo nenhum', () => {
    montar({ open: false });
    expect(screen.queryByText('Precisam de você')).toBeNull();
  });
});
