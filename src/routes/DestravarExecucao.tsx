import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockOpen, RotateCcw } from 'lucide-react';
import { mensagemDaApi, rearmDevAgent, unblockTask } from '../lib/api-client';
import type { ExecucaoParada } from '../lib/execution';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider.helpers';
import styles from './SessionPage.module.css';

interface Props {
  projectId: string;
  /** A sessão de EXECUÇÃO: é nela que `rearm` e `unblock` operam. */
  sessionId: string;
  parada: ExecucaoParada;
  /** Papel alcança o mínimo dos endpoints (`developer`)? */
  podeDecidir: boolean;
}

/**
 * Rearmar (RN-047) e Desbloquear (RN-826) sob o aviso de execução parada
 * (RN-1061): um botão por agente travado e um por tarefa bloqueada. Mesmas
 * rotas dos atalhos do chat; sem poll novo — o `dev.rearmed` e o
 * `backlog.task_unblocked` que elas gravam chegam pelo canal e encerram o aviso.
 */
export function DestravarExecucao({ projectId, sessionId, parada, podeDecidir }: Props) {
  const { t } = useTranslation('sessionPage');
  const { showToast } = useToast();
  const [andando, setAndando] = useState<string | null>(null);
  const [feitos, setFeitos] = useState<ReadonlySet<string>>(new Set());

  async function destravar(chave: string, acao: () => Promise<unknown>) {
    setAndando(chave);
    try {
      await acao();
      setFeitos((atual) => new Set(atual).add(chave));
    } catch (erro) {
      showToast({ title: t('execucaoParada.erroTitulo'), message: mensagemDaApi(erro), tone: 'danger' });
    } finally {
      setAndando(null);
    }
  }

  return (
    <div className={styles.mergearNoChat} data-testid="destravar-execucao">
      {parada.agentesTravados.map(({ agentId }) => (
        <Button
          key={`a-${agentId}`}
          variant="secondary"
          disabled={!podeDecidir || feitos.has(`a-${agentId}`)}
          loading={andando === `a-${agentId}`}
          onClick={() => void destravar(`a-${agentId}`, () => rearmDevAgent(projectId, sessionId, agentId))}
        >
          <RotateCcw aria-hidden="true" />
          {t('execucaoParada.rearmar', { agente: agentId })}
        </Button>
      ))}
      {parada.tarefasBloqueadas.map(({ taskId, title }) => (
        <Button
          key={`t-${taskId}`}
          variant="secondary"
          disabled={!podeDecidir || feitos.has(`t-${taskId}`)}
          loading={andando === `t-${taskId}`}
          onClick={() => void destravar(`t-${taskId}`, () => unblockTask(projectId, sessionId, taskId))}
        >
          <LockOpen aria-hidden="true" />
          {t('execucaoParada.desbloquear', { titulo: title ?? taskId })}
        </Button>
      ))}
      <span className={styles.mergearNota} data-testid="destravar-execucao-nota">
        {!podeDecidir
          ? t('execucaoParada.semPapel')
          : feitos.size > 0
            ? t('execucaoParada.feito')
            : t('execucaoParada.nota')}
      </span>
    </div>
  );
}
