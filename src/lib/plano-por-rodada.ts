import type { Epic, Task } from './api-types';

/**
 * AT-993 (RN-1408 a RN-1410): o plano da execução como níveis do grafo de `dependeDe`.
 * Rodada é só VISÃO: a api não manda nível, o web o calcula aqui.
 */
export type EtapaDaLane = 'aFazer' | 'espera' | 'implementando' | 'noGate' | 'pronta' | 'mergeada';

export interface LaneDoPlano {
  id: string;
  titulo: string;
  etapa: EtapaDaLane;
  /** Títulos das dependências ainda não mergeadas (vazio quando nada barra a lane). */
  esperaPor: string[];
}

export interface RodadaDoPlano {
  nivel: number;
  lanes: LaneDoPlano[];
}

export function etapaDaTarefa(t: Pick<Task, 'status' | 'gateStatus'>, esperando: boolean): EtapaDaLane {
  if (t.status === 'done') return 'mergeada';
  if (t.status === 'in_progress') return 'implementando';
  if (t.status === 'in_review') return t.gateStatus ? 'noGate' : 'pronta';
  return esperando ? 'espera' : 'aFazer';
}

/** Sem nenhuma `dependeDe` válida o plano é uma rodada só e não há o que agrupar: devolve []. */
export function planoPorRodada(epics: Epic[] | undefined): RodadaDoPlano[] {
  const tarefas = (epics ?? []).flatMap((e) => e.stories.flatMap((s) => s.tasks)).filter((t) => !t.archivedAt);
  const porId = new Map(tarefas.map((t) => [t.id, t]));
  const deps = (t: Task) => (t.dependeDe ?? []).filter((id) => id !== t.id && porId.has(id));
  if (!tarefas.some((t) => deps(t).length > 0)) return [];

  const niveis = new Map<string, number>();
  const nivelDe = (t: Task, visitando: Set<string>): number => {
    const feito = niveis.get(t.id);
    if (feito !== undefined) return feito;
    if (visitando.has(t.id)) return 1; // ciclo: a api recusa, aqui só não trava
    visitando.add(t.id);
    const n = 1 + Math.max(0, ...deps(t).map((id) => nivelDe(porId.get(id)!, visitando)));
    visitando.delete(t.id);
    niveis.set(t.id, n);
    return n;
  };

  const rodadas = new Map<number, LaneDoPlano[]>();
  for (const t of tarefas) {
    const esperaPor = deps(t).map((id) => porId.get(id)!).filter((d) => d.status !== 'done').map((d) => d.title);
    const lane: LaneDoPlano = {
      id: t.id,
      titulo: t.title,
      etapa: etapaDaTarefa(t, esperaPor.length > 0),
      esperaPor,
    };
    const n = nivelDe(t, new Set());
    rodadas.set(n, [...(rodadas.get(n) ?? []), lane]);
  }
  return [...rodadas.entries()].sort((a, b) => a[0] - b[0]).map(([nivel, lanes]) => ({ nivel, lanes }));
}
