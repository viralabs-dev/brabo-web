import { describe, it, expect } from 'vitest';
import type { CodePullRequestSummary, Epic, ModuleMap, SessionEvent, Task } from './api-types';
import { cartoesDaExecucao, contagemPorEstado, motivoDoOcio, progressoDaExecucao } from './executores-ao-vivo';

let seq = 0;
function ev(type: string, actorId: string, payload: unknown = {}, kind: 'agent' | 'user' = 'agent'): SessionEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    sessionId: 's',
    seq,
    type,
    actor: { kind, id: actorId } as SessionEvent['actor'],
    payload,
    createdAt: '2026-11-09T22:00:00Z',
  };
}
function task(id: string, module: string, over: Partial<Task> = {}): Task {
  return {
    id,
    storyId: 's1',
    title: `tarefa ${id}`,
    description: '',
    status: 'todo',
    assignedTo: null,
    blocked: false,
    blockedReason: null,
    gateStatus: null,
    gateCorrectionCount: 0,
    module,
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}
function epics(tasks: Task[]): Epic[] {
  return [{ id: 'ep', stories: [{ id: 's1', tasks }] }] as unknown as Epic[];
}
function mapa(...mods: [string, string[]][]): ModuleMap {
  return {
    modules: mods.map(([name, dependsOn]) => ({ name, stack: '', responsibility: '', dependsOn })),
  } as unknown as ModuleMap;
}
function pr(n: number, taskId: string): CodePullRequestSummary {
  return { number: n, sourceBranch: `feature/task-${taskId.slice(0, 8)}`, state: 'open' } as CodePullRequestSummary;
}

const T1 = 'aaaaaaaa-1';
const T2 = 'bbbbbbbb-2';
const M = mapa(['api', []], ['web', ['api']]);

describe('cartoesDaExecucao', () => {
  it('trabalhando: título da tarefa e última ação', () => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.started', 'dev-api', { module: 'api' }), ev('dev.working', 'dev-api', { agentId: 'dev-api', taskId: T1, taskTitle: 'Login' })],
      epics: epics([task(T1, 'api', { status: 'in_progress' })]),
      moduleMap: mapa(['api', []]),
      prs: [],
    });
    expect(c[0]).toMatchObject({ agentId: 'dev-api', estado: 'trabalhando', tarefa: 'Login', texto: { key: 'trabalhando' } });
    expect(c[0]!.ultimaAcao).toBeTruthy();
  });

  it('trabalhando em correção cita a PR', () => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.working', 'dev-api', { agentId: 'dev-api', taskId: T1, cause: 'merge_conflict' })],
      epics: epics([task(T1, 'api', { status: 'in_progress' })]),
      moduleMap: mapa(['api', []]),
      prs: [pr(4, T1)],
    });
    expect(c[0]!.texto).toEqual({ key: 'corrigindoPr', params: { pr: 4 } });
  });

  it.each([
    ['awaiting_qa', 'aguardandoQaPr'],
    ['awaiting_secops', 'aguardandoSecopsPr'],
    ['awaiting_user', 'aguardandoUsuarioPr'],
  ] as const)('aguardando gate %s', (gateStatus, key) => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.awaiting_gate', 'dev-api', { taskId: T1, gate: 'qa' })],
      epics: epics([task(T1, 'api', { status: 'in_review', assignedTo: 'dev-api', gateStatus })]),
      moduleMap: mapa(['api', []]),
      prs: [pr(5, T1)],
    });
    expect(c[0]).toMatchObject({ estado: 'aguardando', texto: { key, params: { pr: 5 } } });
  });

  it('ocioso esperando a fundação, com a PR da tarefa aberta', () => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.idle', 'dev-web', { reason: 'sem task pegável' })],
      epics: epics([task(T1, 'api', { status: 'in_review' }), task(T2, 'web')]),
      moduleMap: M,
      prs: [pr(4, T1)],
    });
    expect(c.find((x) => x.agentId === 'dev-web')!.texto).toEqual({
      key: 'esperaFundacaoPr',
      params: { modulo: 'api', agente: 'dev-api', pr: 4 },
    });
  });

  it('bloqueado pelo container usa texto curto, nunca o reason técnico', () => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.blocked_by_container', 'dev-api', { reason: 'docker inspect exit 1 ...' })],
      epics: epics([task(T1, 'api')]),
      moduleMap: mapa(['api', []]),
      prs: [],
    });
    expect(c[0]).toMatchObject({ estado: 'bloqueado', texto: { key: 'bloqueado' } });
  });

  it('travado pelo disjuntor, falhou e concluído', () => {
    const c = cartoesDaExecucao({
      eventos: [
        ev('dev.idle_tripped', 'dev-api', { consecutiveBlocked: 3 }),
        ev('backlog.task_blocked', 'dev-web', { reason: 'testes quebrados' }),
        ev('dev.idle', 'dev-ui', {}),
      ],
      epics: epics([task(T1, 'api'), task(T2, 'ui', { status: 'done' })]),
      moduleMap: mapa(['api', []], ['web', []], ['ui', []]),
      prs: [],
    });
    expect(c.map((x) => [x.agentId, x.estado])).toEqual([
      ['dev-api', 'travado'],
      ['dev-web', 'falhou'],
      ['dev-ui', 'concluido'],
    ]);
    expect(c[1]!.texto).toEqual({ key: 'falhou', params: { motivo: 'testes quebrados' } });
  });

  it('atenção primeiro: ordena por estado, estável pelo module_map', () => {
    const c = cartoesDaExecucao({
      eventos: [ev('dev.idle', 'dev-a', {}), ev('dev.working', 'dev-b', { agentId: 'dev-b', taskId: T1 }), ev('dev.blocked_by_container', 'dev-c', {})],
      epics: epics([task(T1, 'b'), task(T2, 'a')]),
      moduleMap: mapa(['a', []], ['b', []], ['c', []]),
      prs: [],
    });
    expect(c.map((x) => x.agentId)).toEqual(['dev-c', 'dev-b', 'dev-a']);
    expect(contagemPorEstado(c)).toMatchObject({ bloqueado: 1, trabalhando: 1, ocioso: 1 });
  });
});

