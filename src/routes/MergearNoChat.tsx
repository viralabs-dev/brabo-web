import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, mensagemDaApi, proposeAction } from '../lib/api-client';
import { CHAVE_DAS_PENDENCIAS_DO_PROJETO } from '../lib/pendencias-do-projeto';
import { userIdDaSessao } from '../lib/auth';
import type { GitActionFailureResult, ProposedAction, SessionEvent } from '../lib/api-types';
import { Button } from '../components/ui/Button';
import styles from './SessionPage.module.css';
import { GitMerge } from 'lucide-react';

/** A PR que uma ação `pr_open` abriu, lida do evento que a execução gravou. */
export interface PrAbertaDaAcao {
  pullRequestId: string;
  sourceBranch?: string;
  targetBranch?: string;
  title?: string;
}

/**
 * A PR aberta por esta ação `pr_open`, ou `null` se ela não abriu nenhuma.
 *
 * A fonte é o evento `action.pr_open` que a execução grava com
 * `{ actionId, pullRequestId, pullRequestUrl }` (`ExecuteGitActionUseCase`);
 * a ação em si não guarda o id da PR. Ação que ainda não executou, falhou ou
 * caiu fora da janela de eventos lida devolve `null` — e o botão não aparece:
 * não saber qual é a PR não é licença para propor o merge de outra.
 */
export function prAbertaDaAcao(
  acao: ProposedAction,
  eventos: readonly SessionEvent[],
): PrAbertaDaAcao | null {
  if (acao.actionType !== 'pr_open') return null;
  if (acao.status !== 'approved' && acao.status !== 'auto_approved') return null;
  const evento = eventos.find(
    (e) =>
      e.type === 'action.pr_open' &&
      (e.payload as { actionId?: unknown } | null)?.actionId === acao.id,
  );
  const id = (evento?.payload as { pullRequestId?: unknown } | undefined)?.pullRequestId;
  if (id === undefined || id === null || String(id) === '') return null;
  const dado = acao.payload as { sourceBranch?: unknown; targetBranch?: unknown; title?: unknown };
  return {
    pullRequestId: String(id),
    sourceBranch: typeof dado.sourceBranch === 'string' ? dado.sourceBranch : undefined,
    targetBranch: typeof dado.targetBranch === 'string' ? dado.targetBranch : undefined,
    title: typeof dado.title === 'string' ? dado.title : undefined,
  };
}

/**
 * Já existe uma proposta de merge VIVA para esta PR nesta sessão? Pendente,
 * aprovada ou auto-aprovada contam — negada ou falha, não: nesses casos o dono
 * pode querer tentar de novo. É o dedupe do lado da tela; quem recusa de fato
 * é a api, em qualquer sessão (RN-663: `merge_ja_proposto`/`pr_ja_mergeado`).
 */
export function jaHaMergeDaPr(acoes: readonly ProposedAction[], pullRequestId: string): boolean {
  return acoes.some(
    (a) =>
      a.actionType === 'git_merge' &&
      (a.status === 'pending' || a.status === 'approved' || a.status === 'auto_approved') &&
      String((a.payload as { pullRequestId?: unknown }).pullRequestId ?? '') === pullRequestId,
  );
}

interface MergearNoChatProps {
  projectId: string;
  sessionId: string;
  pr: PrAbertaDaAcao;
  /** O número da PR para o texto ("#6"); sem ele, o id. */
  numero?: string | number;
  /** Papel alcança o mínimo do endpoint (`developer`)? Senão, inerte com motivo. */
  podeDecidir: boolean;
  /**
   * O gate que ainda não julgou a tarefa desta PR (`gatePendenteNoMerge`), ou
   * `null`. AVISO, nunca trava (AT-249, RN-663): o botão segue ativo.
   */
  gatePendente?: string | null;
}

/** A causa curta de uma ação git que falhou: os arquivos em conflito ou a 1ª frase do erro. */
function causaDaFalha(r: ProposedAction['executionResult']): string | null {
  const falha = r && 'error' in r && typeof r.error === 'string' ? (r as GitActionFailureResult) : null;
  if (!falha) return null;
  const arquivos = (falha.conflictingFiles ?? []).filter(Boolean);
  const frase = falha.error.trim().split(/(?<=[.!?])\s/)[0] ?? '';
  return arquivos.length > 0 ? `${frase} (${arquivos.join(', ')})` : frase || null;
}

