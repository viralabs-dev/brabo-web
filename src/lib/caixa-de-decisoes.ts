import type { DecisionInbox } from './api-types';

export type ChaveDaCaixa = keyof DecisionInbox['filas'];

/** A ordem fixa dos cinco cartões (ADR 0294); nunca somados (RN-467). */
export const FILAS_DA_CAIXA: readonly ChaveDaCaixa[] = ['aprovacoes', 'prs', 'promocoes', 'arquitetura', 'hipoteses'];

/** Presença, não quantidade: `some`, nunca soma (RN-467). */
export function caixaTemAlgo(inbox: DecisionInbox | undefined): boolean {
  return !!inbox && FILAS_DA_CAIXA.some((k) => inbox.filas[k].total > 0);
}

/** `+` quando a fila foi cortada pelo teto: o total é real, o recorte é declarado (RN-180). */
export const totalDaFila = (f: { total: number; truncada: boolean }) => `${f.total}${f.truncada ? '+' : ''}`;
