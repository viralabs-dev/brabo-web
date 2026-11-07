import type { SessionEvent } from '../lib/api-types';

import type { PassoDoPlano, PlanoDoAgente } from './RetomarTurnoInterrompido';

export const MOTIVO_TURNO_INTERROMPIDO = 'turno_interrompido_por_reinicio';

export const ehAgente = (e: SessionEvent, id: string) => e.actor.kind === 'agent' && e.actor.id === id;

/** O `agent.error` é de turno que o reinício matou? */
export function ehTurnoInterrompido(evento: SessionEvent): boolean {
  return (
    evento.type === 'agent.error' &&
    (evento.payload as { reason?: unknown } | null)?.reason === MOTIVO_TURNO_INTERROMPIDO
  );
}

/**
 * O cartão só vale enquanto nada seguiu o `agent.error`: nem retomada
 * (`agent.turn_resumed`, automática ou não) nem turno novo do mesmo agente.
 */
export function turnoInterrompidoPendente(events: SessionEvent[], erro: SessionEvent): boolean {
  if (!ehTurnoInterrompido(erro) || erro.actor.kind !== 'agent') return false;
  const id = erro.actor.id;
  return !events.some(
    (e) =>
      e.seq > erro.seq &&
      ehAgente(e, id) &&
      (e.type === 'agent.turn_resumed' ||
        (e.type === 'agent.status' &&
          (e.payload as { status?: unknown } | null)?.status === 'working')),
  );
}

/** O último `agent.plan` do agente antes do erro (o vigente). */
export function planoVigente(events: SessionEvent[], erro: SessionEvent): PlanoDoAgente | null {
  if (erro.actor.kind !== 'agent') return null;
  const id = erro.actor.id;
  const plano = events
    .filter((e) => e.type === 'agent.plan' && e.seq < erro.seq && ehAgente(e, id))
    .sort((a, b) => b.seq - a.seq)[0];
  const p = plano?.payload as { objetivo?: unknown; passos?: unknown } | undefined;
  if (typeof p?.objetivo !== 'string' || !Array.isArray(p.passos)) return null;
  const passos = p.passos.filter(
    (x): x is PassoDoPlano =>
      typeof (x as PassoDoPlano)?.texto === 'string' &&
      typeof (x as PassoDoPlano).estado === 'string',
  );
  return { objetivo: p.objetivo, passos };
}

/** `agent.turn_resumed` com `automatica: true`: vira linha discreta no fio. */
export const ehRetomadaAutomatica = (e: SessionEvent): boolean =>
  e.type === 'agent.turn_resumed' &&
  (e.payload as { automatica?: unknown } | null)?.automatica === true;
