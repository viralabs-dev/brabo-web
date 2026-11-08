import type { ExecucaoParada } from '../lib/execution';

/** O texto do aviso de execução parada (RN-1061): quantas pendentes e atrás de quê. */
export function textoDaExecucaoParada(
  t: (chave: string, opcoes?: Record<string, unknown>) => string,
  parada: ExecucaoParada,
): string {
  const atras = [
    ...parada.tarefasBloqueadas.map((x) => t('execucaoParada.tarefa', { titulo: x.title ?? x.taskId })),
    ...parada.agentesTravados.map((x) => t('execucaoParada.agente', { agente: x.agentId })),
  ].join(', ');
  return t('execucaoParada.aviso', { count: parada.tarefasPendentes, atras });
}
