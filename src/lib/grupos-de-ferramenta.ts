import { FERRAMENTAS_CONHECIDAS, type FerramentaConhecida } from './narracao-de-ferramentas';

/*
 * AT-891, RN-1185: o fio agrupa os passos do turno por INTENÇÃO (nunca por
 * origem, RN-644). O mapa é exaustivo pelo tipo: ferramenta nova em
 * `FERRAMENTAS_CONHECIDAS` sem grupo não compila. Fora do tipo cai em `outros`
 * e nunca some.
 */
export const GRUPOS = ['leu', 'desenhou', 'registrou', 'outros'] as const;
export type Grupo = (typeof GRUPOS)[number];

export const GRUPO_DA_FERRAMENTA: Record<FerramentaConhecida, Grupo> = {
  listar_regras_de_negocio: 'leu',
  listar_backlog: 'leu',
  listar_metricas_de_produto: 'leu',
  assess_implementability: 'leu',
  validate_infra_file: 'leu',
  create_module_map: 'desenhou',
  assign_story_modules: 'desenhou',
  choose_project_image: 'desenhou',
  create_c4_diagram: 'desenhou',
  route_modules_to_infra: 'desenhou',
  declare_module_contracts: 'desenhou',
  propose_prototype: 'desenhou',
  propose_rfc: 'desenhou',
  propose_execution_plan: 'desenhou',
  create_epic: 'registrou',
  create_story: 'registrou',
  create_task: 'registrou',
  emit_artifact: 'registrou',
  emit_insight: 'registrou',
  propose_adr: 'registrou',
  propose_infra_pr: 'registrou',
  ask_structured_questions: 'outros',
  offer_handoff: 'outros',
  propose_container_start: 'outros',
  container_start_via_runner: 'outros',
};

const CONHECIDAS: readonly string[] = FERRAMENTAS_CONHECIDAS;

export function grupoDaFerramenta(tool: string): Grupo {
  return CONHECIDAS.includes(tool) ? GRUPO_DA_FERRAMENTA[tool as FerramentaConhecida] : 'outros';
}

/** Parte os itens por grupo, na ordem de `GRUPOS`, sem grupo vazio; a soma é o total. */
export function agruparPorIntencao<T extends { tool: string }>(itens: T[]): { grupo: Grupo; itens: T[] }[] {
  return GRUPOS.map((grupo) => ({ grupo, itens: itens.filter((i) => grupoDaFerramenta(i.tool) === grupo) })).filter(
    (g) => g.itens.length > 0,
  );
}

/** As até `n` ferramentas mais usadas, com a contagem. */
export function maisUsadas(itens: { tool: string }[], n = 3): { tool: string; vezes: number }[] {
  const c = new Map<string, number>();
  for (const i of itens) c.set(i.tool, (c.get(i.tool) ?? 0) + 1);
  return [...c.entries()].map(([tool, vezes]) => ({ tool, vezes })).sort((a, b) => b.vezes - a.vezes).slice(0, n);
}