/**
 * "Mergear" na linha da PR (AT-266, RN-626; AT-753 UX-2): o dono decide sem
 * trocar para a aba PRs e sem um cartão separado.
 *
 * O botão abre a confirmação na própria linha ("Mergear #6 em dev? Confirmar /
 * Cancelar"). Confirmar PROPÕE a `git_merge` (ator `user`, esta sessão) e a
 * APROVA no mesmo gesto, pelos MESMOS endpoints do cartão: a proposta e a
 * aprovação seguem no log. O gesto é do humano — nada é automatizado: merge em
 * branch protegida segue `require_approval` incondicional (RN-418), e o
 * Confirmar é a aprovação.
 */
export function MergearNoChat({
  projectId,
  sessionId,
  pr,
  numero,
  podeDecidir,
  gatePendente = null,
}: MergearNoChatProps) {
  const { t } = useTranslation('sessionPage');
  const queryClient = useQueryClient();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null);

  async function confirmar() {
    setEnviando(true);
    setResultado(null);
    try {
      const proposta = await proposeAction(projectId, sessionId, {
        actionType: 'git_merge',
        actor: { kind: 'user', id: userIdDaSessao() ?? 'usuário' },
        payload: {
          pullRequestId: pr.pullRequestId,
          sourceBranch: pr.sourceBranch,
          targetBranch: pr.targetBranch,
          title: pr.title,
        },
      });
      const decidida = await approveAction(projectId, sessionId, proposta.id);
      setResultado(
        decidida.status === 'failed'
          ? {
              tom: 'erro',
              texto: causaDaFalha(decidida.executionResult) ?? t('mergearNoChat.falhou'),
            }
          : { tom: 'ok', texto: t('mergearNoChat.mergeada') },
      );
    } catch (erro) {
      // A frase da api (dedupe e recusa da AT-249 chegam por aqui), não uma genérica.
      setResultado({ tom: 'erro', texto: mensagemDaApi(erro) });
    } finally {
      setEnviando(false);
      setConfirmando(false);
      void queryClient.invalidateQueries({ queryKey: ['session-actions', projectId, sessionId] });
      void queryClient.invalidateQueries({ queryKey: CHAVE_DAS_PENDENCIAS_DO_PROJETO(projectId) });
      void queryClient.invalidateQueries({ queryKey: ['code-pull-requests', projectId] });
    }
  }

  const rotuloDaPr = `#${numero ?? pr.pullRequestId}`;
  return (
    <div className={styles.mergearNoChat}>
      {confirmando ? (
        <>
          <span className={styles.mergearNota} data-testid="mergear-confirmacao">
            {t('mergearNoChat.confirmacao', { pr: rotuloDaPr, alvo: pr.targetBranch ?? '?' })}
          </span>
          <Button variant="primary" loading={enviando} onClick={() => void confirmar()}>
            {t('mergearNoChat.confirmar')}
          </Button>
          <Button variant="secondary" disabled={enviando} onClick={() => setConfirmando(false)}>
            {t('mergearNoChat.cancelar')}
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="primary"
            disabled={!podeDecidir || resultado?.tom === 'ok'}
            onClick={() => setConfirmando(true)}
          >
            <GitMerge aria-hidden="true" />
            {t('mergearNoChat.botao')}
          </Button>
          <span className={styles.mergearNota} data-testid="mergear-nota">
            {podeDecidir ? t('mergearNoChat.nota') : t('mergearNoChat.semPapel')}
          </span>
        </>
      )}
      {gatePendente && (
        <span className={styles.mergearAvisoDeGate} data-testid="aviso-gate-pendente">
          {t('mergearNoChat.gatePendente', { gate: gatePendente })}
        </span>
      )}
      {resultado && (
        <span
          className={resultado.tom === 'erro' ? styles.mergearErro : styles.mergearNota}
          role={resultado.tom === 'erro' ? 'alert' : 'status'}
          data-testid="mergear-resultado"
        >
          {resultado.tom === 'erro' ? `${t('mergearNoChat.erroTitulo')}: ` : ''}
          {resultado.texto}
        </span>
      )}
    </div>
  );
}
