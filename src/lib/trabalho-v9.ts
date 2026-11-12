import { estadoDaTarefa } from './execution';
import type { Epic, Story } from './api-types';

/** AT-894 (RN-1220): as três contagens da fila, cada uma do ESTADO da tarefa e nunca somadas (RN-467). */
export function filaDeTarefas(epics: readonly Epic[] | undefined) {
  const tarefas = (epics ?? []).flatMap((e) =>
    e.stories.flatMap((s) =>
      s.tasks
        .filter((x) => !x.archivedAt)
        // História em rascunho (aguardando promoção) não tem tarefa pegável (RN-048).
        .map((task) => ({ task, pegavel: s.status !== 'draft', estado: estadoDaTarefa(task) })),
    ),
  );
  return {
    prontas: tarefas.filter((x) => x.pegavel && x.estado === 'todo'),
    rodando: tarefas.filter((x) => x.estado === 'in_progress'),
    bloqueadas: tarefas.filter((x) => x.estado === 'blocked'),
  };
}

/** AT-894 (RN-1220): busca e filtros locais sobre a árvore já carregada, sem requisição. */
export function historiaPassaNoFiltro(
  st: Story,
  f: { busca: string; soComPergunta: boolean; modulo: string; perguntasPorHistoria: Map<string, number> },
): boolean {
  if (f.soComPergunta && (f.perguntasPorHistoria.get(st.id) ?? 0) === 0) return false;
  if (f.modulo && !(st.moduleIds ?? []).includes(f.modulo)) return false;
  const q = f.busca.trim().toLowerCase();
  if (!q) return true;
  const texto = [st.title, ...st.businessRuleIds, ...st.tasks.map((x) => x.title)].join(' ').toLowerCase();
  return texto.includes(q);
}
