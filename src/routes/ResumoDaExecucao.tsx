import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listAgentAreas } from '../lib/api-client';
import { AREAS } from '../lib/agent-areas.generated';
import { nomeDoAgente } from '../lib/agents';
import type { RosterGroup } from '../lib/agent-status';
import { formatMicros } from '../lib/execution';
import { filaDeTarefas } from '../lib/trabalho-v9';
import { tarefasSemModulo } from '../lib/prontas-e-bloqueadas';
import type { Epic } from '../lib/api-types';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { AtivarExecucao } from '../components/AtivarExecucao';
import styles from './ProjectOverviewTab.module.css';

const LINHAS_DA_FILA = 3;

/**
 * AT-894 (RN-1220): o topo de Trabalho › Execução da v9. Cartão de chamada com a
 * execução parada (o que acontece ao ativar e o teto do projeto, SEM estimativa
 * de custo: AT-883 #21), uma linha por área executora com o paralelismo
 * `ativos / maxParallel` e a fila de tarefas.
 */
export function ResumoDaExecucao({
  projectId,
  epics,
  parada,
  grupos,
  budget,
}: {
  projectId: string;
  epics: Epic[] | undefined;
  parada: boolean;
  grupos: RosterGroup[];
  budget: { limitMicros: number; spentMicros: number } | null | undefined;
}) {
  const { t } = useTranslation('executors');
  const { data: areas } = useQuery({
    queryKey: ['agent-areas', projectId],
    queryFn: () => listAgentAreas(projectId),
    // Só com a execução parada (o cartão precisa do teto): parada ou não, nenhuma leitura nova com a execução de pé (RN-632).
    enabled: parada,
  });
  const fila = filaDeTarefas(epics);
  const semModulo = tarefasSemModulo(epics).length;
  const maxDev = areas?.find((a) => a.key === 'dev')?.maxParallel;

  // Dev agents são solos (`dev-<módulo>`); QA é a área com membros.
  const linhas = [
    {
      key: 'dev',
      ativos: grupos.filter((g) => g.kind === 'solo' && g.entry.status === 'trabalhando').length,
      membros: grupos.filter((g) => g.kind === 'solo').length,
    },
    ...grupos.flatMap((g) =>
      g.kind === 'area'
        ? [
            {
              key: g.areaKey,
              ativos: [g.lead, ...g.members].filter((m) => m.status === 'trabalhando').length,
              membros: g.members.length + 1,
            },
          ]
        : [],
    ),
  ];

  return (
    <div className={styles.arch} data-testid="resumo-da-execucao">
      {parada && (
        <Card radius="md" padding="sm" data-testid="cartao-de-chamada">
          <div className={styles.archLabel}>{t('chamada.title', { count: fila.prontas.length })}</div>
          <p className={styles.sectionSub}>{t('chamada.explain', { count: maxDev ?? 0 })}</p>
          {budget && (
            <p className={styles.sectionSub}>{t('chamada.teto', { valor: formatMicros(budget.limitMicros) })}</p>
          )}
          <AtivarExecucao projectId={projectId} />
        </Card>
      )}

      <div className={styles.archLabel}>{t('areas.title')}</div>
      {linhas.map((l) => (
        <div key={l.key} data-testid={`linha-da-area-${l.key}`} className={styles.sectionSub}>
          <strong>{AREAS[l.key]?.label ?? l.key}</strong>{' '}
          <Badge tone={l.ativos > 0 ? 'success' : 'neutral'}>
            {t(l.ativos > 0 ? 'areas.working' : 'areas.stopped')}
          </Badge>{' '}
          {l.key === 'dev' && maxDev !== undefined
            ? t('areas.parallelism', { ativos: l.ativos, max: maxDev })
            : null}{' '}
          {t('areas.lead', { nome: nomeDoAgente(AREAS[l.key]?.lead) })} · {t('areas.members', { count: l.membros })}
        </div>
      ))}

      <div className={styles.archLabel}>{t('fila.title')}</div>
      <div className={styles.sectionSub} data-testid="fila-de-tarefas">
        {t('fila.ready', { count: fila.prontas.length })} · {t('fila.running', { count: fila.rodando.length })} ·{' '}
        {t('fila.blocked', { count: fila.bloqueadas.length })}
        {semModulo > 0 && <> · {t('fila.semModulo', { count: semModulo })}</>}
      </div>
      {[...fila.rodando, ...fila.prontas, ...fila.bloqueadas].slice(0, LINHAS_DA_FILA).map(({ task }) => (
        <div key={task.id} className={styles.sectionSub}>
          {task.title}
        </div>
      ))}
      {fila.prontas.length + fila.rodando.length + fila.bloqueadas.length > LINHAS_DA_FILA && (
        <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: 'backlog' }} className={styles.adrLink}>
          {t('fila.more', {
            count: fila.prontas.length + fila.rodando.length + fila.bloqueadas.length - LINHAS_DA_FILA,
          })}
        </Link>
      )}
    </div>
  );
}
