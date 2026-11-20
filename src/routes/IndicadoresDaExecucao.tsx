import { useTranslation } from 'react-i18next';
import type { AgentTokenUsage, Epic } from '../lib/api-types';
import { filaDeTarefas } from '../lib/trabalho-v9';
import { contarTarefas } from '../lib/execucao-tabela';
import { dolar } from '../lib/executores-ao-vivo';
import type { EstadoDaTarefa } from '../lib/execution';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Progress } from '@/components/shadcn/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import styles from './IndicadoresDaExecucao.module.css';

const ESTADO_TOM: Record<EstadoDaTarefa, BadgeTone> = {
  blocked: 'danger',
  todo: 'muted',
  in_progress: 'warning',
  in_review: 'accent',
  done: 'success',
};

/**
 * AT-970 (RN-1468): os três indicadores no topo da aba Execução. Cada número vem do que a tela
 * leu (backlog em cache, custo da sessão): sem leitura, "—", nunca um zero inventado. A fila
 * detalhada abre no Popover do indicador Fila, no lugar das seções "Áreas" e "Fila de tarefas".
 */
export function IndicadoresDaExecucao({
  epics,
  tokenUsage,
}: {
  epics: Epic[] | undefined;
  tokenUsage: AgentTokenUsage[] | undefined;
}) {
  const { t } = useTranslation('executors');
  const tarefas = contarTarefas(epics);
  const fila = filaDeTarefas(epics);
  const lista = [...fila.rodando, ...fila.prontas, ...fila.bloqueadas];
  const gasto = tokenUsage?.reduce((soma, u) => soma + u.costMicros, 0);
  const partes = epics
    ? [
        t('fila.ready', { count: fila.prontas.length }),
        ...(fila.bloqueadas.length > 0 ? [t('fila.blocked', { count: fila.bloqueadas.length })] : []),
      ]
    : [];

  return (
    <div className={styles.indicadores} data-testid="indicadores-da-execucao">
      <Card radius="md" padding="sm" data-testid="indicador-tarefas">
        <span className={styles.rotulo}>{t('indicadores.tarefas')}</span>
        <strong className={styles.valor}>
          {tarefas ? t('indicadores.nDeM', { n: tarefas.feitas, m: tarefas.total }) : '—'}
        </strong>
        {tarefas && tarefas.total > 0 && (
          <Progress value={Math.round((tarefas.feitas / tarefas.total) * 100)} aria-label={t('indicadores.tarefas')} />
        )}
      </Card>

      <Card radius="md" padding="sm" data-testid="indicador-fila">
        <span className={styles.rotulo}>{t('indicadores.fila')}</span>
        <strong className={styles.valor}>{epics ? partes.join(' · ') : '—'}</strong>
        <span className={styles.nota}>
          {epics ? t('fila.running', { count: fila.rodando.length }) : ''}
        {lista.length > 0 && (
          <Popover>
            <PopoverTrigger className={styles.abrir}>{t('indicadores.verFila')}</PopoverTrigger>
            <PopoverContent align="start" className={styles.popover}>
              <table className={styles.tabela} data-testid="fila-detalhada">
                <tbody>
                  {lista.map(({ task, estado }) => (
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
                </tbody>
              </table>
            </PopoverContent>
          </Popover>
        )}
        </span>
      </Card>

      <Card radius="md" padding="sm" data-testid="indicador-gasto">
        <span className={styles.rotulo}>{t('indicadores.gasto')}</span>
        <strong className={styles.valor}>{gasto !== undefined ? dolar(gasto) : '—'}</strong>
      </Card>
    </div>
  );
}
