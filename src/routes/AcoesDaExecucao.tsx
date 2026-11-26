import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { mensagemDaApi, requestParallelization, unblockTask } from '../lib/api-client';
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '../components/shadcn/item';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Disclosure } from '../components/ui/Disclosure';
import { BloqueioRetomavel } from '../components/BloqueioRetomavel';
import { ACAO_AUMENTAR_O_TETO } from '../lib/explicacao-do-bloqueio';
import { useToast } from '../components/ui/ToastProvider.helpers';
import type { Epic, ProposedAction, SessionEvent } from '../lib/api-types';
import styles from './ProjectOverviewTab.module.css';

type Desbloqueio = { estado: 'em_voo' | 'ok' } | { estado: 'erro'; mensagem: string };

/**
 * AT-894 (RN-1220): "desbloquear tarefa" (RN-835), "aceitar paralelização"
 * (RN-083) e a lista de PRs de dev, trazidos da `ExecutionSection` da Visão
 * geral para Trabalho › Execução. As duas ações pedem `developer` no endpoint
 * (RN-102), vindo em `podeDecidir`. A cópia da Visão geral sai na AT-890.
 */
export function AcoesDaExecucao({
  projectId,
  sessionId,
  events,
  podeDecidir,
  epics,
  acoes,
}: {
  projectId: string;
  sessionId: string;
  epics: Epic[] | undefined;
  /** Ações do PROJETO que a aba já lê (nenhuma requisição a mais, RN-632): só as pendentes. */
  acoes: ProposedAction[];
  events: SessionEvent[];
  podeDecidir: boolean;
}) {
  const { t } = useTranslation('executors');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [desbloqueio, setDesbloqueio] = useState<Record<string, Desbloqueio>>({});

  const bloqueadas = (epics ?? []).flatMap((epic) =>
    epic.stories.flatMap((story) =>
      story.tasks
        .filter((x) => x.blocked && !x.archivedAt)
        .map((x) => ({ id: x.id, title: x.title, storyTitle: story.title, tarefa: x })),
    ),
  );

  const aceitos = new Set(
    events
      .filter((e) => e.type === 'execution.parallelization_accepted')
      .map((e) => (e.payload as { module?: string }).module),
  );
  const sugestoes = events
    .filter((e) => e.type === 'execution.parallelization_suggested')
    .map((e) => (e.payload as { module?: string }).module)
    .filter((m): m is string => !!m && !aceitos.has(m));

  const prs = acoes
    .filter((a) => a.actionType === 'pr_open')
    .map((a) => ({
      id: a.id,
      status: a.status,
      url: (a.executionResult as { pullRequestUrl?: string } | null)?.pullRequestUrl ?? null,
    }));

  async function desbloquear(taskId: string, orientacao: string) {
    if (desbloqueio[taskId]?.estado === 'em_voo') return;
    setDesbloqueio((d) => ({ ...d, [taskId]: { estado: 'em_voo' } }));
    try {
      await unblockTask(projectId, sessionId, taskId, orientacao);
      setDesbloqueio((d) => ({ ...d, [taskId]: { estado: 'ok' } }));
      await queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
    } catch (erro) {
      const mensagem = mensagemDaApi(erro, t('acoes.unblockError'));
      setDesbloqueio((d) => ({ ...d, [taskId]: { estado: 'erro', mensagem } }));
      showToast({ title: t('acoes.errorTitle'), message: mensagem, tone: 'danger' });
    }
  }

  async function aceitar(module: string) {
    try {
      const r = await requestParallelization(projectId, sessionId, module);
      await queryClient.invalidateQueries({ queryKey: ['session-events', projectId, sessionId] });
      // Acima do teto NADA subiu (RN-083): a tela não pode dizer que o agente entrou.
      if (r.estado === 'aguardando_autorizacao') {
        showToast({
          title: t('acoes.authorizationNeededTitle'),
          message: t('acoes.authorizationNeededMessage', { count: r.ativosNaSessao, max: r.maxParallel }),
          tone: 'warning',
        });
      } else if (r.estado === 'recusado') {
        showToast({ title: t('acoes.requestDeniedTitle'), message: r.motivo, tone: 'danger' });
      }
    } catch {
      showToast({ title: t('acoes.errorTitle'), message: t('acoes.requestError'), tone: 'danger' });
    }
  }

  return (
    <div className={styles.arch} data-testid="acoes-da-execucao">
      {/* AT-1007 (RN-1491): recolhida numa linha com a contagem; a página cabe em 925 px. */}
      <Disclosure
        titulo={t('secoes.acoes.titulo')}
        trailing={
          <span className={styles.sectionSub}>
            {[
              t('secoes.acoes.bloqueadas', { count: bloqueadas.length }),
              ...(sugestoes.length > 0 ? [t('secoes.acoes.sugestoes', { count: sugestoes.length })] : []),
              t('secoes.acoes.prs', { count: prs.length }),
              t('secoes.ver'),
            ].join(' · ')}
          </span>
        }
      >
      {bloqueadas.length > 0 && (
        <>
          <div className={styles.archLabel}>
            {t('acoes.blockedTasksLabel')}
            <Badge tone="danger">{bloqueadas.length}</Badge>
          </div>
          <ItemGroup className={styles.pendList}>
            {bloqueadas.map((b) => {
              const d = desbloqueio[b.id];
              return (
                <Item key={b.id} variant="outline" size="sm" className={styles.pendItem}>
                  <ItemContent>
                    <ItemTitle className={styles.pendTitle}>
                      {b.title} <span className={styles.moduleStack}>({b.storyTitle})</span>
                    </ItemTitle>
                    {d?.estado === 'ok' ? null : (
                      <BloqueioRetomavel
                        tarefa={b.tarefa}
                        podeDecidir={podeDecidir}
                        enviando={d?.estado === 'em_voo'}
                        aoRetomar={(orientacao) => void desbloquear(b.id, orientacao)}
                        acoesOcultas={[ACAO_AUMENTAR_O_TETO]}
                      />
                    )}
                    {d?.estado === 'erro' && (
                      <span role="alert" className={styles.pendReason}>
                        {d.mensagem}
                      </span>
                    )}
                  </ItemContent>
                  {d?.estado === 'ok' && (
                    <ItemActions>
                      <span role="status" data-testid="desbloqueada">
                        {t('acoes.unblockedTitle')}
                      </span>
                    </ItemActions>
                  )}
                </Item>
              );
            })}
          </ItemGroup>
        </>
      )}

      {sugestoes.map((module) => (
        <Item key={module} variant="outline" size="sm" className={styles.suggestion}>
          <ItemContent>
            <span>
              {t('acoes.suggestionBefore')}
              <strong>{module}</strong>
              {t('acoes.suggestionAfter')}
            </span>
          </ItemContent>
          <ItemActions>
            <Button variant="secondary" legenda={t('acoes.accept')} disabled={!podeDecidir} onClick={() => aceitar(module)}>
              <ThumbsUp aria-hidden="true" />
            </Button>
          </ItemActions>
        </Item>
      ))}

      <div className={styles.archLabel}>{t('acoes.pullRequestsLabel')}</div>
      {prs.length === 0 ? (
        <div className={styles.sectionSub}>{t('acoes.noPullRequests')}</div>
      ) : (
        <ItemGroup className={styles.adrList}>
          {prs.map((pr) => (
            <Item key={pr.id} size="xs" className={styles.adrItem}>
              <Badge tone={pr.status === 'executed' ? 'success' : 'warning'}>{pr.status}</Badge>
              {pr.url ? (
                <a href={pr.url} target="_blank" rel="noreferrer" className={styles.adrLink}>
                  {pr.url}
                </a>
              ) : (
                <span>{t('acoes.pullRequestFallback')}</span>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}
      </Disclosure>
    </div>
  );
}
