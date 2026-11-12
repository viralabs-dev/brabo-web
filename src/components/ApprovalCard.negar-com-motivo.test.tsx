import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import type { ProposedAction } from '../lib/api-types';
import { ApprovalCard } from './ApprovalCard';

/** AT-910: negar um PLANO pede o motivo (obrigatório) e o envia a `onDeny`. */
beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

function acao(actionType: string, payload: Record<string, unknown>): ProposedAction {
  return {
    id: 'a1',
    projectId: 'proj-1',
    sessionId: 's1',
    seq: 1,
    actionType,
    payload,
    status: 'pending',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'agent', id: 'dev-lead' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ProposedAction;
}
const plano = () =>
  acao('propose_execution_plan', {
    modulos: [{ modulo: 'Backend', agentes: 1, porque: 'x' }],
    resumo: 'plano',
    totalAgentes: 1,
    tarefas: [{ titulo: 't1', modulo: 'Backend' }],
  });

describe('ApprovalCard — Negar o plano com motivo (AT-910)', () => {
  it('Negar abre o campo, exige o motivo e envia o texto aparado', async () => {
    const onDeny = vi.fn().mockResolvedValue(undefined);
    render(<ApprovalCard action={plano()} onApprove={vi.fn()} onDeny={onDeny} onAlwaysAllow={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Negar' }));
    expect(onDeny).not.toHaveBeenCalled();
    const confirmar = screen.getByRole('button', { name: 'Confirmar e negar' });
    expect(confirmar).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Por que você nega este plano?'), { target: { value: '  falta o módulo X ' } });
    fireEvent.click(confirmar);
    await waitFor(() => expect(onDeny).toHaveBeenCalledWith('falta o módulo X'));
  });

  it('Cancelar fecha o campo sem negar', () => {
    const onDeny = vi.fn();
    render(<ApprovalCard action={plano()} onApprove={vi.fn()} onDeny={onDeny} onAlwaysAllow={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Negar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByTestId('motivo-da-negacao')).toBeNull();
    expect(onDeny).not.toHaveBeenCalled();
  });

  it('CASO DE FALHA: ação que não é plano nega direto, sem pedir motivo', () => {
    const onDeny = vi.fn();
    render(
      <ApprovalCard
        action={acao('run_command', { command: 'npm test' })}
        onApprove={vi.fn()}
        onDeny={onDeny}
        onAlwaysAllow={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Negar' }));
    expect(onDeny).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('motivo-da-negacao')).toBeNull();
  });
});
