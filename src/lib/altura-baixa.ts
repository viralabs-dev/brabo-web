import { useSyncExternalStore } from 'react';

/** Abaixo disto (1366 × 768 dá ~645 px úteis) a sidebar compacta o Workspace (AT-964). */
export const CONSULTA_ALTURA_BAIXA = '(max-height: 799px)';

function assinar(aoMudar: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mql = window.matchMedia(CONSULTA_ALTURA_BAIXA);
  mql.addEventListener('change', aoMudar);
  return () => mql.removeEventListener('change', aoMudar);
}

function ler(): boolean {
  // Sem `matchMedia` (jsdom, SSR): altura normal, o layout de sempre.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(CONSULTA_ALTURA_BAIXA).matches;
}

/** `true` com altura útil < 800 px; re-renderiza ao cruzar o corte. */
export function useAlturaBaixa(): boolean {
  return useSyncExternalStore(assinar, ler, () => false);
}
