import type { ReactNode } from 'react';
import styles from './CabecalhoDaSecao.module.css';

/** O cabeçalho de seção da v9: título e UMA linha de subtítulo. */
export function CabecalhoDaSecao({ titulo, subtitulo }: { titulo: ReactNode; subtitulo?: ReactNode }) {
  return (
    <div className={styles.cabecalho}>
      <h2 className={styles.titulo}>{titulo}</h2>
      {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
    </div>
  );
}
