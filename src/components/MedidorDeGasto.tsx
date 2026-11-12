import { useTranslation } from 'react-i18next';
import { usdFmt } from '../lib/currency';
import { tokenThreshold } from './TokenMeter.helpers';
import type { Budget } from '../lib/api-types';
import styles from './MedidorDeGasto.module.css';

const COR = { ok: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' } as const;

/**
 * O gasto do mês do projeto no cabeçalho (AT-888, RN-1210). `budget === null`
 * é "sem teto" confirmado (barra neutra), nunca "0/0". A previsão só aparece
 * quando a api a deu (`periodo`): a tela não estima sem fonte.
 */
export function MedidorDeGasto({ budget, onDefinir }: { budget: Budget | null; onDefinir?: () => void }) {
  const { t } = useTranslation('projectPage');
  if (!budget) {
    return (
      <div className={styles.medidor} data-testid="medidor-de-gasto" data-threshold="none">
        <span className={styles.linha}>
          <span>{t('medidor.semTeto')}</span>
          {onDefinir && (
            <button type="button" className={styles.definir} onClick={onDefinir}>
              {t('medidor.definir')}
            </button>
          )}
        </span>
        <span className={styles.trilho} />
      </div>
    );
  }
  const pct = budget.limitMicros > 0 ? Math.min(999, Math.round((budget.spentMicros / budget.limitMicros) * 100)) : 0;
  const nivel = tokenThreshold(pct);
  return (
    <div className={styles.medidor} data-testid="medidor-de-gasto" data-threshold={nivel}>
      <span className={styles.linha}>
        <span>
          {t('medidor.gasto', {
            gasto: usdFmt.format(budget.spentMicros / 1_000_000),
            teto: usdFmt.format(budget.limitMicros / 1_000_000),
          })}
        </span>
        <span style={{ color: COR[nivel] }}>{pct}%</span>
      </span>
      <span className={styles.trilho}>
        <span className={styles.barra} style={{ width: `${Math.min(100, pct)}%`, background: COR[nivel] }} />
      </span>
      {budget.periodo && (
        <span className={styles.previsao}>
          {t('medidor.previsao', {
            valor: usdFmt.format(budget.periodo.previsaoMicros / 1_000_000),
            count: budget.periodo.diasRestantes,
          })}
        </span>
      )}
    </div>
  );
}
