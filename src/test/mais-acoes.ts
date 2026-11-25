import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/** AT-950: abre o menu "⋯" do (primeiro) cartão do fio e devolve o item pelo nome. */
export async function itemDoMenu(nome: RegExp | string) {
  await userEvent.click((await screen.findAllByTestId('mais-acoes-do-cartao'))[0]!);
  return screen.findByRole('menuitem', { name: nome });
}

export async function abrirMaisAcoes() {
  await userEvent.click((await screen.findAllByTestId('mais-acoes-do-cartao'))[0]!);
}
