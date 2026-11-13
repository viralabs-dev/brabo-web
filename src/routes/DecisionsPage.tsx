import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CabecalhoDePagina } from '../components/shadcn/cabecalho-de-pagina';
import { CaixaDeDecisoes } from '../components/CaixaDeDecisoes';
import { Button } from '../components/ui/Button';
import { Shimmer } from '../components/ui/Shimmer';
import { useCurrentWorkspace, useDecisionInbox } from '../lib/hooks';
import styles from '../components/CaixaDeDecisoes.module.css';

/** S07: a Caixa de decisões global, com o seletor Pendentes | Decididas (decididas: janela de 24 h da api). */
export function DecisionsPage() {
  const { t } = useTranslation('decisions');
  const { data: workspace } = useCurrentWorkspace();
  const [modo, setModo] = useState<'pending' | 'decided'>('pending');
  const inbox = useDecisionInbox(workspace?.id, modo);

  return (
    <div className={styles.pagina}>
      <CabecalhoDePagina
        titulo={t('titulo')}
        acoes={
          <div className={styles.seletor} role="group" aria-label={t('seletor')}>
            {(['pending', 'decided'] as const).map((m) => (
              <Button key={m} size="sm" variant={modo === m ? 'secondary' : 'ghost'} aria-pressed={modo === m} onClick={() => setModo(m)}>
                {t(`modo.${m}`)}
              </Button>
            ))}
          </div>
        }
      />
      <p className={styles.intro}>{t('subtitulo')}</p>
      {inbox.isError && <p role="alert">{t('erro')}</p>}
      {!inbox.data && !inbox.isError && <Shimmer>{t('carregando')}</Shimmer>}
      {inbox.data && workspace && <CaixaDeDecisoes workspaceId={workspace.id} inbox={inbox.data} modo={modo} />}
    </div>
  );
}
