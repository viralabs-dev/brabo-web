import type { CodePullRequestSummary, Epic, ModuleMap, SessionEvent, Task } from './api-types';
import { agentesTravados, devAgentId, gateStatus, statusDoEventoDev } from './agent-status';
import { classifyEvent } from './activity';
import { deriveExecutionProgress } from './execution';
import { tarefaDaBranch } from './prontas-e-bloqueadas';

/**
 * AT-880 (RN-1303/RN-1073): o estado de cada executor da execução vigente para
 * o carrossel do chat, derivado SÓ de eventos + backlog + `module_map` + PRs.
 * Puro: o texto sai como `{ key, params }` e o componente traduz. A aba
 * Executores continua com `deriveAgentRoster` (outra fronteira).
 */
export type EstadoDoCartao =
  | 'travado'
  | 'bloqueado'
  | 'falhou'
  | 'trabalhando'
  | 'aguardando'
  | 'ocioso'
  | 'concluido';

export interface Texto {
  key: string;
  params?: Record<string, string | number>;
}

export interface CartaoDeExecutor {
  agentId: string;
  tipo: 'dev' | 'qa' | 'secops';
  estado: EstadoDoCartao;
  texto: Texto;
  tarefa?: string;
  ultimaAcao?: string;
  /** ISO do último evento do executor. */
  desde?: string;
  eventoId?: string;
}

interface Contexto {
  eventos: SessionEvent[];
  epics: Epic[] | undefined;
  moduleMap: ModuleMap | null | undefined;
  prs: readonly CodePullRequestSummary[] | undefined;
}

const ORDEM: EstadoDoCartao[] = ['travado', 'bloqueado', 'falhou', 'trabalhando', 'aguardando', 'ocioso', 'concluido'];

const SEM_TASK_PEGAVEL = 'sem task pegável';

/** Chave com sufixo `Pr` quando a PR é conhecida. */
const k = (base: string, pr: number | undefined) => (pr === undefined ? base : `${base}Pr`);

function todasAsTarefas(epics: Epic[] | undefined): Task[] {
  return (epics ?? []).flatMap((e) => e.stories.flatMap((s) => s.tasks));
}

function prDaTarefa(taskId: string | undefined, c: Contexto): number | undefined {
  if (!taskId) return undefined;
  return (c.prs ?? []).find((pr) => tarefaDaBranch(c.epics, pr.sourceBranch)?.id === taskId)?.number;
}

/**
 * O porquê do ócio. Ordem da tabela da AT-880: (a) pausa de rede, (b)/(c)
 * dependência aberta (o predicado da RN-1005 relido no web), (d) tarefas
 * bloqueadas, (e) sem causa achada → "sem tarefa disponível agora".
 * AT-881: a tarefa SEM `module` (ainda não pega) herda os `moduleIds` da história.
 */
export function motivoDoOcio(modulo: string, reason: string | undefined, c: Contexto): Texto {
  if (reason && reason !== SEM_TASK_PEGAVEL) return { key: 'ociosoPausa', params: { reason } };
  const tarefas = (c.epics ?? []).flatMap((e) =>
    e.stories.flatMap((s) => s.tasks.map((t) => ({ t, mods: t.module ? [t.module] : (s.moduleIds ?? []) }))),
  );
  const abertasDe = (m: string) => tarefas.filter((x) => x.mods.includes(m) && x.t.status !== 'done').map((x) => x.t);
  const deps = (c.moduleMap?.modules.find((m) => m.name === modulo)?.dependsOn ?? []).filter(
    (d) => abertasDe(d).length > 0,
  );
  if (abertasDe(modulo).length > 0 && deps.length > 0) {
    const comPr = deps.find((d) => abertasDe(d).some((t) => prDaTarefa(t.id, c) !== undefined));
    const primeiro = comPr ?? deps[0]!;
    if (deps.length > 1) return { key: 'esperaModulos', params: { n: deps.length, primeiro } };
    const aberta = abertasDe(primeiro)[0]!;
    const pr = abertasDe(primeiro).map((t) => prDaTarefa(t.id, c)).find((n) => n !== undefined);
    const agente = devAgentId(primeiro);
    if (pr !== undefined) return { key: 'esperaFundacaoPr', params: { modulo: primeiro, agente, pr } };
    return { key: 'esperaFundacaoTarefa', params: { modulo: primeiro, titulo: aberta.title } };
  }
  const abertas = abertasDe(modulo);
  if (abertas.length > 0 && abertas.every((t) => t.blocked)) {
    return { key: 'tarefaBloqueada', params: { motivo: abertas[0]!.blockedReason ?? '' } };
  }
  return { key: 'semTarefa' };
}

