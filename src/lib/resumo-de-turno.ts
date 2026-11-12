/*
 * AT-891, RN-1185: a linha de um turno. "Gravado neste turno" é o campo do
 * engine (`gravadoNoTurno`, RN-1158); o web nunca monta o texto sozinho. Os 21
 * tipos do engine têm rótulo tipado (i18n `resumo.tipos.*`); tipo novo cai no
 * próprio nome.
 */
export const TIPOS_GRAVADOS = [
  'regra', 'decisao', 'pergunta', 'epico', 'historia', 'historia_corrigida', 'historia_arquivada',
  'tarefa', 'tarefa_corrigida', 'nota', 'artefato', 'adr', 'module_map', 'modulos_de_historia',
  'imagem', 'c4', 'roteamento', 'contratos', 'insight', 'rfc', 'prototipo',
] as const;
export type TipoGravado = (typeof TIPOS_GRAVADOS)[number];

export interface GravadoNoTurno {
  itens: { tipo: string; total: number }[];
  recusadas?: number;
}

/** `payload.gravadoNoTurno` do `agent.response`, ou null (evento antigo/ToolLoop). */
export function gravadoDoPayload(payload: unknown): GravadoNoTurno | null {
  const g = (payload as { gravadoNoTurno?: unknown } | null)?.gravadoNoTurno as GravadoNoTurno | undefined;
  return g && Array.isArray(g.itens) && g.itens.length > 0 ? g : null;
}

/** Custo em USD a partir de micro-USD; null quando o evento não traz (traço, nunca zero). */
export function custoDoPayload(payload: unknown): number | null {
  const c = (payload as { custoMicros?: unknown } | null)?.custoMicros;
  return typeof c === 'number' ? c / 1_000_000 : null;
}

export function formatarCusto(usd: number | null): string {
  return usd === null ? '—' : `US$ ${usd.toFixed(4)}`;
}
