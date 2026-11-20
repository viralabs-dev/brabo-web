import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../lib/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { act } from 'react';
import { useState } from 'react';
import { EVENTO_ABRIR_FILA } from '../lib/perguntas-em-aberto';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
}));
vi.mock('../components/PendenciasDeOutrasSessoes', async () => {
  const React = await import('react');
  return {
    PendenciasDeOutrasSessoes: ({ aoMudarAberto }: { aoMudarAberto?: (o: boolean) => void }) => {
      React.useEffect(() => {
        const h = () => aoMudarAberto?.(true);
        window.addEventListener('brabo:abrir-fila', h);
        return () => window.removeEventListener('brabo:abrir-fila', h);
      }, [aoMudarAberto]);
      return <div data-testid="pendencias-de-outras-sessoes" />;
    },
  };
});
vi.mock('./ListaDeExecutores', () => ({ ListaDeExecutores: () => <div data-testid="lista-de-executores" /> }));

const { PainelDaSessao } = await import('./PainelDaSessao');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

function Casa({ emSheet = false }: { emSheet?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<'contexto' | 'executores' | 'pendencias'>('contexto');
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PainelDaSessao
        projectId="p"
        sessionId="s"
        aberto={aberto}
        emSheet={emSheet}
        aoFechar={() => setAberto(false)}
        aba={aba}
        aoMudarAba={(a) => {
          setAba(a);
          setAberto(true);
        }}
        comExecutores
        podeDecidir
        totalDePendencias={3}
        aoContarPendencias={() => undefined}
        contexto={<div data-testid="contexto" />}
      />
    </QueryClientProvider>
  );
}

describe('PainelDaSessao (AT-957)', () => {
  it('recolhido no desktop fica montado e escondido: o pedido de abrir a fila abre a aba Pendências', () => {
    render(<Casa />);
    const painel = screen.getByTestId('painel-da-sessao');
    expect(painel).toHaveAttribute('hidden');
    expect(painel).toHaveAttribute('data-modo', 'aba');
    // Pendências montada (ouvintes vivos); Contexto e Executores só com o painel aberto.
    expect(screen.getAllByTestId('pendencias-de-outras-sessoes', { exact: false })).toHaveLength(1);
    expect(screen.queryByTestId('contexto')).toBeNull();
    act(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_FILA, { detail: 'merges' }));
    });
    expect(painel).not.toHaveAttribute('hidden');
    expect(screen.getByRole('tab', { name: /Pendências/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Pendências/ })).toHaveTextContent('3');
  });

  it('abaixo de 1024px é o Sheet, com as mesmas três abas, e as pendências seguem montadas fechado', () => {
    render(<Casa emSheet />);
    expect(screen.getByTestId('pendencias-de-outras-sessoes')).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_FILA, { detail: 'merges' }));
    });
    expect(screen.getByRole('dialog')).toHaveAttribute('data-modo', 'sheet');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Contexto', 'Executores', 'Pendências3']);
  });
});
