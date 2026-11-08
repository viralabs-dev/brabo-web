import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import i18n from '../lib/i18n';
import { AGENTS } from '../lib/agents';
import type { SessionEvent } from '../lib/api-types';
import { criarStoreDoStreaming } from '../lib/streaming-do-turno';
import { SessionFio } from './SessionFio';
import { agruparTimelinePorAgente, dividirFio } from './session-fio';
import { montarTimeline, type ContextoDaTimeline } from './session-timeline-montagem';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

/** AT-803 (RN-974): um evento gera várias entradas com o MESMO `seq`; o fio
 * precisa de chave própria por entrada, senão o React deixa nós órfãos. */

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

function evento(seq: number, type: string, actor: SessionEvent['actor'], payload: object): SessionEvent {
  return {
    id: `e${seq}`,
    seq,
    type,
    actor,
    payload,
    createdAt: '2026-11-07T12:00:00.000Z',
  } as SessionEvent;
}
const usuario = (seq: number) => evento(seq, 'chat.message', { kind: 'user', id: 'u1' }, { text: `pergunta ${seq}` });
const po = (seq: number, extra: object = {}) =>
  evento(seq, 'agent.response', { kind: 'agent', id: 'po' }, { content: `resposta ${seq}`, ...extra });

function ctxDe(events: SessionEvent[]): ContextoDaTimeline {
  const nada = vi.fn();
  return {
    events,
    actions: [],
    backlogQuery: { data: undefined },
    projectId: 'p1',
    sessionId: 's1',
    t: i18n.getFixedT('pt-BR', 'sessionPage'),
    autoria: { meuId: null, meuEmail: null, membros: undefined },
    queryClient: {} as never,
    invalidateActions: nada,
    ofertasAcionaveis: [],
    isActive: true,
    semRepositorio: false,
    promovendoStoryId: null,
    promovendoTodas: false,
    ativandoExecucao: false,
    podeAtivarAutoMode: false,
    podeDecidir: true,
    setRecusandoStory: nada,
    setMotivoRecusa: nada,
    handlePromoteStory: nada,
    handlePromoteAll: nada,
    handleAcceptHandoff: nada,
    handleActivateExecution: nada,
    handleActivateAutoMode: nada,
    iniciarTurnoDoAgente: nada,
    acompanharTurnoPeloLog: nada,
    finalizarTurnoDoAgente: nada,
  } as unknown as ContextoDaTimeline;
}

const fioDe = (events: SessionEvent[]) =>
  dividirFio(agruparTimelinePorAgente(montarTimeline(ctxDe(events)), [], [], i18n.getFixedT('pt-BR', 'sessionPage')));

function elemento(events: SessionEvent[]) {
  return (
    <SessionFio
      conviteVisivel={false}
      sessaoCriativa={false}
      criativoActive
      isActive
      handleStartIdeation={async () => {}}
      setDraft={() => {}}
      fio={fioDe(events)}
      optimisticUser={null}
      user={{ name: 'Ana' }}
      turnoViaCanal={false}
      streamingStore={criarStoreDoStreaming()}
      pensandoVisivel={false}
      streaming={false}
      statusAgent={null}
      agenteExibido={AGENTS.criativo}
    />
  );
}

describe('o fio não repete turno (AT-803, RN-974)', () => {
  const turno1 = [usuario(1), po(2, { raciocinio: 'pensei muito', raciocinioTotal: 12 })];

  it('toda entrada do fio tem chave única, mesmo com o mesmo seq', () => {
    const timeline = montarTimeline(ctxDe(turno1));
    expect(new Set(timeline.map((e) => e.seq)).size).toBeLessThan(timeline.length);
    expect(new Set(timeline.map((e) => e.chave)).size).toBe(timeline.length);
  });

  /** Quantas vezes cada texto de resposta e cada bloco de raciocínio estão no DOM. */
  const repeticoes = (container: HTMLElement, ate: number) => {
    const vistas: Record<string, number> = {};
    for (let seq = 2; seq <= ate; seq += 2) {
      vistas[`resposta ${seq}`] = screen.queryAllByText(`resposta ${seq}`).length;
    }
    vistas.raciocinio = container.querySelectorAll('[data-testid="raciocinio-do-turno"]').length;
    return Object.values(vistas).filter((n) => n > 1);
  };

  it.each([
    ['o turno do raciocínio vai para o histórico', [usuario(1), po(2, { raciocinio: 'pensei muito', raciocinioTotal: 12 })]],
    ['o turno do raciocínio fica na cauda', [usuario(1), po(2), usuario(3), po(4, { raciocinio: 'pensei muito', raciocinioTotal: 12 })]],
  ])('nenhum turno se repete depois de vários polls: %s', (_nome, inicio) => {
    let events = [...inicio];
    const { container, rerender } = render(elemento(events));
    for (let i = 0; i < 6; i += 1) {
      const seq = events.length + 1;
      events = [...events, usuario(seq), po(seq + 1)];
      rerender(elemento(events));
      expect(repeticoes(container, seq + 1)).toEqual([]);
    }
    expect(fioDe(events).historico).not.toBeNull();
    expect(screen.getAllByText(`resposta ${events.length}`)).toHaveLength(1);
  });
});
