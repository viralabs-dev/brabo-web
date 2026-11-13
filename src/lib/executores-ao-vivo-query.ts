import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getActiveExecutionSession,
  getArchitecture,
  getOpenPullRequestsDoChat,
  getSessionTokenUsage,
  listBacklog,
  listSessionEvents,
} from './api-client';
import { connectSessionHeartbeat } from './session-channel';
import { criarInvalidadorDoCanal, intervaloDaSessao, useCanalDaSessaoVivo } from './canal-vivo';
import { pollQueParaNoErro } from './query-policy';
import { cartoesDaExecucao, progressoDaExecucao } from './executores-ao-vivo';

/**
 * AT-880: o que o carrossel do chat lê da execução VIGENTE (RN-139), que roda
 * em OUTRA sessão. Mesmas chaves de cache da aba Executores e das pendências
 * (nada de rota nova); o heartbeat da sessão de execução mantém o vivo, como
 * na aba Executores, e só liga quando a execução não é a sessão aberta (essa
 * o `SessionPage` já assina). Fica fora de `hooks.ts` (como `agentes-travados-query`)
 * para as telas que mockam esse módulo não precisarem conhecer estes hooks.
 */
export function useExecutoresAoVivo(projectId: string, sessionId: string) {
  const queryClient = useQueryClient();
  const sessao = useQuery({
    queryKey: ['execution-session', projectId],
    queryFn: () => getActiveExecutionSession(projectId),
    staleTime: 5000,
    refetchInterval: 5000,
  });
  const execId = sessao.data?.status === 'active' ? sessao.data.id : undefined;
  const canalVivo = useCanalDaSessaoVivo(execId);
  const eventos = useQuery({
    queryKey: ['session-events', projectId, execId],
    queryFn: () => listSessionEvents(projectId, execId!, { limit: 200, latest: true }),
    enabled: !!execId,
    refetchInterval: pollQueParaNoErro(intervaloDaSessao(15_000, canalVivo)),
  });
  const backlog = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => listBacklog(projectId),
    enabled: !!execId,
    refetchInterval: pollQueParaNoErro(15_000),
  });
  const arquitetura = useQuery({
    queryKey: ['architecture', projectId],
    queryFn: () => getArchitecture(projectId),
    enabled: !!execId,
    refetchInterval: pollQueParaNoErro(30_000),
  });
  const custo = useQuery({
    queryKey: ['session-token-usage', projectId, execId],
    queryFn: () => getSessionTokenUsage(projectId, execId!),
    enabled: !!execId,
    refetchInterval: pollQueParaNoErro(intervaloDaSessao(15_000, canalVivo)),
  });
  const prs = useQuery({
    queryKey: ['code-pull-requests', projectId, 'open', 'chat'],
    queryFn: () => getOpenPullRequestsDoChat(projectId),
    enabled: !!execId,
  });

  useEffect(() => {
    if (!execId || execId === sessionId) return;
    const invalidador = criarInvalidadorDoCanal(queryClient, projectId, execId);
    const desconectar = connectSessionHeartbeat(projectId, execId, {
      onEvent: ({ type }) => invalidador.aoEvento(type, false),
      onAgentStatus: () => invalidador.aoEvento('agent.status', false),
    });
    return () => {
      desconectar();
      invalidador.encerrar();
    };
  }, [execId, sessionId, projectId, queryClient]);

  const moduleMap = arquitetura.data?.moduleMap;
  const cartoes = useMemo(
    () =>
      execId && moduleMap
        ? cartoesDaExecucao({ eventos: eventos.data?.items ?? [], epics: backlog.data, moduleMap, prs: prs.data?.items })
        : [],
    [execId, moduleMap, eventos.data, backlog.data, prs.data],
  );
  const progresso = useMemo(() => progressoDaExecucao(backlog.data), [backlog.data]);
  const usos = custo.data ?? [];
  return {
    execId,
    cartoes,
    progresso,
    custoDe: (agentId: string) => usos.find((u) => u.actorId === agentId)?.costMicros,
    custoTotal: usos.reduce((n, u) => n + u.costMicros, 0),
  };
}
