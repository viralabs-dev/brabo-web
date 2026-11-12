import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../lib/i18n';
import { passosDoTurno } from '../../lib/passos-do-turno';
import type { SessionEvent } from '../../lib/api-types';
import { PassosDoTurno } from './passos-do-turno';

const ev = (seq: number, type: string, payload: unknown = {}, actor = 'dev'): SessionEvent =>
  ({ id: `e${seq}`, seq, type, actor: { kind: 'agent', id: actor }, payload }) as unknown as SessionEvent;
const tr = (seq: number, tool: string, ok = true, extra = {}) =>
  ev(seq, 'tool.result', { tool, ok, resultado: `r-${tool}`, args: { segredo: 'X' }, ...extra });

describe('passos do turno encerrado (RN-974)', () => {
  it('3 ferramentas viram 3 passos em ordem, sem args', () => {
    const events = [ev(1, 'agent.response'), tr(2, 'a'), tr(3, 'b'), tr(4, 'c'), ev(5, 'agent.response')];
    const passos = passosDoTurno(events, events[4]!);
    expect(passos.map((p) => p.tool)).toEqual(['a', 'b', 'c']);
    const { container } = render(<PassosDoTurno passos={passos} />);
    expect(container.querySelectorAll('[data-slot="ai-tool"]').length).toBe(0); // recolhido
    fireEvent.click(screen.getByRole('button'));
    expect(container.querySelectorAll('[data-slot="ai-tool"]').length).toBe(3);
    expect(container.textContent).not.toContain('segredo');
  });

  it('ok:false aparece como falha e o corte é avisado', () => {
    const events = [tr(1, 'x', false, { resultadoTotal: 5000 }), ev(2, 'agent.response')];
    render(<PassosDoTurno passos={passosDoTurno(events, events[1]!)} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button', { name: /^x/ }));
    expect(screen.getByRole('alert').textContent).toContain('r-x');
    expect(document.querySelector('[data-slot="ai-tool-truncated"]')).toBeTruthy();
  });

  it('seletor Agrupados | Em ordem: mesmo conjunto, ordem original e grupos (RN-1185)', () => {
    const events = [tr(1, 'create_epic'), tr(2, 'listar_backlog'), tr(3, 'read_file'), ev(4, 'agent.response')];
    const passos = passosDoTurno(events, events[3]!);
    const { container } = render(<PassosDoTurno passos={passos} duracaoMs={2500} />);
    expect(container.textContent).toContain('—');
    expect(container.textContent).toContain('2.5 s');
    fireEvent.click(screen.getByRole('button', { name: /Turn steps|Passos do turno/ }));
    const nomes = () => [...container.querySelectorAll('[data-slot="ai-tool"]')].length;
    expect(container.querySelector('[data-testid="grupo-leu"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="grupo-outros"]')).toBeTruthy();
    expect(nomes()).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: /Em ordem|In order/ }));
    expect(container.querySelector('[data-testid^="grupo-"]')).toBeNull();
    expect(nomes()).toBe(3);
  });

  it('turno sem ferramenta não ganha passos', () => {
    const events = [ev(1, 'agent.response'), ev(2, 'agent.response')];
    expect(passosDoTurno(events, events[1]!)).toEqual([]);
  });
});

describe('passos do turno: formato do ToolLoop dos dev agents (AT-718)', () => {
  it('tool.result com `result` mostra a saída', () => {
    const events = [ev(1, 'tool.result', { tool: 'run_tests', ok: true, result: 'PASS 3' }, 'dev-x'), ev(2, 'agent.response', {}, 'dev-x')];
    const passos = passosDoTurno(events, events[1]!);
    expect(passos[0]!.resultado).toBe('PASS 3');
    expect(passos[0]!.truncado).toBe(false);
  });

  it('result não-string vira JSON', () => {
    const events = [ev(1, 'tool.result', { tool: 't', ok: true, result: { n: 2 } }, 'dev-x'), ev(2, 'agent.response', {}, 'dev-x')];
    expect(passosDoTurno(events, events[1]!)[0]!.resultado).toBe('{"n":2}');
  });

  it('result longo é cortado no teto com o aviso', () => {
    const longo = 'a'.repeat(2500);
    const events = [ev(1, 'tool.result', { tool: 't', ok: true, result: longo }, 'dev-x'), ev(2, 'agent.response', {}, 'dev-x')];
    const p = passosDoTurno(events, events[1]!)[0]!;
    expect(p.resultado?.length).toBe(2000);
    expect(p.truncado).toBe(true);
  });

  it('formato da RN-589 (resultado) continua igual', () => {
    const events = [tr(1, 'a'), ev(2, 'agent.response')];
    const p = passosDoTurno(events, events[1]!)[0]!;
    expect(p.resultado).toBe('r-a');
    expect(p.truncado).toBe(false);
  });
});
