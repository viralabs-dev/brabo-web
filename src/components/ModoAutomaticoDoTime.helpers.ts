import { AGENT_AUTONOMY_ALL_ACTIONS, type AgentAutonomyRule } from '../lib/api-types';

import { AREAS } from '../lib/agent-areas.generated';

export function agentesEmModoAutomatico(
  rules: readonly AgentAutonomyRule[] | undefined,
): Set<string> {
  return new Set(
    (rules ?? [])
      .filter(
        (r) => r.actionType === AGENT_AUTONOMY_ALL_ACTIONS && r.mode === 'auto_approve',
      )
      .map((r) => r.agentId),
  );
}

/**
 * AT-449 (RN-766): a oferta cobre os subagentes de GATE desde a ativação, e
 * não só depois que eles aparecem no roster — o `qa-automacao` só entra na
 * lista quando o primeiro evento dele chega, e aí a primeira ação dele já
 * está esperando clique. São os agentes da área de QA (`AREAS.qa`), que
 * rodam o `terminal`; a ordem é a do time e depois a dos gates, sem repetir.
 */
export function agentesDaOfertaEmLote(time: readonly string[]): string[] {
  const gates = [AREAS.qa.lead, ...AREAS.qa.members];
  return [...new Set([...time, ...gates])];
}
