import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { BrainIcon } from 'lucide-react';
import {
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from '@/components/shadcn/trace';
import { formatarDuracao } from '../../lib/resumo-de-turno';

/*
 * RN-1392 (AT-958): UMA linha de trabalho por turno. Fechada, diz "Trabalhou 14,0 s · 5 passos";
 * raciocínio, consultas e passos moram dentro. Em curso nasce aberta, sem segundos (não há
 * relógio na tela, só `duracaoMs` do fecho); o brilho do título respeita `prefers-reduced-motion`
 * pelo Shimmer.
 */
export function LinhaDeTrabalho({
  passos,
  duracaoMs = null,
  emCurso = false,
  children,
}: {
  passos: number;
  duracaoMs?: number | null;
  emCurso?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('sessionPage');
  const duracao = emCurso ? null : formatarDuracao(duracaoMs);
  const contagem = [duracao, passos > 0 ? t('turno.passosCount', { count: passos }) : null]
    .filter((p) => p !== null)
    .join(' · ');
  return (
    <TraceCollapsible data-slot="linha-de-trabalho" data-testid="linha-de-trabalho" defaultOpen={emCurso}>
      <TraceCollapsibleTrigger>
        <TraceLine status={emCurso ? 'running' : undefined}>
          <TraceIcon><BrainIcon /></TraceIcon>
          <TraceTitle running={emCurso}>{t(emCurso ? 'turno.trabalhando' : 'turno.trabalhou')}</TraceTitle>
          {contagem !== '' && <TraceDescription>{contagem}</TraceDescription>}
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent>
        <div className="flex flex-col gap-2 pt-2">{children}</div>
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}
