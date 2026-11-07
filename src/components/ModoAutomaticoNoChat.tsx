import { useQuery } from '@tanstack/react-query';
import { listAgentAutonomy } from '../lib/api-client';

import { ModoAutomaticoDoTime } from './ModoAutomaticoDoTime';

import { agentesDoChat, ofertaDoChat } from './ModoAutomaticoNoChat.helpers';
export function ModoAutomaticoNoChat({
  projectId,
  comExecucao,
  ativados,
  podeLigar,
  execucaoNoProjeto,
  sessaoAtiva = true,
}: {
  projectId: string;
  /** A sessão está ativa E tem execução (`sessaoTemExecucao`). */
  comExecucao: boolean;
  ativados: readonly string[];
  /** `maintainer` no endpoint (RN-102). */
  podeLigar: boolean;
  /** RN-889: a execução do projeto, de outra sessão (o resumo). */
  execucaoNoProjeto?: { ativa: boolean; ativados: readonly string[] };
  /** A sessão lida está ativa (a oferta nunca aparece em sessão encerrada). */
  sessaoAtiva?: boolean;
}) {
  const oferta = ofertaDoChat(comExecucao, ativados, execucaoNoProjeto);
  const mostra = sessaoAtiva && oferta.mostra;
  const { data: autonomyRules } = useQuery({
    queryKey: ['agent-autonomy', projectId],
    queryFn: () => listAgentAutonomy(projectId),
    enabled: mostra,
  });
  if (!mostra) return null;
  return (
    <ModoAutomaticoDoTime
      projectId={projectId}
      agentes={agentesDoChat(oferta.ativados)}
      autonomyRules={autonomyRules}
      podeLigar={podeLigar}
      compacto
    />
  );
}