function ultimoDoAtor(eventos: SessionEvent[], agentId: string): SessionEvent | undefined {
  for (let i = eventos.length - 1; i >= 0; i -= 1) if (eventos[i]!.actor.id === agentId) return eventos[i];
  return undefined;
}

function cartaoDoDev(modulo: string, c: Contexto): CartaoDeExecutor {
  const agentId = devAgentId(modulo);
  const ultimo = ultimoDoAtor(c.eventos, agentId);
  const base = { agentId, tipo: 'dev' as const, desde: ultimo?.createdAt, eventoId: ultimo?.id };
  const ultimaAcao = ultimo ? classifyEvent(ultimo).text : undefined;
  const tarefas = todasAsTarefas(c.epics);
  const doModulo = tarefas.filter((t) => t.module === modulo);

  const travado = agentesTravados(c.eventos).find((a) => a.agentId === agentId);
  if (travado) return { ...base, estado: 'travado', texto: { key: 'travado', params: { motivo: travado.motivo } } };

  const ev = [...c.eventos]
    .reverse()
    .find((e) => e.actor.id === agentId && statusDoEventoDev(e.type) !== undefined);
  const payload = (ev?.payload ?? {}) as { reason?: string; cause?: string; gate?: string };
  const progresso = deriveExecutionProgress(c.eventos).get(agentId);
  const tarefa = tarefas.find((t) => t.id === progresso?.taskId);
  const titulo = progresso?.taskTitle ?? tarefa?.title;
  const emRevisao = tarefas.find((t) => t.assignedTo === agentId && t.status === 'in_review');

  if (ev?.type === 'dev.blocked_by_container') return { ...base, estado: 'bloqueado', texto: { key: 'bloqueado' } };
  if (ev && statusDoEventoDev(ev.type) === 'falhou') {
    const motivo = (payload.reason ?? '').slice(0, 140);
    return {
      ...base,
      estado: 'falhou',
      texto: motivo ? { key: 'falhou', params: { motivo } } : { key: 'falhouSemMotivo' },
    };
  }
  if (ev?.type === 'dev.awaiting_approval') {
    return { ...base, estado: 'aguardando', tarefa: titulo, texto: { key: 'aguardandoAprovacao' } };
  }
  if (ev?.type === 'dev.awaiting_gate' || emRevisao) {
    const t = emRevisao ?? tarefa;
    const pr = prDaTarefa(t?.id, c);
    const gate = t?.gateStatus ?? null;
    const sufixo = gate === 'awaiting_secops' ? 'Secops' : gate === 'awaiting_user' ? 'Usuario' : gate === 'awaiting_qa' ? 'Qa' : '';
    const texto: Texto = sufixo
      ? { key: k(`aguardando${sufixo}`, pr), params: pr === undefined ? {} : { pr } }
      : { key: 'aguardandoGate' };
    return { ...base, estado: 'aguardando', tarefa: t?.title ?? titulo, ultimaAcao, texto };
  }
  if (ev?.type === 'dev.idle' || !ev) {
    if (doModulo.length > 0 && doModulo.every((t) => t.status === 'done')) {
      return {
        ...base,
        estado: 'concluido',
        texto: { key: 'concluido', params: { done: doModulo.length, total: doModulo.length } },
      };
    }
    return { ...base, estado: 'ocioso', texto: motivoDoOcio(modulo, payload.reason, c) };
  }
  const pr = prDaTarefa(progresso?.taskId, c);
  const correcao = payload.cause === 'merge_conflict' || (tarefa?.gateCorrectionCount ?? 0) > 0;
  return {
    ...base,
    estado: 'trabalhando',
    tarefa: titulo,
    ultimaAcao,
    texto: correcao ? { key: k('corrigindo', pr), params: pr === undefined ? {} : { pr } } : { key: 'trabalhando' },
  };
}

