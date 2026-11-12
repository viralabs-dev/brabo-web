import type { ReactNode } from 'react';
import styles from './LinhaDeConfiguracao.module.css';

/** A linha da v9: rótulo e descrição à esquerda, o controle à direita. */
export function LinhaDeConfiguracao({
  rotulo,
  descricao,
  children,
}: {
  rotulo: ReactNode;
  descricao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.linha} role="group">
      <div className={styles.texto}>
        <div className={styles.rotulo}>{rotulo}</div>
        {descricao && <div className={styles.descricao}>{descricao}</div>}
      </div>
      <div className={styles.controle}>{children}</div>
    </div>
  );
}
