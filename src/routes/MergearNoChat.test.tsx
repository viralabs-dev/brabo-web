import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProposedAction, SessionEvent } from '../lib/api-types';
import i18n from '../lib/i18n';

const proposeAction = vi.fn();
const approveAction = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    proposeAction: (...a: unknown[]) => proposeAction(...a),
    approveAction: (...a: unknown[]) => approveAction(...a),
  };
});
vi.mock('../lib/auth', () => ({ userIdDaSessao: () => 'user-1' }));

const { MergearNoChat, jaHaMergeDaPr, prAbertaDaAcao } = await import('./MergearNoChat');
const { ApiError } = await import('../lib/api-client');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});
beforeEach(() => vi.clearAllMocks());

function acao(over: Partial<ProposedAction> = {}): ProposedAction {
  return {
    id: 'pr-action',
    projectId: 'proj-1',
    sessionId: 's-1',
    seq: 1,
    actionType: 'pr_open',
    payload: { title: 'feat: x', sourceBranch: 'feature/x', targetBranch: 'dev' },
    status: 'approved',
    resolvedPolicy: 'require_approval',
    actor: { kind: 'agent', id: 'dev-api' },
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    executionResult: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}
const eventoPr = (actionId: string, pullRequestId: unknown): SessionEvent =>
  ({
    id: 'e1',
    sessionId: 's-1',
    seq: 5,
    type: 'action.pr_open',
    actor: { kind: 'agent', id: 'dev-api' },
    payload: { actionId, pullRequestId, pullRequestUrl: 'https://x/pr/7' },
    createdAt: new Date().toISOString(),
  }) as SessionEvent;

describe('prAbertaDaAcao / jaHaMergeDaPr (AT-266)', () => {
  it('lê a PR do evento que a execução gravou; sem evento (ou pendente/falha) não há PR', () => {
    expect(prAbertaDaAcao(acao(), [eventoPr('pr-action', 7)])).toMatchObject({
      pullRequestId: '7',
      sourceBranch: 'feature/x',
      targetBranch: 'dev',
    });
    expect(prAbertaDaAcao(acao(), [])).toBeNull();
    expect(prAbertaDaAcao(acao(), [eventoPr('outra', 7)])).toBeNull();
    expect(prAbertaDaAcao(acao({ status: 'pending' }), [eventoPr('pr-action', 7)])).toBeNull();
    expect(prAbertaDaAcao(acao({ status: 'failed' }), [eventoPr('pr-action', 7)])).toBeNull();
    expect(prAbertaDaAcao(acao({ actionType: 'terminal' }), [eventoPr('pr-action', 7)])).toBeNull();
  });

  it('dedupe: merge pendente/aprovado da mesma PR esconde o botão; negado, não', () => {
    const merge = (status: ProposedAction['status'], pr = '7') =>
      acao({ id: `m-${status}`, actionType: 'git_merge', status, payload: { pullRequestId: pr } });
    expect(jaHaMergeDaPr([merge('pending')], '7')).toBe(true);
    expect(jaHaMergeDaPr([merge('approved')], '7')).toBe(true);
    expect(jaHaMergeDaPr([merge('denied')], '7')).toBe(false);
    expect(jaHaMergeDaPr([merge('pending', '8')], '7')).toBe(false);
  });
});

function montar(podeDecidir = true, gatePendente: string | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MergearNoChat
        projectId="proj-1"
        sessionId="s-1"
        pr={{ pullRequestId: '7', sourceBranch: 'feature/x', targetBranch: 'dev', title: 'feat: x' }}
        podeDecidir={podeDecidir}
        gatePendente={gatePendente}
      />
    </QueryClientProvider>,
  );
}

const decidida = (status: ProposedAction['status'], executionResult: ProposedAction['executionResult'] = null) =>
  acao({ id: 'm-1', actionType: 'git_merge', status, executionResult });

async function confirmarMerge() {
  fireEvent.click(screen.getByRole('button', { name: 'Mergear' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
}

describe('MergearNoChat (AT-266, AT-753 UX-2)', () => {
  it('o Mergear só pergunta; Cancelar não chama nada', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Mergear' }));
    expect(screen.getByTestId('mergear-confirmacao')).toHaveTextContent('Mergear #7 em dev?');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(proposeAction).not.toHaveBeenCalled();
    expect(approveAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Mergear' })).toBeInTheDocument();
  });

  it('Confirmar PROPÕE git_merge como usuário e APROVA a proposta no mesmo gesto', async () => {
    proposeAction.mockResolvedValue(decidida('pending'));
    approveAction.mockResolvedValue(decidida('executed'));
    montar();
    await confirmarMerge();

    await waitFor(() =>
      expect(proposeAction).toHaveBeenCalledWith('proj-1', 's-1', {
        actionType: 'git_merge',
        actor: { kind: 'user', id: 'user-1' },
        payload: { pullRequestId: '7', sourceBranch: 'feature/x', targetBranch: 'dev', title: 'feat: x' },
      }),
    );
    await waitFor(() => expect(approveAction).toHaveBeenCalledWith('proj-1', 's-1', 'm-1'));
    expect(await screen.findByTestId('mergear-resultado')).toHaveTextContent('Mergeada');
  });

  it('CASO DE FALHA: a recusa da api (409) aparece na linha com a frase dela, sem aprovar', async () => {
    proposeAction.mockRejectedValue(new ApiError(409, { message: 'PR já mergeada.' }));
    montar();
    await confirmarMerge();

    expect(await screen.findByRole('alert')).toHaveTextContent('PR já mergeada.');
    expect(approveAction).not.toHaveBeenCalled();
  });

  it('CASO DE FALHA: o merge que falha na execução mostra a causa e os arquivos em conflito', async () => {
    proposeAction.mockResolvedValue(decidida('pending'));
    approveAction.mockResolvedValue(
      decidida('failed', { failed: true, error: 'Conflito ao mergear. Detalhes longos.', conflictingFiles: ['a.ts'] }),
    );
    montar();
    await confirmarMerge();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Conflito ao mergear. (a.ts)');
    expect(alerta).not.toHaveTextContent('Detalhes longos');
  });

  it('gate pendente é AVISO (AT-249, RN-663): o texto nomeia o gate e o botão segue ativo', async () => {
    montar(true, 'qa-verificada');

    expect(screen.getByTestId('aviso-gate-pendente')).toHaveTextContent(
      'O gate qa-verificada ainda está pendente',
    );
    const botao = screen.getByRole('button', { name: 'Mergear' });
    expect(botao).toBeEnabled();
    fireEvent.click(botao);
    expect(screen.getByTestId('mergear-confirmacao')).toBeInTheDocument();
  });

  it('sem gate pendente, nenhum aviso', () => {
    montar(true, null);
    expect(screen.queryByTestId('aviso-gate-pendente')).toBeNull();
  });

  it('papel abaixo de developer: botão inerte, com o motivo em texto', () => {
    montar(false);
    expect(screen.getByRole('button', { name: 'Mergear' })).toBeDisabled();
    expect(screen.getByTestId('mergear-nota')).toHaveTextContent('papel developer');
    expect(proposeAction).not.toHaveBeenCalled();
  });
});

it('AT-682: o ícone do botão é decorativo (aria-hidden) e o nome vem do texto', () => {
  montar();
  const botao = document.body.querySelector('button svg')!.closest('button')!;
  expect(botao.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(botao.textContent?.trim().length).toBeGreaterThan(0);
});
