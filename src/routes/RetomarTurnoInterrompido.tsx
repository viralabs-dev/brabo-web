import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mensagemDaApi, resumeInterruptedTurn } from '../lib/api-client';

import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider.helpers';
import styles from './SessionPage.module.css';
import { RotateCcw } from 'lucide-react';

export interface PassoDoPlano {
  texto: string;
  estado: string;
}
export interface PlanoDoAgente {
  objetivo: string;
  passos: PassoDoPlano[];
}

interface Props {
  projectId: string;
  sessionId: string;
  agent: string;
  plano: PlanoDoAgente | null;
  /** Papel EFETIVO alcança o mínimo do endpoint (`developer`, `roleAtLeast`)? */
  podeDecidir: boolean;
  /** Depois do aceite: acompanha o turno pelo log (nunca `finalizarTurnoDoAgente`). */
  acompanhar: (agent: string) => void;
}

/** "Retomar" sob o aviso de turno interrompido. A recusa (409) vira toast com a frase da api. */
export function RetomarTurnoInterrompido({
  projectId,
  sessionId,
  agent,
  plano,
  podeDecidir,
  acompanhar,
}: Props) {
  const { t } = useTranslation('sessionPage');
  const { showToast } = useToast();
  const [retomando, setRetomando] = useState(false);
  const [retomado, setRetomado] = useState(false);

  async function retomar() {
    setRetomando(true);
    try {
      await resumeInterruptedTurn(projectId, sessionId, agent);
      setRetomado(true);
      acompanhar(agent);
    } catch (erro) {
      showToast({
        title: t('turnoInterrompido.erroTitulo'),
        message: mensagemDaApi(erro),
        tone: 'danger',
      });
    } finally {
      setRetomando(false);
    }
  }

  const emCurso = plano?.passos.find((p) => p.estado === 'em_curso');
  return (
    <div data-testid="turno-interrompido">
      {plano && (
        <div className={styles.mergearNota} data-testid="turno-interrompido-plano">
          <div>{t('turnoInterrompido.objetivo', { objetivo: plano.objetivo })}</div>
          {emCurso && <div>{t('turnoInterrompido.pareiEm', { passo: emCurso.texto })}</div>}
          <ul>
            {plano.passos.map((p, i) => (
              <li key={i}>
                {t(`turnoInterrompido.estado.${p.estado}`, { defaultValue: p.estado })} · {p.texto}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className={styles.mergearNoChat}>
        <Button
          variant="secondary"
          disabled={!podeDecidir || retomado}
          loading={retomando}
          onClick={() => void retomar()}
        >
          <RotateCcw aria-hidden="true" />
          {t('turnoInterrompido.botao')}
        </Button>
        <span className={styles.mergearNota} data-testid="retomar-turno-nota">
          {!podeDecidir
            ? t('turnoInterrompido.semPapel')
            : retomado
              ? t('turnoInterrompido.retomado')
              : t('turnoInterrompido.nota')}
        </span>
      </div>
    </div>
  );
}
