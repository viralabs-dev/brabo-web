import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProposedAction, SessionEvent } from './api-types';
import type { StoreDoStreaming } from './streaming-do-turno';

/**
 * `scrollIntoView` com guarda de existência (achado 10) — jsdom (ambiente de
 * teste) não implementa o método; chamá-lo direto quebra qualquer teste que
 * monte a tela com eventos na lista. Nos navegadores de verdade o método
 * sempre existe, então a guarda nunca muda o comportamento visível.
 */
function rolarParaOFim(el: HTMLElement | null) {
  el?.scrollIntoView?.({ block: 'end' });
}

/** Mensagem no fio (a mesma régua do corte, RN-644): o que "Ir ao fim · N novas" conta. */
const TIPOS_DE_MENSAGEM = new Set(['chat.message', 'agent.response']);

/** Quantas mensagens chegaram depois do `seq` visto quando a pessoa subiu (RN-977, AT-959). */
export function novasDepoisDe(events: readonly SessionEvent[], seqVisto: number | null): number {
  if (seqVisto === null) return 0;
  return events.filter((e) => TIPOS_DE_MENSAGEM.has(e.type) && e.seq > seqVisto).length;
}

/**
 * A identidade do que há no fio (RN-951): o `seq` do último evento e os ids
 * das ações. Muda quando chega conteúdo novo mesmo que o TAMANHO das listas
 * não mude (teto de 200 eventos, ação decidida e outra chegando).
 */
export function identidadeDoFio(
  events: readonly SessionEvent[],
  actions: readonly ProposedAction[],
): string {
  const ultimo = events.reduce((m, e) => (e.seq > m ? e.seq : m), 0);
  return `${events.length === 0 ? 'vazio' : ultimo}|${actions.map((a) => a.id).join(',')}`;
}

/**
 * A rolagem do fio da tela de Sessão (AT-683, v5; revisa a RN-951): o fio
 * acompanha a última mensagem — a cada evento/ação nova, a cada mudança de
 * altura — SÓ enquanto a pessoa está no fim. Rolou para cima: PAUSA e o
 * `afastado` acende o botão "ir ao fim" (`irAoFim` retoma). Instantâneo
 * (`block: 'end'`) e sem mexer no foco. Com `?highlightEvent` a abertura vai
 * ao evento citado (Fase 4b); o acompanhamento começa na primeira mudança.
 */
export function useRolagemDoFio({
  highlightEvent,
  logOpen,
  events,
  actions,
  streamingStore,
}: {
  highlightEvent: string | undefined;
  logOpen: boolean;
  events: SessionEvent[];
  actions: ProposedAction[];
  /** O texto em curso vem como STORE (AT-301): não é dependência de efeito. */
  streamingStore: StoreDoStreaming;
}) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesInnerRef = useRef<HTMLDivElement | null>(null);
  // Só acompanha depois de a abertura acontecer (no fim, ou no evento citado
  // e então na primeira mudança).
  const seguindoRef = useRef(false);
  const vistoRef = useRef<string | null>(null);
  // A pessoa subiu: nada a segue até ela voltar ao fim.
  const pausadoRef = useRef(false);
  const [afastado, setAfastado] = useState(false);
  // O `seq` do último evento no instante da pausa; `null` com o fio no fim.
  const [seqVisto, setSeqVisto] = useState<number | null>(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Navegação de evidência (Fase 4b): rola até o evento assim que ele existir.
  useEffect(() => {
    if (!highlightEvent || !logOpen) return;
    document
      .getElementById(`event-${highlightEvent}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightEvent, logOpen, events.length]);

  const acompanharOFim = useCallback(() => {
    if (seguindoRef.current && !pausadoRef.current) rolarParaOFim(messagesEndRef.current);
  }, []);

  // Por IDENTIDADE, não por `length`: a primeira leva abre no fim (achado 10;
  // com `highlightEvent` fica no evento citado); toda mudança depois vai ao fim.
  const identidade = identidadeDoFio(events, actions);
  useEffect(() => {
    if (events.length === 0 && actions.length === 0) return;
    const primeira = vistoRef.current === null;
    vistoRef.current = identidade;
    if (primeira && highlightEvent) return;
    seguindoRef.current = true;
    if (!pausadoRef.current) rolarParaOFim(messagesEndRef.current);
  }, [identidade]); // eslint-disable-line react-hooks/exhaustive-deps

  // O texto do streaming (AT-301): assinatura direta do store; o aviso chega
  // ANTES de a bolha pintar, então a rolagem vai à volta seguinte.
  useEffect(() => {
    let textoAnterior = streamingStore.ler().texto;
    let pendente: ReturnType<typeof setTimeout> | null = null;
    const cancelar = streamingStore.subscribe(() => {
      const texto = streamingStore.ler().texto;
      if (texto === textoAnterior) return;
      textoAnterior = texto;
      if (pendente === null) {
        pendente = setTimeout(() => {
          pendente = null;
          acompanharOFim();
        }, 0);
      }
    });
    return () => {
      cancelar();
      if (pendente !== null) clearTimeout(pendente);
    };
  }, [streamingStore, acompanharOFim]);

  // Altura que muda sem estado novo: o CONTEÚDO (Disclosure, Markdown,
  // Mermaid) e o CONTAINER (faixa de atividade, composer, pendências acima).
  // Guarda de existência: jsdom não tem `ResizeObserver`.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => acompanharOFim());
    if (messagesInnerRef.current) observador.observe(messagesInnerRef.current);
    if (scrollContainerRef.current) observador.observe(scrollContainerRef.current);
    return () => observador.disconnect();
  }, [acompanharOFim]);

  // Distância do fim: acima de ~1 linha de folga, a pessoa subiu.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const aoRolar = () => {
      const longe = el.scrollHeight - el.scrollTop - el.clientHeight > 80;
      const subiuAgora = longe && !pausadoRef.current;
      pausadoRef.current = longe;
      setAfastado(longe);
      if (!longe) setSeqVisto(null);
      else if (subiuAgora) setSeqVisto(eventsRef.current.reduce((m, e) => (e.seq > m ? e.seq : m), 0));
    };
    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => el.removeEventListener('scroll', aoRolar);
  }, []);

  const irAoFim = useCallback(() => {
    pausadoRef.current = false;
    setAfastado(false);
    setSeqVisto(null);
    rolarParaOFim(messagesEndRef.current);
  }, []);

  // Ao ENVIAR (RN-977, AT-959): retoma o acompanhamento e sobe o turno do
  // usuário (o último `[data-autor="voce"]`) ao topo da janela; a resposta
  // cresce abaixo e, passando da janela, vale o "segue no fim". Roda na volta
  // seguinte porque a mensagem otimista ainda não está no DOM.
  const ancorarNoEnvio = useCallback(() => {
    pausadoRef.current = false;
    seguindoRef.current = true;
    setAfastado(false);
    setSeqVisto(null);
    setTimeout(() => {
      const meus = messagesInnerRef.current?.querySelectorAll?.('[data-autor="voce"]');
      const ultimo = meus && meus.length > 0 ? (meus[meus.length - 1] as HTMLElement) : null;
      if (ultimo?.scrollIntoView) ultimo.scrollIntoView({ block: 'start' });
      else rolarParaOFim(messagesEndRef.current);
    }, 0);
  }, []);

  const novas = novasDepoisDe(events, seqVisto);

  return { messagesEndRef, scrollContainerRef, messagesInnerRef, afastado, novas, irAoFim, ancorarNoEnvio };
}
