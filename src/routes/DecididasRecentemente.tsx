import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProjectDecidedActions, type JanelaDeDecididas } from '../lib/decididas-queries';
import { verboDaAcao } from '../lib/aprovacoes';
import { AGENTS } from '../lib/agents';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import styles from './ProjectApprovalsTab.module.css';

const TOM = {
  approved: 'success',
  auto_approved: 'success',
  executed: 'success',
  denied: 'warning',
  failed: 'danger',
} as const;

/** "Decididas recentemente" (AT-895, RN-1225): o que saiu da fila, sem somar com ela (RN-467). */
export function DecididasRecentemente({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation('approvals');
  const [janela, setJanela] = useState<JanelaDeDecididas>('24h');
  const query = useProjectDecidedActions(projectId, janela);
  const itens = query.data ?? [];
  const quando = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className={styles.section} data-testid="decididas-recentemente">
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>{t('approvalsTab.decided.title')}</h2>
        <span className={styles.eyebrow}>{t(`approvalsTab.decided.eyebrow_${janela}`)}</span>
        <span className={styles.espacador} />
        {janela === '24h' && (
          <Button variant="ghost" size="sm" onClick={() => setJanela('30d')}>
            {t('approvalsTab.decided.seeAll')}
          </Button>
        )}
      </div>
      {query.isError ? (
        <ErroDeCarregamento
          titulo={t('approvalsTab.decided.error')}
          erro={query.error}
          onTentarDeNovo={() => void query.refetch()}
        />
      ) : query.data === undefined ? (
        <p className={styles.subtitle}>{t('approvalsTab.genericLoading')}</p>
      ) : itens.length === 0 ? (
        <EmptyState>{t(`approvalsTab.decided.empty_${janela}`)}</EmptyState>
      ) : (
        <ul className={styles.queue} style={{ listStyle: 'none', padding: 0 }}>
          {itens.map((a) => {
            const quem = AGENTS[a.actor.id as keyof typeof AGENTS]?.name ?? a.actor.id;
            return (
              <li key={a.id} data-testid="acao-decidida">
                <Badge square tone={TOM[a.status as keyof typeof TOM] ?? 'warning'}>
                  {t(`approvalsTab.decided.status.${a.status}`)}
                </Badge>{' '}
                <b>{quem}</b> {verboDaAcao(a.actionType, a.status)}
                {a.status === 'auto_approved' && <> · {t('approvalsTab.decided.byPolicy')}</>}
                {a.status === 'denied' && a.rejectionReason && (
                  <> · {t('approvalsTab.decided.reason', { reason: a.rejectionReason })}</>
                )}
                {a.decidedAt && (
                  <>
                    {' · '}
                    <span className={styles.eyebrow}>{quando.format(new Date(a.decidedAt))}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
