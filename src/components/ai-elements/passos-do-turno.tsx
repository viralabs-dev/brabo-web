import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '../ui/SegmentedControl';
import { agruparPorIntencao, maisUsadas } from '../../lib/grupos-de-ferramenta';
import type { PassoDeFerramenta } from '../../lib/passos-do-turno';
import { formatarCusto, formatarDuracao } from '../../lib/resumo-de-turno';
import { ChainOfThought } from './chain-of-thought';
import { Tool } from './tool';

/* RN-974/RN-1185: passos do turno ENCERRADO; nunca os args (RN-096). */
export function PassosDoTurno({ passos, custo = null, duracaoMs = null }: { passos: PassoDeFerramenta[]; custo?: number | null; duracaoMs?: number | null }) {
  const { t } = useTranslation('sessionPage');
  const [modo, setModo] = useState<'agrupados' | 'ordem'>('agrupados');
  const chips = maisUsadas(passos).map((c) => `${c.tool} ×${c.vezes}`).join(' · ');
  const passo = (f: PassoDeFerramenta) => (
    <Tool
      key={f.id}
      titulo={f.tool}
      estado={f.ok ? undefined : 'error'}
      saida={f.ok ? f.resultado : undefined}
      erro={f.ok ? undefined : (f.resultado ?? t('turno.ferramentaFalhou'))}
      avisoDeTruncada={f.truncado ? t('turno.resultadoCortado') : undefined}
    />
  );
  return (
    <div data-testid="passos-do-turno-encerrado">
      <ChainOfThought
        titulo={t('turno.passosDoTurno')}
        contagem={`${t('turno.passosCount', { count: passos.length })} · ${chips} · ${formatarCusto(custo)}${duracaoMs === null ? '' : ` · ${formatarDuracao(duracaoMs)}`}`}
      >
        <SegmentedControl
          rotulo={t('turno.visao')}
          valor={modo}
          onChange={setModo}
          opcoes={[
            { valor: 'agrupados', rotulo: t('turno.agrupados') },
            { valor: 'ordem', rotulo: t('turno.emOrdem') },
          ]}
        />
        {modo === 'ordem'
          ? passos.map(passo)
          : agruparPorIntencao(passos).map((g) => (
              <section key={g.grupo} data-testid={`grupo-${g.grupo}`}>
                <h4 className="text-[length:var(--fs-label)] text-muted-foreground">
                  {t(`turno.grupos.${g.grupo}`)} · {g.itens.length}
                </h4>
                {g.itens.map(passo)}
              </section>
            ))}
      </ChainOfThought>
    </div>
  );
}
