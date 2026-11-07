import type { SessionEvent } from '../lib/api-types';

import type { MotivoDoEstacionamento } from './RetomarGateEstacionado';

/** O ciclo que um `gate.rescue_parked` estacionou, lido do payload. */
export function cicloEstacionado(
  evento: SessionEvent,
): { taskId: string; gate: string; motivo: MotivoDoEstacionamento } | null {
  if (evento.type !== 'gate.rescue_parked') return null;
  const p = evento.payload as { taskId?: unknown; gate?: unknown; idadeSegundos?: unknown } | null;
  if (typeof p?.taskId !== 'string' || typeof p?.gate !== 'string') return null;
  const motivo: MotivoDoEstacionamento =
    typeof p.idadeSegundos === 'number' ? 'tempo' : 'pergunta';
  return { taskId: p.taskId, gate: p.gate, motivo };
}

/**
 * O ciclo que o reinício do engine interrompeu e o boot retomou
 * (`gate.interrupted`, RN-823), lido do payload.
 */
export function cicloInterrompido(
  evento: SessionEvent,
): { taskId: string; gate: string; retomadoEm: string | null } | null {
  if (evento.type !== 'gate.interrupted') return null;
  const p = evento.payload as { taskId?: unknown; gate?: unknown; retomadoEm?: unknown } | null;
  if (typeof p?.taskId !== 'string' || typeof p?.gate !== 'string') return null;
  return {
    taskId: p.taskId,
    gate: p.gate,
    retomadoEm: typeof p.retomadoEm === 'string' ? p.retomadoEm : null,
  };
}
