import type { AgentArea, Budget } from '../lib/api-types';

/** O teto que o aviso do cartão do plano compara com a estimativa (RN-1062). */
export interface TetoAplicavel {
  onde: 'projeto' | 'area';
  restaMicros: number;
}

/**
 * O MENOR que resta entre o teto do projeto (só com política `block`: `allow`
 * não para nada) e o da área `dev`, a que o plano gasta. `null` sem teto
 * aplicável. A api só recusa a chamada quando o teto é atingido (RN-443), então
 * o que resta é `limite − gasto`, nunca negativo.
 */
export function menorTetoAplicavel(
  projeto: Budget | null | undefined,
  areaDev: AgentArea | undefined,
): TetoAplicavel | null {
  const candidatos: TetoAplicavel[] = [];
  if (projeto && projeto.policy === 'block') {
    candidatos.push({ onde: 'projeto', restaMicros: Math.max(0, projeto.limitMicros - projeto.spentMicros) });
  }
  if (areaDev && areaDev.budgetMicros !== null) {
    candidatos.push({ onde: 'area', restaMicros: Math.max(0, areaDev.budgetMicros - areaDev.spentMicros) });
  }
  if (candidatos.length === 0) return null;
  return candidatos.reduce((menor, c) => (c.restaMicros < menor.restaMicros ? c : menor));
}

/** Aviso quando a estimativa passa do que resta do menor teto aplicável. */
export function estimativaPassaDoTeto(
  estimativaMicros: number,
  projeto: Budget | null | undefined,
  areaDev: AgentArea | undefined,
): TetoAplicavel | null {
  const teto = menorTetoAplicavel(projeto, areaDev);
  return teto && estimativaMicros > teto.restaMicros ? teto : null;
}
