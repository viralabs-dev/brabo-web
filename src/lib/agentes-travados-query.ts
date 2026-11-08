import { useQuery } from '@tanstack/react-query';
import { getActiveExecutionSession, listSessionEvents } from './api-client';
import { agentesTravados } from './agent-status';

/**
 * AT-799: os dev agents travados pelo disjuntor (RN-047) da execução ativa.
 * Mesmas chaves de `useActiveExecutionSession`/`useSessionEvents` (cache
 * compartilhado, sem rota nova); fica fora de `hooks.ts` para não depender do
 * mock desse módulo nas telas que só montam as pendências.
 */
export function useAgentesTravados(projectId: string | undefined) {
  const sessao = useQuery({
    queryKey: ['execution-session', projectId],
    queryFn: () => getActiveExecutionSession(projectId!),
    enabled: !!projectId,
    staleTime: 5000,
    refetchInterval: 5000,
  });
  const sessionId = sessao.data?.id;
  const eventos = useQuery({
    queryKey: ['session-events', projectId, sessionId],
    queryFn: () => listSessionEvents(projectId!, sessionId!, { limit: 200, latest: true }),
    enabled: !!projectId && !!sessionId,
    refetchInterval: 5000,
  });
  return { sessionId, travados: agentesTravados(eventos.data?.items ?? []) };
}
