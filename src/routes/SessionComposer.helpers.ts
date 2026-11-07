import { type KeyboardEvent } from 'react';

/**
 * RN-830 (AT-503): Enter no meio da composição de acento (IME, tecla morta)
 * confirma o caractere, nunca envia — o handler da página só vê a tecla
 * quando não há composição em curso. Mora aqui, e não no `SessionPage.tsx`,
 * porque a página está no teto de linhas.
 */
export function ignorarComposicaoIme(
  handler: (e: KeyboardEvent<HTMLTextAreaElement>) => void,
): (e: KeyboardEvent<HTMLTextAreaElement>) => void {
  return (e) => {
    if (e.nativeEvent.isComposing) return;
    handler(e);
  };
}
