import type { ProposedAction, SessionEvent } from './api-types';
import { nomeDoAgente } from './agents';

export interface PontoDoTrilho {
  id: string;
  rotulo: string;
  trecho: string;
  /** `actor.id` do agente, ou `undefined` para a fala do usuário. */
  agente: string | undefined;
  esperando: boolean;
}

const trecho = (e: SessionEvent) => {
  const p = e.payload as { text?: unknown; content?: unknown } | null;
  const texto = typeof p?.content === 'string' ? p.content : typeof p?.text === 'string' ? p.text : '';
  return texto.length > 120 ? `${texto.slice(0, 120)}…` : texto;
};

/** Um ponto por mensagem da janela carregada (AT-959): cor do agente; âmbar = o agente tem ação esperando. */
export function pontosDoTrilho(events: readonly SessionEvent[], actions: readonly ProposedAction[]): PontoDoTrilho[] {
  const esperando = new Set(actions.filter((a) => a.status === 'pending').map((a) => a.actor.id));
  return events
    .filter((e) => e.type === 'agent.response' || (e.type === 'chat.message' && e.actor.kind !== 'agent'))
    .map((e) => {
      const agente = e.type === 'agent.response' ? e.actor.id : undefined;
      return { id: e.id, rotulo: agente ? nomeDoAgente(agente) : '', trecho: trecho(e), agente, esperando: !!agente && esperando.has(agente) };
    });
}

/** Resposta que cabe em 3 linhas não precisa de "Ver resposta inteira" (heurística, sem medir o DOM). */
export const ehLongo = (texto: string) => texto.length > 240 || texto.split('\n').length > 3;
