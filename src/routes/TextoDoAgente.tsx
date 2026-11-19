import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SessionPage.module.css';

/**
 * AT-959: o turno antigo fica em 3 linhas (`line-clamp` por CSS, o próprio
 * texto, sem resumo); o texto inteiro segue no DOM. A última resposta não passa
 * por aqui recolhida (RN-138).
 */
export function TextoDoAgente({ recolhivel, children }: { recolhivel: boolean; children: ReactNode }) {
  const { t } = useTranslation('sessionPage');
  const [aberto, setAberto] = useState(false);
  const recolhido = recolhivel && !aberto;
  return (
    <div className={styles.textoDoAgente}>
      <div className={recolhido ? styles.textoRecolhido : undefined} data-recolhido={recolhido || undefined}>
        {children}
      </div>
      {recolhivel && (
        <button type="button" className={styles.verRespostaInteira} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
          {aberto ? t('fio.recolherResposta') : t('fio.verRespostaInteira')}
        </button>
      )}
    </div>
  );
}
