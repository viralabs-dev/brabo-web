import type { Epic, ModuleMap, Task } from '../lib/api-types';

/** "há 12 minutos" no idioma da tela, de um instante ISO até agora (RN-1063). */
export function esperaRelativa(iso: string, idioma: string, agora = Date.now()): string {
  const minutos = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto' });
  if (minutos < 60) return rtf.format(-minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (horas < 24) return rtf.format(-horas, 'hour');
  return rtf.format(-Math.round(horas / 24), 'day');
}

/** O título da aba com o contador de PRs prontas: "(1) Brabo"; sem PR, o título puro. */
export function tituloComContador(base: string, prontas: number): string {
  return prontas > 0 ? `(${prontas}) ${base}` : base;
}

/**
 * Quantas tarefas `todo` o merge da tarefa da PR destrava (AT-902, RN-1063): as dos módulos
 * que dependem (`dependsOn` direto) do módulo dela, só quando ela é a última aberta do módulo
 * (a régua da RN-1005). A tarefa sem `module` herda os `moduleIds` da história.
 */
export function tarefasQueODestrava(
  tarefa: Task | undefined,
  epics: readonly Epic[] | undefined,
  moduleMap: ModuleMap | null | undefined,
): number {
  if (!tarefa || !moduleMap) return 0;
  const todas = (epics ?? []).flatMap((e) =>
    (e.stories ?? []).flatMap((s) =>
      (s.tasks ?? []).map((t) => ({ t, mods: t.module ? [t.module] : (s.moduleIds ?? []) })),
    ),
  );
  const modulosDela = todas.find((x) => x.t.id === tarefa.id)?.mods ?? [];
  const abertas = (m: string) => todas.filter((x) => x.mods.includes(m) && x.t.status !== 'done');
  const fechados = modulosDela.filter((m) => abertas(m).length === 1 && abertas(m)[0]!.t.id === tarefa.id);
  const dependentes = moduleMap.modules.filter((m) => m.dependsOn.some((d) => fechados.includes(d)));
  const alvo = new Set(dependentes.map((m) => m.name));
  return todas.filter((x) => x.t.status === 'todo' && x.mods.some((m) => alvo.has(m))).length;
}
