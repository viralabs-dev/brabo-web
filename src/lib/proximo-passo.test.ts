import { describe, expect, it } from 'vitest';
import type { Architecture, Epic, Task } from './api-types';
import {
  DESTINO,
  PASSOS,
  derivarProximoPasso,
  fatosDoBacklog,
  type Fatos,
  type TipoDoPasso,
} from './proximo-passo';

// Fatos de um projeto andando bem: nada vale (o cartão some).
const NADA: Fatos = {
  primeiroPasso: null,
  agenteTrabalhando: null,
  temSessao: true,
  historias: 3,
  arquiteturaPendente: false,
  semModulo: 0,
  bloqueadas: 0,
  prontas: 0,
  execucaoAtiva: false,
  emAndamento: 0,
  tarefas: 5,
  feitas: 2,
};

const CASOS: [TipoDoPasso, Partial<Fatos>][] = [
  ['primeiro_passo', { primeiroPasso: 'credencial' }],
  ['agente_trabalhando', { agenteTrabalhando: 'Criativo' }],
  ['continuar_ideacao', { historias: 0 }],
  ['confirmar_arquitetura', { arquiteturaPendente: true }],
  ['ligar_modulo', { semModulo: 2 }],
  ['desbloquear', { bloqueadas: 1 }],
  ['ativar_execucao', { prontas: 8 }],
  ['acompanhar_execucao', { execucaoAtiva: true, emAndamento: 2 }],
  ['rodar_entregavel', { feitas: 5 }],
];

describe('derivarProximoPasso (RN-1162)', () => {
  it.each(CASOS)('situação %s vale sozinha', (tipo, fatos) => {
    expect(derivarProximoPasso({ ...NADA, ...fatos })).toBe(tipo);
  });

  it('a tabela cobre as nove situações, na ordem dos casos', () => {
    expect(PASSOS.map((p) => p.tipo)).toEqual(CASOS.map(([t]) => t));
  });

  it('com duas verdadeiras vale a de cima', () => {
    expect(derivarProximoPasso({ ...NADA, bloqueadas: 1, prontas: 8 })).toBe('desbloquear');
    expect(derivarProximoPasso({ ...NADA, primeiroPasso: 'modelo', agenteTrabalhando: 'X' })).toBe('primeiro_passo');
  });

  it('nenhuma verdadeira devolve null (o cartão some)', () => {
    expect(derivarProximoPasso(NADA)).toBeNull();
  });

  it('o destino cobre toda situação, menos a que herda o da RN-708', () => {
    expect(Object.keys(DESTINO).sort()).toEqual(
      PASSOS.map((p) => p.tipo).filter((t) => t !== 'primeiro_passo').sort(),
    );
  });
});

function tarefa(id: string, extra: Partial<Task> = {}): Task {
  return {
    id, storyId: 's1', title: id, description: '', status: 'todo', assignedTo: null, blocked: false,
    blockedReason: null, gateStatus: null, gateCorrectionCount: 0, module: 'api',
    createdAt: '', updatedAt: '', ...extra,
  };
}

function backlog(tasks: Task[], moduleIds = ['api']): Epic[] {
  return [{ id: 'e1', stories: [{ id: 's1', moduleIds, tasks }] } as unknown as Epic];
}

const ARQ = { moduleMap: { modules: [] }, pendencies: [] } as unknown as Architecture;

describe('fatosDoBacklog', () => {
  it('conta prontas, bloqueadas e em andamento; a arquivada não conta', () => {
    const f = fatosDoBacklog(
      backlog([
        tarefa('a'),
        tarefa('b', { blocked: true }),
        tarefa('c', { archivedAt: '2026-11-01', status: 'done' }),
        tarefa('d', { status: 'in_progress' }),
      ]),
      ARQ,
    );
    expect(f).toMatchObject({ prontas: 1, bloqueadas: 1, emAndamento: 1, tarefas: 3, feitas: 0, semModulo: 0 });
  });

  it('tarefa sem módulo em história de vários módulos não é pronta', () => {
    const f = fatosDoBacklog(backlog([tarefa('a', { module: null })], ['api', 'web']), ARQ);
    expect(f).toMatchObject({ semModulo: 1, prontas: 0 });
  });

  it('arquitetura pendente: sem mapa ou com pendência', () => {
    expect(fatosDoBacklog([], undefined).arquiteturaPendente).toBe(true);
    expect(fatosDoBacklog([], { ...ARQ, pendencies: [{}] } as unknown as Architecture).arquiteturaPendente).toBe(true);
    expect(fatosDoBacklog([], ARQ).arquiteturaPendente).toBe(false);
  });
});
