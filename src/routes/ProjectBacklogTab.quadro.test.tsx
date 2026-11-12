import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '../lib/i18n';
import { QuadroDeTarefas } from './ProjectBacklogTab';
import { filaDeTarefas, historiaPassaNoFiltro } from '../lib/trabalho-v9';

const tarefa = (id: string, status: string, extra: object = {}) => ({ id, title: `T-${id}`, status, blocked: false, ...extra });
const epics = [
  {
    id: 'e1',
    stories: [
      {
        id: 's1',
        status: 'ready',
        title: 'Hist',
        businessRuleIds: [],
        tasks: [
          tarefa('a', 'todo'),
          tarefa('b', 'in_progress'),
          tarefa('c', 'in_review'),
          tarefa('d', 'done'),
          tarefa('e', 'todo', { blocked: true }),
          tarefa('f', 'todo', { archivedAt: '2026-11-01' }),
        ],
      },
    ],
  },
] as never;

describe('Quadro e fila (RN-1220)', () => {
  it('tem as 5 colunas pelo estado da tarefa e deixa a arquivada de fora', () => {
    render(<QuadroDeTarefas epics={epics} />);
    const estados = ['todo', 'in_progress', 'in_review', 'done', 'blocked'];
    for (const estado of estados) {
      const coluna = document.querySelector(`[data-coluna="${estado}"]`) as HTMLElement;
      expect(coluna).toBeTruthy();
      expect(within(coluna).getAllByText(/^T-/)).toHaveLength(1);
    }
    expect(screen.queryByText('T-f')).toBeNull();
  });

  it('a fila conta pronta, rodando e bloqueada por estado, sem arquivada', () => {
    const f = filaDeTarefas(epics);
    expect([f.prontas.length, f.rodando.length, f.bloqueadas.length]).toEqual([1, 1, 1]);
  });

  it('a busca filtra por título e o filtro de pergunta exclui quem não tem', () => {
    const st = (epics as { stories: never[] }[])[0]!.stories[0]!;
    const base = { soComPergunta: false, modulo: '', perguntasPorHistoria: new Map<string, number>() };
    expect(historiaPassaNoFiltro(st, { ...base, busca: 't-a' })).toBe(true);
    expect(historiaPassaNoFiltro(st, { ...base, busca: 'nada' })).toBe(false);
    expect(historiaPassaNoFiltro(st, { ...base, busca: '', soComPergunta: true })).toBe(false);
  });
});
