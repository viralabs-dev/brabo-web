import { useQuery } from '@tanstack/react-query';
import { getCodePullRequests } from './api-client';
import { useBacklog } from './hooks';
import { usePendenciasDoProjeto } from './pendencias-do-projeto';
import { prsProntasParaMerge } from './prontas-e-bloqueadas';

/**
 * As PRs prontas para o dono mergear (RN-825) com as três leituras que as
 * decidem: a lista de PRs abertas, o backlog (15 s) e as pendências do projeto.
 * Chaves de cache iguais às de sempre, então o painel de pendências e o aviso
 * da borda do fio (AT-810, RN-1063) leem o MESMO cache — nenhuma requisição a mais.
 * A releitura da lista de PRs quando o backlog muda (RN-841) fica no painel.
 */
export function usePrsProntas(projectId: string, sessionId: string, habilitado = true) {
  const consulta = usePendenciasDoProjeto(projectId, sessionId);
  const prsQuery = useQuery({
    queryKey: ['code-pull-requests', projectId, 'open'],
    queryFn: () => getCodePullRequests(projectId, { state: 'open' }),
    enabled: !!projectId && habilitado,
  });
  const backlogQuery = useBacklog(habilitado ? projectId : undefined, 15_000, sessionId);
  const prontas = prsProntasParaMerge(prsQuery.data?.items, backlogQuery.data, consulta.data, sessionId);
  return { prontas, consulta, backlogQuery };
}