/** QA/SecOps: só aparecem com evidência (gate, parecer ou delegação), como na aba Executores. */
function cartaoDoGate(gate: 'qa' | 'secops', c: Contexto): CartaoDeExecutor | null {
  const tipoVeredito = `artifact.${gate}_verdict`;
  const meus = c.eventos.filter(
    (e) =>
      e.type === 'pr.gate_changed' ||
      e.type === 'infra.gate_changed' ||
      (e.type === tipoVeredito && e.actor.id === gate) ||
      (e.type.startsWith('delegation.') && (e.payload as { area?: string }).area === gate),
  );
  const ultimo = meus.at(-1);
  if (!ultimo) return null;
  const base = { agentId: gate, tipo: gate, desde: ultimo.createdAt, eventoId: ultimo.id } as const;
  const tarefas = todasAsTarefas(c.epics);
  const estado = gateStatus(c.eventos, gate);
  if (estado === 'falhou') return { ...base, estado, texto: { key: 'gateFalhou' } };
  if (estado === 'trabalhando') {
    const g = [...c.eventos].reverse().find((e) => e.type === 'pr.gate_changed' || e.type === 'infra.gate_changed');
    const taskId = (g?.payload as { taskId?: string } | undefined)?.taskId;
    const titulo = tarefas.find((t) => t.id === taskId)?.title;
    const pr = prDaTarefa(taskId, c);
    const params: Record<string, string | number> = { ...(titulo ? { tarefa: titulo } : {}), ...(pr === undefined ? {} : { pr }) };
    return {
      ...base,
      estado,
      tarefa: titulo,
      texto: titulo ? { key: k('gateJulga', pr), params } : { key: 'gateJulgaSemTarefa' },
    };
  }
  const v = [...c.eventos].reverse().find((e) => e.type === tipoVeredito && e.actor.id === gate);
  if (!v) return { ...base, estado: 'ocioso', texto: { key: 'gateOcioso' } };
  const p = v.payload as { taskId?: string; veredito?: string };
  const pr = prDaTarefa(p.taskId, c);
  return {
    ...base,
    estado: 'ocioso',
    texto: {
      key: k(p.veredito === 'approved' ? 'gateUltimoAprovado' : 'gateUltimoMudancas', pr),
      params: pr === undefined ? {} : { pr },
    },
  };
}

/** Atenção primeiro (P3); dentro do estado, a ordem do `module_map`, com QA e SecOps ao fim. */
export function ordemDosCartoes(cartoes: CartaoDeExecutor[]): CartaoDeExecutor[] {
  return cartoes
    .map((c, i) => ({ c, i }))
    .sort((a, b) => ORDEM.indexOf(a.c.estado) - ORDEM.indexOf(b.c.estado) || a.i - b.i)
    .map((x) => x.c);
}

export function cartoesDaExecucao(c: Contexto): CartaoDeExecutor[] {
  const devs = (c.moduleMap?.modules ?? []).map((m) => cartaoDoDev(m.name, c));
  const gates = (['qa', 'secops'] as const).map((g) => cartaoDoGate(g, c)).filter((x): x is CartaoDeExecutor => !!x);
  return ordemDosCartoes([...devs, ...gates]);
}

/** "x de N tarefas": o mesmo conjunto de `contarTarefasPendentes` (RN-794). */
export function progressoDaExecucao(epics: Epic[] | undefined): { done: number; total: number } {
  const t = todasAsTarefas(epics);
  return { done: t.filter((x) => x.status === 'done').length, total: t.length };
}

export function contagemPorEstado(cartoes: CartaoDeExecutor[]): Record<EstadoDoCartao, number> {
  const r = Object.fromEntries(ORDEM.map((e) => [e, 0])) as Record<EstadoDoCartao, number>;
  for (const c of cartoes) r[c.estado] += 1;
  return r;
}
