import type { Architecture, Epic } from './api-types';
import { tarefasBloqueadas, tarefasSemModulo } from './prontas-e-bloqueadas';
import type { ChaveDoPasso } from './primeiros-passos';

/**
 * O próximo passo do projeto (RN-1162, AT-936): UMA situação, tirada de uma
 * tabela tipada e ORDENADA — vale a primeira verdadeira; nenhuma, o cartão some.
 *
 * Só ORDENA fatos que a Visão geral já lê; não inventa número nem faz leitura
 * nova. Decisões pendentes (aprovações, PRs, hipóteses) ficam de fora de
 * propósito: já são a faixa "Precisa de você" (RN-467).
 */
export type TipoDoPasso =
  | 'primeiro_passo'
  | 'agente_trabalhando'
  | 'continuar_ideacao'
  | 'confirmar_arquitetura'
  | 'ligar_modulo'
  | 'desbloquear'
  | 'ativar_execucao'
  | 'acompanhar_execucao'
  | 'rodar_entregavel';

export interface Fatos {
  /** O primeiro passo pendente da RN-708, se houver. */
  primeiroPasso: ChaveDoPasso | null;
  /** Nome do agente conversacional com status `trabalhando`, se houver. */
  agenteTrabalhando: string | null;
  temSessao: boolean;
  historias: number;
  /** Há mapa de módulos ausente ou pendência de arquitetura. */
  arquiteturaPendente: boolean;
  semModulo: number;
  bloqueadas: number;
  prontas: number;
  execucaoAtiva: boolean;
  emAndamento: number;
  /** Tarefas não arquivadas, e quantas delas estão `done`. */
  tarefas: number;
  feitas: number;
}

/** Para onde o link do cartão leva (as abas do projeto). */
export type DestinoDoProjeto = { tab: 'criativo' | 'arquitetura' | 'executores' };

export const PASSOS: readonly { tipo: TipoDoPasso; vale: (f: Fatos) => boolean }[] = [
  { tipo: 'primeiro_passo', vale: (f) => f.primeiroPasso !== null },
  { tipo: 'agente_trabalhando', vale: (f) => f.agenteTrabalhando !== null },
  { tipo: 'continuar_ideacao', vale: (f) => f.temSessao && f.historias === 0 },
  { tipo: 'confirmar_arquitetura', vale: (f) => f.historias > 0 && f.arquiteturaPendente },
  { tipo: 'ligar_modulo', vale: (f) => f.semModulo > 0 },
  { tipo: 'desbloquear', vale: (f) => f.bloqueadas > 0 },
  { tipo: 'ativar_execucao', vale: (f) => f.prontas > 0 && !f.execucaoAtiva },
  { tipo: 'acompanhar_execucao', vale: (f) => f.execucaoAtiva && f.emAndamento > 0 },
  { tipo: 'rodar_entregavel', vale: (f) => f.tarefas > 0 && f.feitas === f.tarefas },
];

// `Record` exaustivo pelo tipo: situação nova sem destino não compila.
// `primeiro_passo` fica de fora: herda o destino do passo da RN-708.
export const DESTINO: Record<Exclude<TipoDoPasso, 'primeiro_passo'>, DestinoDoProjeto> = {
  agente_trabalhando: { tab: 'criativo' },
  continuar_ideacao: { tab: 'criativo' },
  confirmar_arquitetura: { tab: 'arquitetura' },
  ligar_modulo: { tab: 'arquitetura' },
  desbloquear: { tab: 'executores' },
  ativar_execucao: { tab: 'executores' },
  acompanhar_execucao: { tab: 'executores' },
  rodar_entregavel: { tab: 'executores' },
};

/** A primeira situação verdadeira, ou `null` (o cartão some). */
export function derivarProximoPasso(fatos: Fatos): TipoDoPasso | null {
  return PASSOS.find((p) => p.vale(fatos))?.tipo ?? null;
}

/** Os fatos que saem do backlog e da arquitetura que a tela já lê. */
export function fatosDoBacklog(
  epics: readonly Epic[],
  architecture: Architecture | undefined,
): Pick<
  Fatos,
  'historias' | 'arquiteturaPendente' | 'semModulo' | 'bloqueadas' | 'prontas' | 'emAndamento' | 'tarefas' | 'feitas'
> {
  const historias = epics.flatMap((e) => e.stories ?? []);
  const tarefas = historias.flatMap((s) => s.tasks ?? []).filter((t) => !t.archivedAt);
  const semModulo = tarefasSemModulo(epics).length;
  return {
    historias: historias.length,
    arquiteturaPendente: !architecture?.moduleMap || architecture.pendencies.length > 0,
    semModulo,
    bloqueadas: tarefasBloqueadas(epics).length,
    prontas: tarefas.filter((t) => t.status === 'todo' && !t.blocked).length - semModulo,
    emAndamento: tarefas.filter((t) => t.status === 'in_progress' || t.status === 'in_review').length,
    tarefas: tarefas.length,
    feitas: tarefas.filter((t) => t.status === 'done').length,
  };
}
