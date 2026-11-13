import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { listAgentAreas } from '../lib/api-client';
import { AREAS } from '../lib/agent-areas.generated';
import { corDoAgente, nomeDoAgente } from '../lib/agents';
import type { RosterGroup } from '../lib/agent-status';
import { formatMicros } from '../lib/execution';
import { filaDeTarefas } from '../lib/trabalho-v9';
import { tarefasSemModulo } from '../lib/prontas-e-bloqueadas';
import type { Epic } from '../lib/api-types';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import type { EstadoDaTarefa } from '../lib/execution';
import { Card } from '../components/ui/Card';
import { AtivarExecucao } from '../components/AtivarExecucao';
import styles from './ResumoDaExecucao.module.css';

const LINHAS_DA_FILA = 3;

const ESTADO_TOM: Record<EstadoDaTarefa, BadgeTone> = {
  blocked: 'danger',
  todo: 'muted',
  in_progress: 'warning',
  in_review: 'accent',
  done: 'success',
};

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
  // v9 (AT-943): um cartão por área EXECUTORA. Com a leitura (execução parada) a lista é a da api,
  // com os membros dela; com a execução de pé, o roster como antes (RN-632/794: sem leitura nova).
  const cartoes = areas
    ? areas.map((a) => ({
        key: a.key,
        ativos: linhas.find((l) => l.key === a.key)?.ativos ?? 0,
        membros: a.members.length,
        max: a.maxParallel,
      }))
    : linhas.map((l) => ({ ...l, max: undefined as number | undefined }));
  const total = fila.prontas.length + fila.rodando.length + fila.bloqueadas.length;
  const visiveis = [...fila.rodando, ...fila.prontas, ...fila.bloqueadas].slice(0, LINHAS_DA_FILA);

  return (
    <div className={styles.resumo} data-testid="resumo-da-execucao">
      {parada && (
        <Card radius="md" padding="sm" data-testid="cartao-de-chamada">
          <h3 className={styles.titulo}>{t('chamada.title', { count: fila.prontas.length })}</h3>
          <p className={styles.nota}>{t('chamada.explain', { count: maxDev ?? 0 })}</p>
          {budget && (
            <p className={styles.nota}>{t('chamada.teto', { valor: formatMicros(budget.limitMicros) })}</p>
          )}
          <AtivarExecucao projectId={projectId} />
        </Card>
      )}

      <h3 className={styles.titulo}>{t('areas.title')}</h3>
      <div className={styles.areas}>
        {cartoes.map((c) => {
          const lead = AREAS[c.key]?.lead;
          const nome = AREAS[c.key]?.label ?? c.key;
          return (
            <Card key={c.key} radius="md" padding="sm" data-testid={`linha-da-area-${c.key}`}>
              <div className={styles.areaTopo}>
                <span className={styles.inicial} style={corDoAgente(lead)} aria-hidden="true">
                  {nome.charAt(0)}
                </span>
                <strong>{nome}</strong>
                <Badge dot tone={c.ativos > 0 ? 'success' : 'neutral'}>
                  {t(c.ativos > 0 ? 'areas.working' : 'areas.stopped')}
                </Badge>
              </div>
              {c.max !== undefined && (
                <div className={styles.areaLinha}>
                  <span>{t('areas.parallelismLabel')}</span>
                  <span className={styles.mono}>{c.ativos} / {c.max}</span>
                </div>
              )}
              <div className={styles.areaLinha}>
                <span>{t('areas.leadLabel')}</span>
                <span>
                  {nomeDoAgente(lead)} · {c.membros > 0 ? t('areas.members', { count: c.membros }) : t('areas.semMembros')}
                </span>
              </div>
              {c.key === 'dev' && c.membros === 0 && <p className={styles.nota}>{t('areas.devNasce')}</p>}
            </Card>
          );
        })}
      </div>

      <div className={styles.tituloLinha}>
        <h3 className={styles.titulo}>{t('fila.title')}</h3>
        <span className={styles.nota} data-testid="fila-de-tarefas">
          {t('fila.ready', { count: fila.prontas.length })} · {t('fila.running', { count: fila.rodando.length })} ·{' '}
          {t('fila.blocked', { count: fila.bloqueadas.length })}
          {semModulo > 0 && <> · {t('fila.semModulo', { count: semModulo })}</>}
        </span>
      </div>
      <table className={styles.fila}>
        <tbody>
          {visiveis.map(({ task, estado }) => (
            <tr key={task.id}>
              <td>{task.title}</td>
              <td>{task.module && <Badge tone="neutral">{task.module}</Badge>}</td>
              <td>
                <Badge dot tone={ESTADO_TOM[estado]}>
                  {t(`fila.estado.${estado}`)}
                </Badge>
              </td>
            </tr>
          ))}
          {total > LINHAS_DA_FILA && (
            <tr>
              <td colSpan={3}>
                <div className={styles.rodape}>
                <span>{t('fila.more', { count: total - LINHAS_DA_FILA })}</span>
                <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: 'backlog' }} className={styles.link}>
                  {t('fila.verNoBacklog')}
                </Link>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
