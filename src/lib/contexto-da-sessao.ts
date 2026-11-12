import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSessionContextSummary } from './api-client';
import type { ProductBriefPayload, ResumoDoContextoDaSessao, SessionEvent } from './api-types';

/**
 * RN-827 (AT-498) — o agregado da sessão INTEIRA do painel "Contexto da
 * sessão". NÃO polla: o orçamento de requisições do usuário é um só
 * (RN-579/632, guardado por `duas-abas.orcamento.test.tsx`), e o número só
 * muda quando nasce um artefato. Quem diz quando reler é `versao` — o maior
 * `seq` de artefato que a JANELA já viu mais as ações de commit/PR —, que
 * entra na chave: artefato novo chegando pelo fio relê o agregado uma vez.
 * O que a janela não vê (o commit da sessão de execução ligada) é relido no
 * foco da janela e na remontagem, o default das queries. Desde a RN-847
 * (AT-518) também é relido nos gatilhos que releem a lista de PRs (o alvo
 * `prs` do canal e a mudança do backlog, RN-841), por PREFIXO
 * `['session-context-summary', projectId]` — os arquivos vêm do diff delas.
 */
export function useContextoDaSessaoInteira(
  projectId: string,
  sessionId: string,
  versao: string,
) {
  return useQuery({
    queryKey: ['session-context-summary', projectId, sessionId, versao],
    queryFn: () => getSessionContextSummary(projectId, sessionId),
    placeholderData: keepPreviousData,
  });
}

/**
 * Soma o agregado à janela (molde da RN-568): as contagens são MONÓTONAS
 * dentro de uma sessão, então a janela nunca dá falso positivo — só falso
 * negativo —, e um agregado MENOR que a janela é resumo atrasado (as duas
 * leituras têm cadências próprias), não prova de menos. Por isso `max`.
 * Agregado ausente devolve `null`: "não li", nunca "não houve".
 */
export function totalDaSessao(
  agregado: number | undefined,
  naJanela: number,
): number | null {
  return agregado === undefined ? null : Math.max(agregado, naJanela);
}

export function artefatosDoAgenteNoAgregado(
  resumo: ResumoDoContextoDaSessao | undefined,
  actorId: string,
): number | undefined {
  if (!resumo) return undefined;
  return resumo.artefatosPorAgente.find((a) => a.actorId === actorId)?.quantos ?? 0;
}

/** O `summary` do `artifact.product_brief` mais recente; sem brief, null e a seção sai (AT-892). */
export function objetivoDaSessao(events: SessionEvent[]): string | null {
  let achado: SessionEvent | null = null;
  for (const e of events) {
    if (e.type === 'artifact.product_brief' && (!achado || e.seq > achado.seq)) achado = e;
  }
  const resumo = (achado?.payload as Partial<ProductBriefPayload> | undefined)?.summary;
  return typeof resumo === 'string' && resumo.trim() ? resumo : null;
}

/** Custo por agente somado do `custoMicros` dos eventos já baixados: nenhuma leitura nova (RN-632). */
export function gastoPorAgente(events: SessionEvent[]): { actorId: string; usd: number }[] {
  const por = new Map<string, number>();
  for (const e of events) {
    const c = (e.payload as { custoMicros?: unknown } | null)?.custoMicros;
    if (typeof c === 'number') por.set(e.actor.id, (por.get(e.actor.id) ?? 0) + c / 1_000_000);
  }
  return [...por].map(([actorId, usd]) => ({ actorId, usd }));
}

/** A cadeia de agentes da sessão, na ordem em que cada um apareceu nos eventos já baixados (AT-892, sem leitura nova). */
export function cadeiaDeAgentes(events: readonly SessionEvent[], rotulo: (id: string) => string | null): string[] {
  const vistos = new Set<string>();
  const nomes: string[] = [];
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.actor.kind !== 'agent' || vistos.has(e.actor.id)) continue;
    vistos.add(e.actor.id);
    const nome = rotulo(e.actor.id);
    if (nome) nomes.push(nome);
  }
  return nomes;
}
