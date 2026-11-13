import { useQuery } from '@tanstack/react-query';
import { getProjectPendingActions } from './api-client';

export type JanelaDeDecididas = '24h' | '30d';
const HORAS: Record<JanelaDeDecididas, number> = { '24h': 24, '30d': 24 * 30 };

/**
 * Ações DECIDIDAS do projeto (RN-1154, RN-1225): aprovadas, negadas,
 * automáticas, executadas e falhas, mais novas primeiro, no máximo 100.
 * Sem poll próprio: a chave começa por `['project-pending-actions', projectId]`,
 * e quem decide invalida esse prefixo.
 */
export function useProjectDecidedActions(projectId: string | undefined, janela: JanelaDeDecididas) {
  return useQuery({
    queryKey: ['project-pending-actions', projectId, 'decided', janela],
    queryFn: () =>
      getProjectPendingActions(projectId!, {
        status: 'decided',
        since: new Date(Date.now() - HORAS[janela] * 3_600_000).toISOString(),
      }),
    enabled: !!projectId,
  });
}
