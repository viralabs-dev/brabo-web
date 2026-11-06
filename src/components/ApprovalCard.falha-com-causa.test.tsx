import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../lib/i18n';
import { render, screen } from '@testing-library/react';
import { ApprovalCard } from './ApprovalCard';
import type { ProposedAction } from '../lib/api-types';

/** AT-753 (UX-8): "Falhou" diz a causa e o próximo passo. */
function falhou(executionResult: ProposedAction['executionResult'], extra: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'm1',
    projectId: 'proj-1',
    sessionId: 's1',
    seq: 1,
    actionType: 'git_merge',
    payload: { pullRequestId: 'pr-6', sourceBranch: 'feature/x', targetBranch: 'dev' },
    status: 'failed',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'agent', id: 'dev-lead' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  };
}

function montar(a: ProposedAction) {
  render(<ApprovalCard action={a} onApprove={vi.fn()} onDeny={vi.fn()} onAlwaysAllow={vi.fn()} />);
}

beforeEach(async () => {
  await i18n.changeLanguage('pt-BR');
});

afterAll(() => {
  void i18n.changeLanguage('en');
});

describe('ApprovalCard — falha com causa e próximo passo (UX-8)', () => {
  it('conflito: nomeia o arquivo e diz o que acontece em seguida', () => {
    montar(
      falhou({ failed: true, error: 'conflito de merge na PR pr-6: README.md', conflictingFiles: ['README.md'] }),
    );
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Conflito em README.md — o agente refaz a PR sozinho');
  });

  it('conflito em muitos arquivos: mostra 3 e conta o resto', () => {
    montar(falhou({ failed: true, error: 'x', conflictingFiles: ['a', 'b', 'c', 'd', 'e'] }));
    expect(screen.getByRole('alert')).toHaveTextContent('Conflito em a, b, c (+2)');
  });

  it('sem arquivos em conflito: mostra o erro curto (1ª frase)', () => {
    montar(falhou({ failed: true, error: 'A branch está protegida. Peça ao dono para liberar.', conflictingFiles: [] }));
    expect(screen.getByRole('alert')).toHaveTextContent(/^A branch está protegida\.$/);
  });

  it('CASO DE FALHA: sem resultado (ou resultado de terminal) fica só o "Falhou", sem alerta', () => {
    montar(falhou(null));
    expect(screen.getByText('Falhou')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    montar(
      falhou(
        { stdout: '', stderr: 'boom', exitCode: 1, timedOut: false, rawBytes: 4, estimatedTokensRaw: 1, compressedBytes: null, estimatedTokensCompressed: null },
        { id: 'm2', actionType: 'terminal', payload: { command: 'false' } },
      ),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
