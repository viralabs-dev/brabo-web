import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import { AbasDoProjeto, type ItemDaLista } from './AbasDoProjeto';
import { itensDasAbas } from './AbasDoProjeto.helpers';
import shellPtBR from '../locales/pt-BR/shell.json';
import { simularLayoutMovel } from '../test/match-media';
import type { ContagensDeAba } from './project-tabs';

/** Instância REAL de i18next: `AbasDoProjeto` só traduz o `aria-label` da lista. */
function novaInstanciaI18n() {
  const instancia = i18next.createInstance();
  void instancia.use(initReactI18next).init({
    resources: { 'pt-BR': { shell: shellPtBR } },
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    defaultNS: 'shell',
    ns: ['shell'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instancia;
}

const item = (secao: string, label: string, chaves: string[], extra: Partial<ItemDaLista> = {}): ItemDaLista => ({
  key: chaves[0]!,
  secao,
  label,
  chaves,
  ...extra,
});

/** A mesma FORMA que `itensDasAbas` entrega: oito seções. */
const ITENS: ItemDaLista[] = [
  item('overview', 'Visão geral', ['overview']),
  item('sessoes', 'Sessões', ['criativo', 'chat']),
  item('trabalho', 'Trabalho', ['backlog', 'executores'], { count: 4 }),
  item('codigo', 'Código', ['code', 'prs'], { count: 1 }),
  item('decisoes', 'Decisões', ['approvals', 'insights'], { presenca: true }),
  item('arquitetura', 'Arquitetura', ['arquitetura'], { count: 5 }),
  item('spend', 'Gastos', ['spend']),
  item('settings', 'Configurações', ['settings']),
];

const ROTULOS = ITENS.map((i) => i.label);

function Controlado({ inicial, itens = ITENS }: { inicial: string; itens?: ItemDaLista[] }) {
  const [active, setActive] = useState(inicial);
  return (
    <I18nextProvider i18n={novaInstanciaI18n()}>
      <AbasDoProjeto projectId="p-1" nomeDoProjeto="Checkout" itens={itens} active={active} onChange={setActive} />
    </I18nextProvider>
  );
}

const texto = (b: HTMLElement) => b.textContent?.replace(/\d+$/, '');

describe('AbasDoProjeto — oito seções (ADR 0294)', () => {
  it('aparecem 8 itens na ordem declarada, numa lista vertical', () => {
    render(<Controlado inicial="overview" />);
    const lista = screen.getByRole('tablist');
    expect(lista).toHaveAttribute('aria-orientation', 'vertical');
    expect(lista).toHaveAccessibleName('Abas de Checkout');
    const abas = within(lista).getAllByRole('tab');
    expect(abas).toHaveLength(8);
    expect(abas.map(texto)).toEqual(ROTULOS);
  });

  it('a seção fica ativa quando QUALQUER sub-aba dela é a ativa; clicar move a marca', async () => {
    const usuario = userEvent.setup();
    render(<Controlado inicial="insights" />);
    const marcadas = () =>
      screen.getAllByRole('tab').filter((b) => b.getAttribute('aria-selected') === 'true').map(texto);
    expect(marcadas()).toEqual(['Decisões']);
    await usuario.click(screen.getByRole('tab', { name: /^Código/ }));
    expect(marcadas()).toEqual(['Código']);
  });
});

describe('AbasDoProjeto — contadores (RN-467)', () => {
  it('seção de UMA fila mostra o número; Decisões mostra só o ponto, sem número', () => {
    render(<Controlado inicial="overview" />);
    expect(screen.getByRole('tab', { name: /^Trabalho\s*4$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Código\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Decisões' }).textContent).toBe('Decisões');
    expect(screen.getByRole('tab', { name: 'Sessões' }).textContent).toBe('Sessões');
  });

  it('itensDasAbas: o número é de uma fila, e Decisões nunca soma aprovações e hipóteses', () => {
    const contagens: ContagensDeAba = {
      promocoesPendentes: 4,
      aprovacoesPendentes: 3,
      hipotesesPendentes: 2,
      prsPendentes: 1,
      arquiteturaPendente: 5,
    };
    const itens = itensDasAbas(contagens);
    expect(itens).toHaveLength(8);
    expect(itens.filter((i) => i.count).map((i) => [i.secao, i.count])).toEqual([
      ['trabalho', 4],
      ['codigo', 1],
      ['arquitetura', 5],
    ]);
    expect(itens.find((i) => i.secao === 'decisoes')).toMatchObject({ presenca: true, count: undefined });
    const vazio = itensDasAbas(undefined);
    expect(vazio.every((i) => i.count === undefined && !i.presenca)).toBe(true);
  });
});

describe('AbasDoProjeto — teclado', () => {
  it('ArrowDown/ArrowUp andam um item, com volta nos 8', async () => {
    const usuario = userEvent.setup();
    render(<Controlado inicial="overview" />);
    screen.getByRole('tab', { name: 'Visão geral' }).focus();
    await usuario.keyboard('{ArrowUp}');
    expect(screen.getByRole('tab', { name: 'Configurações' })).toHaveAttribute('aria-selected', 'true');
    await usuario.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true');
    await usuario.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Sessões' })).toHaveAttribute('aria-selected', 'true');
  });

  it('Home e End vão aos extremos; outra tecla não mexe', async () => {
    const usuario = userEvent.setup();
    render(<Controlado inicial="codigo" />);
    screen.getByRole('tab', { name: /^Código/ }).focus();
    await usuario.keyboard('x');
    expect(screen.getByRole('tab', { name: /^Código/ })).toHaveAttribute('aria-selected', 'false');
    await usuario.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Configurações' })).toHaveAttribute('aria-selected', 'true');
    await usuario.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Visão geral' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('AbasDoProjeto — dentro da sidebar (ADR 0211)', () => {
  it('cada item é link para a PRIMEIRA sub-aba da seção', () => {
    render(<Controlado inicial="overview" />);
    expect(screen.getByRole('tab', { name: /^Código/ })).toHaveAttribute('href', '/projects/p-1?tab=code');
    expect(screen.getByRole('tab', { name: 'Sessões' })).toHaveAttribute('href', '/projects/p-1?tab=criativo');
  });

  it('roving tabindex: só a ativa entra no Tab; sem ativa, a primeira', () => {
    const { unmount } = render(<Controlado inicial="prs" />);
    const paradas = () => screen.getAllByRole('tab').filter((a) => a.getAttribute('tabindex') === '0');
    expect(paradas().map(texto)).toEqual(['Código']);
    unmount();
    render(
      <I18nextProvider i18n={novaInstanciaI18n()}>
        <AbasDoProjeto projectId="p-1" nomeDoProjeto="Checkout" itens={ITENS} active={undefined} onChange={() => {}} />
      </I18nextProvider>,
    );
    expect(paradas().map(texto)).toEqual(['Visão geral']);
  });

  it('no telefone continua VERTICAL, na gaveta (RN-643)', () => {
    const largura = simularLayoutMovel(true);
    try {
      render(<Controlado inicial="overview" />);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
      expect(screen.getAllByRole('tab')).toHaveLength(8);
    } finally {
      largura.restaurar();
    }
  });

  it('clique com Ctrl deixa o navegador abrir o link; o simples chama onChange com a primeira sub-aba', () => {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={novaInstanciaI18n()}>
        <AbasDoProjeto projectId="p-1" nomeDoProjeto="Checkout" itens={ITENS} active="overview" onChange={onChange} />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByRole('tab', { name: /^Código/ }), { ctrlKey: true });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: /^Código/ }));
    expect(onChange).toHaveBeenCalledWith('code');
  });
});
