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
  // v9: linha compacta — as 2 mais novas e tudo o que NÃO foi automático; o resto das
  // automáticas colapsa em "N decisões automáticas anteriores" (sem leitura nova: é a mesma lista).
  const hora = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const visiveis = janela === '24h' ? itens.filter((a, i) => i < 2 || a.status !== 'auto_approved') : itens;
  const anteriores = itens.length - visiveis.length;

  return (
    <div className={styles.section} data-testid="decididas-recentemente">
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>{t('approvalsTab.decided.title')}</h2>
        <span className={styles.eyebrow}>{t(`approvalsTab.decided.eyebrow_${janela}`)}</span>
        <span className={styles.espacador} />
        {janela === '24h' && anteriores === 0 && (
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
        <ul className={styles.decididas}>
          {visiveis.map((a) => {
            const quem = AGENTS[a.actor.id as keyof typeof AGENTS]?.name ?? a.actor.id;
            return (
              <li key={a.id} data-testid="acao-decidida" className={styles.linhaDecidida}>
                <span className={styles.pontoDecidida} data-tom={TOM[a.status as keyof typeof TOM] ?? 'warning'} aria-hidden="true" />
                <span className={styles.fraseDecidida}>
                  <b>{quem}</b> {verboDaAcao(a.actionType, a.status)}
                  {a.status === 'denied' && a.rejectionReason && (
                    <> · {t('approvalsTab.decided.reason', { reason: a.rejectionReason })}</>
                  )}
                </span>
                {a.status === 'auto_approved' ? (
                  <Badge tone="success">{t('approvalsTab.decided.chipAuto')}</Badge>
                ) : (
                  <Badge square tone={TOM[a.status as keyof typeof TOM] ?? 'warning'}>
                    {t(`approvalsTab.decided.status.${a.status}`)}
                  </Badge>
                )}
                {a.decidedAt && (
                  <span className={styles.eyebrow}>{hora.format(new Date(a.decidedAt))}</span>
                )}
              </li>
            );
          })}
          {anteriores > 0 && (
            <li data-testid="decididas-anteriores" className={styles.linhaDecidida}>
              <span className={styles.pontoDecidida} data-tom="muted" aria-hidden="true" />
              <span className={styles.fraseDecidida}>
                {t('approvalsTab.decided.earlierAuto', { count: anteriores })}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setJanela('30d')}>
                {t('approvalsTab.decided.seeAllLower')}
              </Button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
