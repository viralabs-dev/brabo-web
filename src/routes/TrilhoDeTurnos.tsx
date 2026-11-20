import { useTranslation } from 'react-i18next';
import type { ProposedAction, SessionEvent } from '../lib/api-types';
import { corDoAgente } from '../lib/agents';
import { pontosDoTrilho } from '../lib/trilho-de-turnos';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../components/shadcn/hover-card';
import styles from './SessionPage.module.css';

/** O trilho de turnos de 28 px à direita do fio. Sem leitura nova: só os eventos já baixados (RN-632). */
export function TrilhoDeTurnos({
  events,
  actions,
  noInicioDaSessao,
}: {
  events: readonly SessionEvent[];
  actions: readonly ProposedAction[];
  /** `false` quando a janela de eventos não começa no primeiro: o trilho diz que mostra só o carregado. */
  noInicioDaSessao: boolean;
}) {
  const { t } = useTranslation('sessionPage');
  const pontos = pontosDoTrilho(events, actions);
  if (pontos.length < 2) return null;
  return (
    <div className={styles.trilhoAncora}>
      <nav className={styles.trilho} aria-label={t('trilho.rotulo')} data-testid="trilho-de-turnos">
        {!noInicioDaSessao && <span className={styles.trilhoRecorte} title={t('trilho.recorte')}>…</span>}
        {pontos.map((p, i) => {
          const nome = p.agente ? p.rotulo : t('trilho.voce');
          return (
            <HoverCard key={p.id}>
              <HoverCardTrigger
                render={<button type="button" />}
                aria-label={t('trilho.turnoN', { n: i + 1, nome })}
                data-esperando={p.esperando || undefined}
                className={styles.trilhoPonto}
                style={p.agente ? corDoAgente(p.agente) : undefined}
                onClick={() => document.getElementById(`turno-${p.id}`)?.scrollIntoView?.({ block: 'center' })}
              />
              <HoverCardContent side="left">
                <strong>{nome}</strong>
                <p>{p.trecho}</p>
              </HoverCardContent>
            </HoverCard>
          );
        })}
      </nav>
    </div>
  );
}
