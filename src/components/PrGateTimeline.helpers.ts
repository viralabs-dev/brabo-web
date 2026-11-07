import type { RegistroDeGates } from '../lib/api-types';

import type { StepKey } from './PrGateTimeline';

/**
 * Chave i18n do rótulo de cada etapa. NÃO é a lista de etapas — essa vem do
 * registro (`GET /gates`, ADR 0054). Aqui só mora como a etapa se CHAMA para
 * o usuário, que é decisão de tela e não de política. `etapasDaEsteira`
 * devolve a CHAVE (não o texto): quem renderiza resolve com `t()`.
 */
export const ROTULOS: Record<StepKey, string> = {
  dev: 'prGateTimeline.steps.dev',
  qa: 'prGateTimeline.steps.qa',
  secops: 'prGateTimeline.steps.secops',
  user: 'prGateTimeline.steps.user',
};

/** Qual etapa da tela cada gate do registro representa. */
export const ETAPA_DO_GATE: Record<string, StepKey> = {
  'qa-verificada': 'qa',
  'secops-segura': 'secops',
  'merge-protegida': 'user',
};

/**
 * As etapas da esteira de PR, DERIVADAS do registro (FASE 15b).
 *
 * `dev` sempre abre a linha: não é gate, é quem produz o que os gates julgam.
 * As demais saem dos gates de `fluxo: pr` que o registro traz como ativos — e
 * é por isso que um gate desativado, ou um que ainda não existe
 * (`status: planned`), some da tela sozinho em vez de virar uma etapa morta
 * que ninguém lembra de tirar.
 *
 * Sem registro (ainda carregando, ou a chamada falhou), cai na lista completa:
 * a esteira é informativa, e escondê-la por causa de uma requisição seria
 * pior que mostrá-la sem a curadoria do registro.
 */
export function etapasDaEsteira(
  registro: RegistroDeGates | undefined,
): { key: StepKey; label: string }[] {
  const chaves: StepKey[] =
    registro == null
      ? ['dev', 'qa', 'secops', 'user']
      : [
          'dev',
          ...registro.gates
            .filter((g) => g.fluxo === 'pr')
            .map((g) => ETAPA_DO_GATE[g.id])
            .filter((k): k is StepKey => k != null),
        ];

  // `Set` porque QA e SecOps de infra compartilham a mesma etapa de tela, e a
  // ordem do registro é a ordem da esteira.
  return [...new Set(chaves)].map((key) => ({ key, label: ROTULOS[key] }));
}
