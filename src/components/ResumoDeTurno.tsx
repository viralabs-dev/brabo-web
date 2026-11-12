import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type GravadoNoTurno, formatarCusto } from '../lib/resumo-de-turno';
import styles from './ResumoDeTurno.module.css';

interface Props {
  agente: string;
  passos: number;
  gravado: GravadoNoTurno | null;
  custo: number | null;
  hora?: string;
  /** Com filhos, a linha expande no lugar (turno anterior ao aberto). */
  children?: ReactNode;
}

/** AT-891: a linha de um turno (agente, passos, gravado, custo, hora). */
export function ResumoDeTurno({ agente, passos, gravado, custo, hora, children }: Props) {
  const { t } = useTranslation('sessionPage');
  const gravadoTxt = gravado
    ? gravado.itens.map((i) => `${t(`resumo.tipos.${i.tipo}`, { defaultValue: i.tipo })} ×${i.total}`).join(', ')
    : null;
  const linha = (
    <>
      <span>{agente}</span>
      <span>{t('turno.passosCount', { count: passos })}</span>
      {gravadoTxt && <span>{t('resumo.gravado', { itens: gravadoTxt })}</span>}
      <span>{formatarCusto(custo)}</span>
      {hora && <span>{hora}</span>}
    </>
  );
  if (!children) return <div data-testid="resumo-de-turno" className={styles.resumo}>{linha}</div>;
  return (
    <details data-testid="resumo-de-turno">
      <summary className={styles.resumo}>{linha}</summary>
      {children}
    </details>
  );
}
