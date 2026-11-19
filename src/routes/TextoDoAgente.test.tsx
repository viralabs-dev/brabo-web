import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextoDoAgente } from './TextoDoAgente';
import { TrilhoDeTurnos } from './TrilhoDeTurnos';
import { ehLongo, pontosDoTrilho } from '../lib/trilho-de-turnos';
import type { ProposedAction, SessionEvent } from '../lib/api-types';

describe('turno antigo recolhido (AT-959)', () => {
  it('recolhe em 3 linhas, mantém o texto inteiro no DOM e abre em "Ver resposta inteira"', () => {
    const longo = 'a\nb\nc\nd\ne';
    expect(ehLongo(longo)).toBe(true);
    const { container } = render(<TextoDoAgente recolhivel>{longo}</TextoDoAgente>);
    expect(container.querySelector('[data-recolhido]')).not.toBeNull();
    expect(container.textContent).toContain('a\nb\nc\nd\ne');
    fireEvent.click(screen.getByRole('button'));
    expect(container.querySelector('[data-recolhido]')).toBeNull();
  });

  it('a última resposta (não recolhível) não ganha botão nem corte', () => {
    const { container } = render(<TextoDoAgente recolhivel={false}>texto</TextoDoAgente>);
    expect(container.querySelector('[data-recolhido]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

const ev = (seq: number, type: string, id = 'criativo', kind = 'agent') =>
  ({ id: `e${seq}`, seq, type, actor: { kind, id }, payload: { text: `t${seq}` } }) as unknown as SessionEvent;

describe('trilho de turnos (AT-959)', () => {
  const events = [ev(5, 'chat.message', 'u', 'user'), ev(6, 'agent.response'), ev(7, 'agent.response', 'arquiteto')];
  const acao = { id: 'a', status: 'pending', actor: { kind: 'agent', id: 'arquiteto' } } as unknown as ProposedAction;

  it('um ponto por mensagem, âmbar para quem espera', () => {
    const pontos = pontosDoTrilho(events, [acao]);
    expect(pontos.map((p) => p.esperando)).toEqual([false, false, true]);
  });

  it('janela que não começa no primeiro evento diz que mostra só o carregado', () => {
    const { container, rerender } = render(<TrilhoDeTurnos events={events} actions={[]} noInicioDaSessao={false} />);
    expect(container.querySelectorAll('button')).toHaveLength(3);
    expect(container.textContent).toContain('…');
    rerender(<TrilhoDeTurnos events={events} actions={[]} noInicioDaSessao />);
    expect(container.textContent).not.toContain('…');
  });
});
