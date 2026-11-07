import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mensagemDaApi, resumeParkedGate } from '../lib/api-client';

import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider.helpers';
import styles from './SessionPage.module.css';
import { RotateCcw } from 'lucide-react';

/**
 * Por que o ciclo estacionou (RN-867). O payload tem dois emissores: o resgate
 * por tempo (`GateRescuer`, que grava `idadeSegundos`) e o QA esperando a
 * resposta a uma pergunta em aberto (sem `idadeSegundos`). É a presença do
 * número, não o texto do `motivo` (que é pt-BR fixo), que separa os dois.
 */
export type MotivoDoEstacionamento = 'tempo' | 'pergunta';

interface Props {
  projectId: string;
  taskId: string;
  gate: string;
  /** Papel alcança o mínimo do endpoint (`developer`, `roleAtLeast`)? */
  podeDecidir: boolean;
}

/**
 * "Retomar gate" sob o aviso de ciclo estacionado (ADR 0207, RN-724). Sem
 * poll novo: o despacho do gate grava eventos no log da sessão, e o canal os
 * traz. A recusa (409 `gate_nao_estacionado`) vira toast com a frase da api.
 */
export function RetomarGateEstacionado({ projectId, taskId, gate, podeDecidir }: Props) {
  const { t } = useTranslation('sessionPage');
  const { showToast } = useToast();
  const [retomando, setRetomando] = useState(false);
  const [retomado, setRetomado] = useState(false);

  async function retomar() {
    setRetomando(true);
    try {
      await resumeParkedGate(projectId, taskId, gate);
      setRetomado(true);
    } catch (erro) {
      showToast({
        title: t('gateEstacionado.erroTitulo'),
        message: mensagemDaApi(erro),
        tone: 'danger',
      });
    } finally {
      setRetomando(false);
    }
  }

  return (
    <div className={styles.mergearNoChat}>
      <Button
        variant="secondary"
        disabled={!podeDecidir || retomado}
        loading={retomando}
        onClick={() => void retomar()}
      >
        <RotateCcw aria-hidden="true" />
        {t('gateEstacionado.botao')}
      </Button>
      <span className={styles.mergearNota} data-testid="retomar-gate-nota">
        {!podeDecidir
          ? t('gateEstacionado.semPapel')
          : retomado
            ? t('gateEstacionado.retomado')
            : t('gateEstacionado.nota', { gate })}
      </span>
    </div>
  );
}
