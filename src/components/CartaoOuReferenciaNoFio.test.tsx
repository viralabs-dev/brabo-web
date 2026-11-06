import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ProposedAction } from '../lib/api-types';
import { registrarAcoesNoBloco } from '../lib/acoes-no-bloco';
import i18n from '../lib/i18n';
import { EVENTO_ABRIR_FILA } from '../lib/perguntas-em-aberto';
import { CartaoOuReferenciaNoFio } from './CartaoOuReferenciaNoFio';

function acao(status: ProposedAction['status']): ProposedAction {
  return {
    id: 'm-1',
    sessionId: 's-1',
    actionType: 'git_merge',
    status,
    actor: { kind: 'user', id: 'u' },
    payload: {},
    createdAt: new Date().toISOString(),
  } as unknown as ProposedAction;
}

function Fio({ status }: { status: ProposedAction['status'] }) {
  return (
    <CartaoOuReferenciaNoFio action={acao(status)}>
      <button type="button">Aprovar</button>
    </CartaoOuReferenciaNoFio>
  );
}

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

let soltar: (() => void) | null = null;
afterEach(() => {
  act(() => soltar?.());
  soltar = null;
});

describe('CartaoOuReferenciaNoFio (RN-843, AT-512)', () => {
  it('com a ação pendente desenhada no bloco, o fio só aponta para lá: um único Aprovar', () => {
    soltar = registrarAcoesNoBloco(['m-1']);
    render(
      <>
        <button type="button">Aprovar</button>
        <Fio status="pending" />
      </>,
    );
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
    expect(screen.getByTestId('referencia-ao-bloco')).toBeInTheDocument();
  });

  it('sem o bloco montado, o fio mostra o cartão completo', () => {
    render(<Fio status="pending" />);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.queryByTestId('referencia-ao-bloco')).toBeNull();
  });

  it('decidida, o fio volta ao cartão (histórico) mesmo com o registro', () => {
    soltar = registrarAcoesNoBloco(['m-1']);
    render(<Fio status="approved" />);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });

  it('o bloco desmontado devolve o cartão ao fio', () => {
    soltar = registrarAcoesNoBloco(['m-1']);
    render(<Fio status="pending" />);
    expect(screen.queryByRole('button', { name: 'Aprovar' })).toBeNull();
    act(() => soltar?.());
    soltar = null;
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
  });

  it('AT-753: a referência tem o botão "Ver o cartão", que pede a aba prontas', () => {
    soltar = registrarAcoesNoBloco(['m-1']);
    const ouvinte = vi.fn((e: Event) => (e as CustomEvent).detail);
    window.addEventListener(EVENTO_ABRIR_FILA, ouvinte);
    render(<Fio status="pending" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver o cartão' }));
    window.removeEventListener(EVENTO_ABRIR_FILA, ouvinte);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    expect(ouvinte.mock.results[0]!.value).toBe('prontas');
  });
});
