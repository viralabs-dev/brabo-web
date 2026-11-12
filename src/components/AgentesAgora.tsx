import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENTS } from '../lib/agents';
import { agentesAgora, type PontoDeAgente } from '../lib/agentes-agora';
import type { RosterEntry } from '../lib/agent-status';
import { AvatarDoAgente } from './ui/AvatarDoAgente';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './shadcn/sidebar';
import styles from './AgentesAgora.module.css';

const COR_DO_PONTO: Record<PontoDeAgente, string> = {
  trabalhando: 'var(--success)',
  aguardando: 'var(--warning)',
  ocioso: 'var(--text-muted)',
  falhou: 'var(--danger)',
};

/**
 * "Agentes agora" da sidebar (v9, ADR 0294): até 5 agentes, avatar na cor do
 * papel, nome e ponto de status. Nunca mostra contagem de eventos (RN-467).
 * Recolhida, só o avatar com tooltip. O roster vem pronto do Shell.
 */
export function AgentesAgora({
  roster,
  colapsado,
  onVerTodos,
}: {
  roster: readonly RosterEntry[];
  colapsado: boolean;
  onVerTodos: () => void;
}) {
  const { t } = useTranslation('shell');
  const itens = agentesAgora(roster);
  return (
    <SidebarMenu data-testid="agentes-agora">
      {itens.map((a) => {
        const def = AGENTS[a.id as keyof typeof AGENTS];
        const nome = def?.name ?? a.nome;
        const status = t(`sidebar.agentsNow.status.${a.ponto}`);
        return (
          <SidebarMenuItem key={a.id}>
            <SidebarMenuButton
              className={styles.agente}
              title={`${nome} — ${status}`}
              aria-label={`${nome} — ${status}`}
              data-testid={`agente-agora-${a.id}`}
              style={{ ['--msg-color' as string]: def?.color ?? 'var(--text-muted)' } as CSSProperties}
              onClick={onVerTodos}
            >
              <AvatarDoAgente id={a.id} />
              {!colapsado && <span className={styles.nome}>{nome}</span>}
              <span
                className={styles.ponto}
                data-ponto={a.ponto}
                style={{ background: COR_DO_PONTO[a.ponto] }}
                aria-hidden="true"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
      {itens.length > 0 && !colapsado && (
        <SidebarMenuItem>
          <button type="button" className={styles.verTodos} onClick={onVerTodos}>
            {t('sidebar.agentsNow.viewAll')}
          </button>
        </SidebarMenuItem>
      )}
    </SidebarMenu>
  );
}
