import { useState } from 'react';
import { GitPullRequest } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveAction,
  approveAlwaysAction,
  denyAction,
  getProjectPendingActions,
  mensagemDaApi,
  proposeAction,
} from '../lib/api-client';
import {
  useBacklog,
  useCurrentWorkspaceWithRole,
  useLatestSession,
  useProjectPendingActions,
  useSessionEvents,
} from '../lib/hooks';
import { roleAtLeast } from '../lib/roles';
import { portoesDaPr } from '../lib/portoes-da-pr';
import { userIdDaSessao } from '../lib/auth';
import { causaDoBloqueio } from '../lib/explicacao-do-bloqueio';
import { gatePendenteNoMerge } from '../lib/gate-do-merge';
import type { CodePullRequestSummary, Epic, ProposedAction, Task } from '../lib/api-types';
import { ApprovalCard } from '../components/ApprovalCard';
import { PortoesDaPr } from '../components/PortoesDaPr';
import { Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import { useToast } from '../components/ui/ToastProvider.helpers';
import { pedirAba } from '../lib/contagens-do-projeto';
import { PrListAndDiff } from './code/PrListAndDiff';
import { RetomarGateEstacionado } from './RetomarGateEstacionado';
import { cicloEstacionado } from './RetomarGateEstacionado.helpers';
import styles from './ProjectPrsTab.module.css';

import { ultimaRecusaDeMerge } from './ProjectPrsTab.helpers';
const PREFIXO_BRANCH_DE_TASK = 'feature/task-';

/**
 * A task de dev agent que produziu a branch desta PR, se houver — mesmo
 * esquema de nome que RN-152 já usa (`feature/task-XXXXXXXX`, os 8
 * primeiros chars do id da task, `Engine.Dev.AgentIo`). `undefined` quando a
 * PR não veio de um dev agent (infra, aberta a mão, outro provider) — sem
 * gate nenhum a mostrar, e o Merge não fica bloqueado por falta de dado.
 */
function taskDaBranch(epics: Epic[] | undefined, sourceBranch: string): Task | undefined {
  if (!sourceBranch.startsWith(PREFIXO_BRANCH_DE_TASK)) return undefined;
  const prefixo = sourceBranch.slice(PREFIXO_BRANCH_DE_TASK.length);
  if (!prefixo) return undefined;
  for (const epic of epics ?? []) {
    for (const story of epic.stories) {
      const task = story.tasks.find((t) => t.id.startsWith(prefixo));
      if (task) return task;
    }
  }
  return undefined;
}

/** A `proposed_action` de `git_merge` pendente para ESTE pr, se alguém já
 *  clicou "Merge" antes — cruzamento project-wide (`useProjectPendingActions`),
 *  não escopado a nenhuma sessão específica. */
function acaoDeMergeParaPr(
  acoes: ProposedAction[] | undefined,
  pr: CodePullRequestSummary,
): ProposedAction | undefined {
  return (acoes ?? []).find((a) => {
    const payload = a.payload as { pullRequestId?: unknown };
    return String(payload.pullRequestId ?? '') === pr.id;
  });
}

/**
 * Aba `prs` — PRs do projeto INTEIRO, direto do provider de git (Onda 2 do
 * programa de abas agrupadas).
 *
 * Resolve o bug de raiz de `ProjectApprovalsTab.tsx` (seção "PRs em
 * revisão", escopada a `usePendingActions(projectId, latestSession?.id)` —
 * só a sessão mais recente): a listagem aqui vem de
 * `GET /projects/:id/code/pull-requests`, que é por PROJETO e nunca olha
 * sessão nenhuma — uma PR proposta há três sessões continua aparecendo. O
 * cruzamento com a `proposed_action` de `git_merge` (pra achar o card de
 * decisão) também é project-wide (`useProjectPendingActions`), pelo MESMO
 * motivo — e a decisão (aprovar/negar/sempre permitir) usa o `sessionId` que
 * a própria ação carrega, nunca `latestSession`, porque a ação pode ter
 * nascido numa sessão diferente da atual.
 *
 * `ProjectApprovalsTab` continua existindo como está: ela é o lugar de
 * decisão para o que NÃO é PR (promoção de história, `instruction_patch`,
 * paralelismo). Esta aba é listagem + gestão de PR, project-wide.
 */
export function ProjectPrsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('approvals');
  const { t: tSessao } = useTranslation('sessionPage');
  const { latest: latestSession } = useLatestSession(projectId);
  const backlogQuery = useBacklog(projectId);
  const mergeActionsQuery = useProjectPendingActions(projectId, 'git_merge');
  // AT-971: "Pedir o parecer de novo" só quando o ciclo do gate da tarefa está
  // estacionado (`gate.rescue_parked`, RN-724) — o mesmo gesto da Sessão.
  const eventosQuery = useSessionEvents(projectId, latestSession?.id);
  const { data: workspaceComPapel } = useCurrentWorkspaceWithRole();
  const podeDecidir = roleAtLeast(workspaceComPapel?.role, 'developer');
  // RN-705: as recusas de merge (sob o MESMO prefixo da fila do projeto, então
  // o aviso do canal que invalida a fila alcança esta leitura também).
  const mergesFalhosQuery = useQuery({
    queryKey: ['project-pending-actions', projectId, 'git_merge', 'failed'],
    queryFn: () => getProjectPendingActions(projectId, { actionType: 'git_merge', status: 'failed' }),
  });
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [propondo, setPropondo] = useState<string | null>(null);
  // RN-822 (AT-493): a ação que ESTE clique acabou de criar, por id da PR, com
  // o instante em que a api a devolveu. O cartão aparece com ela na hora, sem
  // depender de a fila do projeto voltar — antes o 1º clique terminava com o
  // botão de volta e nenhum cartão até o refetch, e lia-se "não pegou". Vale
  // só enquanto a fila não tem leitura MAIS NOVA que a proposta: aí quem diz
  // se ela segue pendente é a fila.
  const [propostas, setPropostas] = useState<Record<string, { acao: ProposedAction; em: number }>>({});

  function acaoDaPr(pr: CodePullRequestSummary): ProposedAction | undefined {
    const daFila = acaoDeMergeParaPr(mergeActionsQuery.data, pr);
    if (daFila) return daFila;
    const local = propostas[pr.id];
    if (!local) return undefined;
    return (mergeActionsQuery.dataUpdatedAt ?? 0) > local.em ? undefined : local.acao;
  }

  function esquecerProposta(acao: ProposedAction) {
    setPropostas((atual) => {
      const resto = { ...atual };
      for (const [id, p] of Object.entries(atual)) if (p.acao.id === acao.id) delete resto[id];
      return resto;
    });
  }

  function invalidateMergeActions() {
    // Por prefixo do PROJETO: alcança a fila pendente, a das recusas
    // (RN-705) E a fila inteira que a sidebar conta (RN-729) — só com o
    // prefixo de `git_merge`, o contador "PRs" da sidebar seguia mostrando o
    // merge já executado até o próximo poll de projeto.
    queryClient.invalidateQueries({
      queryKey: ['project-pending-actions', projectId],
    });
    // O merge aprovado executa na hora: a lista de PRs muda (a PR sai de
    // "Abertas") — sem isto ela seguia aberta com o botão até recarregar.
    queryClient.invalidateQueries({ queryKey: ['code-pull-requests', projectId] });
    queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
  }

  async function proporMerge(pr: CodePullRequestSummary) {
    if (!latestSession) return;
    setPropondo(pr.id);
    try {
      const acao = await proposeAction(projectId, latestSession.id, {
        actionType: 'git_merge',
        actor: { kind: 'user', id: userIdDaSessao() ?? 'usuário' },
        payload: {
          pullRequestId: pr.id,
          sourceBranch: pr.sourceBranch,
          targetBranch: pr.targetBranch,
          title: pr.title,
        },
      });
      setPropostas((atual) => ({ ...atual, [pr.id]: { acao, em: Date.now() } }));
      invalidateMergeActions();
    } catch (erro) {
      showToast({
        title: t('prsTab.mergeErrorTitle'),
        message: mensagemDaApi(erro),
        tone: 'danger',
      });
    } finally {
      setPropondo(null);
    }
  }

  async function aprovar(acao: ProposedAction) {
    try {
      await approveAction(projectId, acao.sessionId, acao.id);
    } finally {
      esquecerProposta(acao);
      invalidateMergeActions();
    }
  }
  async function negar(acao: ProposedAction) {
    try {
      await denyAction(projectId, acao.sessionId, acao.id);
    } finally {
      esquecerProposta(acao);
      invalidateMergeActions();
    }
  }
  async function sempreAprovar(acao: ProposedAction) {
    try {
      await approveAlwaysAction(projectId, acao.sessionId, acao.id);
    } finally {
      esquecerProposta(acao);
      invalidateMergeActions();
    }
    queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
  }

  return (
    <div>
      <div className={styles.cabecalho}>
        <h2 className={styles.titulo}>
          <GitPullRequest size={18} aria-hidden="true" /> {t('prsTab.title')}
        </h2>
        <p className={styles.subtitulo}>{t('prsTab.subtitle')}</p>
      </div>

      {backlogQuery.isError && (
        <ErroDeCarregamento
          titulo={t('prsTab.gateStatusError')}
          erro={backlogQuery.error}
          onTentarDeNovo={() => void backlogQuery.refetch()}
        />
      )}

      <PrListAndDiff
        projectId={projectId}
        superficie="prs"
        vazioExtra={
          <div className={styles.extraLinha} data-testid="prs-vazio-acoes">
            <Button variant="secondary" size="sm" onClick={() => pedirAba({ projectId, tab: 'approvals' })}>
              {t('prsTab.vazio.verAprovacao')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => pedirAba({ projectId, tab: 'executores' })}>
              {t('prsTab.vazio.ativarExecucao')}
            </Button>
          </div>
        }
        renderItemPortoes={(pr) => {
          if (pr.state === 'closed' || backlogQuery.isPending) return null;
          const p = portoesDaPr(taskDaBranch(backlogQuery.data, pr.sourceBranch), pr.state === 'merged');
          return p ? <PortoesDaPr portoes={p.portoes} /> : null;
        }}
        renderItemMotivo={(pr) => {
          if (pr.state !== 'open' || backlogQuery.isPending) return null;
          const task = taskDaBranch(backlogQuery.data, pr.sourceBranch);
          const gatePendente = gatePendenteNoMerge(task);
          // RN-1474 (revisa RN-663/RN-768): o motivo é UMA frase sob o título.
          // Tarefa bloqueada, em cor de erro; gate pendente, em cor neutra.
          // RN-705: a recusa é AVISO em texto — a decisão continua humana. Vem ANTES do
          // bloqueio e do gate pendente: depois de um conflito a tarefa volta a
          // `in_progress` (gate pendente), e o que o conflito diz é o que destrava.
          const recusa = acaoDaPr(pr) ? undefined : ultimaRecusaDeMerge(mergesFalhosQuery.data, pr);
          if (recusa) {
            return (
              <p className={styles.motivoAviso} data-testid="aviso-merge-recusado">
                {[
                  t('prsTab.mergeRecusado', { reason: recusa.motivo }),
                  recusa.arquivos.length > 0
                    ? t('prsTab.mergeRecusadoArquivos', {
                        count: recusa.arquivos.length,
                        files: recusa.arquivos.join(', '),
                      })
                    : null,
                  t('prsTab.mergeResolverAntes'),
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            );
          }
          if (task?.blocked) {
            return (
              <p className={styles.motivoErro} data-testid="aviso-merge-indisponivel">
                {task.blockedReason || !gatePendente
                  ? t('prsTab.mergeIndisponivelBloqueada', {
                      reason: task.blockedReason
                        ? causaDoBloqueio(task, tSessao)
                        : t('prsTab.mergeBlockedFallback'),
                    })
                  : t('prsTab.gatePendenteBloqueada', { gate: gatePendente })}
              </p>
            );
          }
          if (gatePendente) {
            return (
              <p className={styles.motivo} data-testid="aviso-gate-pendente">
                {t('prsTab.gatePendente', { gate: gatePendente })}
              </p>
            );
          }
          if (!latestSession) {
            return (
              <p className={styles.motivo} data-testid="aviso-merge-indisponivel">
                {t('prsTab.mergeIndisponivelSemSessao')}
              </p>
            );
          }
          return null;
        }}
        renderItemExtra={(pr) => {
          if (pr.state !== 'open') return null;

          // RN-816: enquanto o backlog carrega, a coluna das ações tem o lugar
          // reservado (esqueleto) — nem Merge nem portões aparecem antes de a
          // tela saber o estado dos gates, e o que chega depois não empurra a linha.
          if (backlogQuery.isPending) {
            return (
              <div className={styles.reservaDosPortoes} data-testid="reserva-da-esteira" aria-busy="true">
                <Skeleton height="100%" />
              </div>
            );
          }

          const acaoPendente = acaoDaPr(pr);
          if (acaoPendente) {
            return (
              <div className={styles.decisaoInline}>
                <ApprovalCard
                  action={acaoPendente}
                  detalheRecolhido
                  onApprove={() => aprovar(acaoPendente)}
                  onDeny={() => negar(acaoPendente)}
                  onAlwaysAllow={() => sempreAprovar(acaoPendente)}
                />
              </div>
            );
          }

          const task = taskDaBranch(backlogQuery.data, pr.sourceBranch);
          const portoes = portoesDaPr(task, false);
          // RN-1474 (revisa RN-663): sem tarefa não há portão a conferir (a tela
          // não afirma o que não leu), então o Merge segue; com tarefa, só com
          // D, Q e S verdes. Portão pendente ou falho: a ação é a que destrava.
          if (!portoes || portoes.verdes) {
            return (
              <Button
                variant="primary"
                disabled={!latestSession}
                loading={propondo === pr.id}
                title={!latestSession ? t('prsTab.mergeNoSession') : undefined}
                onClick={() => void proporMerge(pr)}
              >
                {t('prsTab.mergeButton')}
              </Button>
            );
          }
          const estacionado = (eventosQuery.data?.items ?? [])
            .map(cicloEstacionado)
            .find((c) => c && c.taskId === task?.id);
          return estacionado ? (
            <RetomarGateEstacionado
              projectId={projectId}
              taskId={estacionado.taskId}
              gate={estacionado.gate}
              podeDecidir={podeDecidir}
              rotulo={t('prsTab.pedirParecer')}
              compacto
            />
          ) : null;
        }}
      />
      <p className={styles.fluxoDaPr} data-testid="fluxo-da-pr">
        <b>{t('prsTab.fluxo.titulo')}</b> {t('prsTab.fluxo.passos')} {t('prsTab.fluxo.mergeManual')}
      </p>
    </div>
  );
}
