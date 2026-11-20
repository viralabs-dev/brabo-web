import { useTranslation } from 'react-i18next';
import type { ChaveDoPortao, EstadoDoPortao } from '../lib/portoes-da-pr';
import styles from './PortoesDaPr.module.css';

const LETRA: Record<ChaveDoPortao, string> = { dev: 'D', qa: 'Q', secops: 'S', user: 'V' };

/** D — Q — S — V em linha, cada um com a cor do estado (AT-971, RN-1474). */
export function PortoesDaPr({
  portoes,
}: {
  portoes: { chave: ChaveDoPortao; estado: EstadoDoPortao }[];
}) {
  const { t } = useTranslation('approvals');
  return (
    <ol className={styles.linha} aria-label={t('prsTab.portoes.rotulo')} data-testid="portoes-da-pr">
      {portoes.map((p, i) => (
        <li key={p.chave} className={styles.item}>
          {i > 0 && <span className={styles.liga} aria-hidden="true" />}
          <span
            className={[styles.portao, styles[p.estado]].join(' ')}
            data-estado={p.estado}
            title={`${t(`prsTab.portoes.nome.${p.chave}`)}: ${t(`prsTab.portoes.estado.${p.estado}`)}`}
            aria-label={`${t(`prsTab.portoes.nome.${p.chave}`)}: ${t(`prsTab.portoes.estado.${p.estado}`)}`}
          >
            {LETRA[p.chave]}
          </span>
        </li>
      ))}
    </ol>
  );
}
