import type { DecisionInbox } from './api-types';

export type ChaveDaCaixa = keyof DecisionInbox['filas'];

/** A ordem fixa dos cinco cartões (ADR 0294); nunca somados (RN-467). */
export const FILAS_DA_CAIXA: readonly ChaveDaCaixa[] = ['aprovacoes', 'prs', 'promocoes', 'arquitetura', 'hipoteses'];

/** Presença, não quantidade: `some`, nunca soma (RN-467). */
export function caixaTemAlgo(inbox: DecisionInbox | undefined): boolean {
  return !!inbox && FILAS_DA_CAIXA.some((k) => inbox.filas[k].total > 0);
}

/** `+` quando a fila foi cortada pelo teto: o total é real, o recorte é declarado (RN-180). */
export const totalDaFila = (f: { total: number; truncada: boolean }) => `${f.total}${f.truncada ? '+' : ''}`;

/** Acima disto a aprovação é "velha": o chip de idade fica âmbar e há o atalho de seleção (AT-968, RN-1463). */
export const DIAS_DE_APROVACAO_VELHA = 30;
/** Teto do título de uma linha de aprovação (RN-1463). */
export const MAX_TITULO = 80;

const DIA_MS = 86_400_000;
export const diasDesde = (iso: string, agora = Date.now()) => Math.max(0, Math.floor((agora - new Date(iso).getTime()) / DIA_MS));
export const cortar = (s: string, max = MAX_TITULO) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);

/** A primeira palavra do comando, depois de `cd … &&` e de variáveis `X=1` na frente. */
export function primeiroComando(comando: string): string {
  const passos = comando.split(/&&|;|\|\|/).map((p) => p.trim()).filter(Boolean);
  const util = (passos.find((p) => !/^cd(\s|$)/.test(p)) ?? passos[0] ?? '').replace(/^[(\s]+/, '');
  return util.split(/\s+/).find((w) => !/^\w+=/.test(w)) ?? '';
}

/**
 * O título curto de uma aprovação de terminal: a justificativa do agente quando o
 * payload traz uma; sem ela, "Terminal · ‹primeiro comando›". Nunca passa de 80
 * caracteres. `null` para o que não é terminal (quem chama usa a frase da ação).
 */
export function tituloDoTerminal(actionType: string, payload: Record<string, unknown>, rotuloTerminal: string): string | null {
  if (actionType !== 'terminal') return null;
  const just = ['justificativa', 'justification', 'motivo', 'rationale'].map((k) => payload[k]).find((v) => typeof v === 'string' && v.trim());
  if (typeof just === 'string') return cortar(just.trim());
  const cmd = typeof payload.command === 'string' ? primeiroComando(payload.command) : '';
  return cortar(cmd ? `${rotuloTerminal} · ${cmd}` : rotuloTerminal);
}

/**
 * O título do plano de execução (AT-1007, RN-1490): "Plano de execução do ‹lead›: N dev agents,
 * um por módulo", montado dos módulos do payload (o que `fraseDaAcao` já lê). Nunca passa de 80
 * caracteres; `null` quando não é plano ou o payload não traz a lista de módulos.
 */
export function tituloDoPlano(actionType: string, payload: Record<string, unknown>, lead: string): string | null {
  if (actionType !== 'propose_execution_plan' || !Array.isArray(payload.modulos)) return null;
  const n = payload.modulos.length;
  return cortar(`Plano de execução do ${lead}: ${n} ${n === 1 ? 'dev agent' : 'dev agents'}, um por módulo`);
}

/** A frase da ação sem a abertura que o título do plano já diz (a linha de baixo não repete); o aviso de paralelização fica. */
export function detalheDoPlano(frase: string): string {
  const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  const resto = frase.replace(/^Aprova o plano de execução do .+? — sobe \d+ dev agents?, um por módulo/, '');
  if (resto === frase) return frase;
  const aviso = resto.match(/^\s*\(([^)]*)\)/s);
  const cauda = (aviso ? resto.slice(aviso[0].length) : resto).replace(/^\s*:?\s*/, '').replace(/^["“”']([^"“”']*)["“”']/, '$1');
  return [aviso ? `${maiuscula(aviso[1]!)}.` : '', cauda ? maiuscula(cauda) : ''].filter(Boolean).join(' ') || frase;
}
