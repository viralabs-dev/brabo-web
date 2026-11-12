import { useTranslation } from 'react-i18next';
import { type GravadoNoTurno, formatarCusto } from '../lib/resumo-de-turno';

interface Props {
  agente: string;
  passos: number;
  gravado: GravadoNoTurno | null;
  custo: number | null;
  hora?: string;
}

/** AT-891: a linha de um turno (agente, passos, gravado, custo, hora). */
export function ResumoDeTurno({ agente, passos, gravado, custo, hora }: Props) {
  const { t } = useTranslation('sessionPage');
  const gravadoTxt = gravado
    ? gravado.itens.map((i) => `${t(`resumo.tipos.${i.tipo}`, { defaultValue: i.tipo })} ×${i.total}`).join(', ')
    : null;
  return (
    <div data-testid="resumo-de-turno" className="flex flex-wrap gap-x-2 text-[length:var(--fs-meta)] text-muted-foreground">
      <span>{agente}</span>
      <span>{t('turno.passosCount', { count: passos })}</span>
      {gravadoTxt && <span>{t('resumo.gravado', { itens: gravadoTxt })}</span>}
      <span>{formatarCusto(custo)}</span>
      {hora && <span>{hora}</span>}
    </div>
  );
}
