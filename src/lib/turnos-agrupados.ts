import type { SessionEvent } from './api-types';

/** AT-975 (RN-1480): turnos SEGUIDOS do mesmo agente viram uma linha. */
export interface GrupoDeTurnos {
  agenteId: string;
  /** O turno mais recente do grupo (a idade e o destino do clique). */
  maisRecente: SessionEvent;
  turnos: SessionEvent[];
}

/** `turnos` vem do mais novo para o mais antigo; o grupo respeita essa ordem. */
export function agruparTurnos(turnos: SessionEvent[]): GrupoDeTurnos[] {
  const grupos: GrupoDeTurnos[] = [];
  for (const e of turnos) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.agenteId === e.actor.id) ultimo.turnos.push(e);
    else grupos.push({ agenteId: e.actor.id, maisRecente: e, turnos: [e] });
  }
  return grupos;
}