describe('cartões de QA e SecOps', () => {
  const base = { epics: epics([task(T1, 'api', { title: 'Login' })]), moduleMap: mapa(['api', []]), prs: [pr(7, T1)] };

  it('sem evidência não há cartão', () => {
    expect(cartoesDaExecucao({ ...base, eventos: [] }).filter((x) => x.tipo !== 'dev')).toEqual([]);
  });

  it('QA julgando: gate, tarefa e PR vêm de pr.gate_changed', () => {
    const c = cartoesDaExecucao({
      ...base,
      eventos: [ev('pr.gate_changed', 'api', { taskId: T1, gate: 'qa', gateStatus: 'awaiting_qa' })],
    });
    expect(c.find((x) => x.agentId === 'qa')).toMatchObject({
      estado: 'trabalhando',
      texto: { key: 'gateJulgaPr', params: { tarefa: 'Login', pr: 7 } },
    });
  });

  it('SecOps com veredito mostra último veredito e PR; QA com delegation.failed vira falhou', () => {
    const veredito = ev('artifact.secops_verdict', 'secops', { taskId: T1, veredito: 'changes_requested' });
    const c = cartoesDaExecucao({ ...base, eventos: [veredito] });
    expect(c.find((x) => x.agentId === 'secops')).toMatchObject({
      estado: 'ocioso',
      texto: { key: 'gateUltimoMudancasPr', params: { pr: 7 } },
    });
    const falha = cartoesDaExecucao({
      ...base,
      eventos: [
        ev('pr.gate_changed', 'api', { taskId: T1, gate: 'qa', gateStatus: 'awaiting_qa' }),
        ev('delegation.failed', 'qa', { subagent: 'qa-automacao', area: 'qa' }),
      ],
    });
    expect(falha.find((x) => x.agentId === 'qa')!.estado).toBe('falhou');
  });
});

describe('motivoDoOcio', () => {
  it('pausa de rede passa o reason; várias dependências escolhem a que tem PR; bloqueada; fallback', () => {
    const e = epics([task(T1, 'a'), task(T2, 'b', { status: 'in_review' }), task('cccccccc-3', 'c')]);
    const m = mapa(['a', []], ['b', []], ['c', ['a', 'b']]);
    const ctx = { eventos: [], epics: e, moduleMap: m, prs: [pr(9, T2)] };
    expect(motivoDoOcio('c', 'pausa de 30 s depois de erro de rede', ctx).key).toBe('ociosoPausa');
    expect(motivoDoOcio('c', undefined, ctx)).toEqual({ key: 'esperaModulos', params: { n: 2, primeiro: 'b' } });
    const bloq = epics([task(T1, 'a', { blocked: true, blockedReason: 'sem credencial' })]);
    expect(motivoDoOcio('a', undefined, { ...ctx, epics: bloq, moduleMap: mapa(['a', []]) })).toEqual({
      key: 'tarefaBloqueada',
      params: { motivo: 'sem credencial' },
    });
    expect(motivoDoOcio('a', undefined, { ...ctx, epics: epics([]), moduleMap: mapa(['a', []]) })).toEqual({ key: 'semTarefa' });
  });
});

describe('motivoDoOcio sem module na tarefa (AT-881)', () => {
  it('herda os moduleIds da história: dev-web espera a fundação de api', () => {
    const e = [
      { id: 'ep', stories: [{ id: 's1', moduleIds: ['api'], tasks: [task(T1, 'api', { module: null })] }, { id: 's2', moduleIds: ['web'], tasks: [task(T2, 'web', { module: null })] }] },
    ] as unknown as Epic[];
    expect(motivoDoOcio('web', undefined, { eventos: [], epics: e, moduleMap: M, prs: [] })).toEqual({
      key: 'esperaFundacaoTarefa',
      params: { modulo: 'api', titulo: `tarefa ${T1}` },
    });
  });
});

describe('progressoDaExecucao', () => {
  it('conta done sobre o total do backlog', () => {
    expect(progressoDaExecucao(epics([task(T1, 'a', { status: 'done' }), task(T2, 'a')]))).toEqual({ done: 1, total: 2 });
    expect(progressoDaExecucao(undefined)).toEqual({ done: 0, total: 0 });
  });
});
