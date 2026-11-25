import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { mensagemDaApi, responderAutomacao } from '../lib/api-client';
import { destinoDasRegras, partesDaChave, type RespostaDaOferta } from '../lib/automacao-oferta';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider.helpers';
import styles from './SessionPage.module.css';

interface Props {
  projectId: string;
  payload: { categoria?: string; chave?: string; escopo?: string; n?: number; comoDesfazer?: string };
  resposta: RespostaDaOferta;
  /** O papel do endpoint de resposta (`maintainer`) alcança? */
  podeResponder: boolean;
}

/**
 * RN-1442 (AT-999): o cartão "fazer sozinho daqui em diante" no chat. Duas ações
 * visíveis (Aceitar, Agora não), cada uma com rótulo em texto; respondida, vira só a
 * frase do desfecho — o estado vem dos eventos `automacao.aceita`/`recusada`.
 */
export function OfertaDeAutomacao({ projectId, payload, resposta, podeResponder }: Props) {
  const { t } = useTranslation('sessionPage');
  const { showToast } = useToast();
  const [andando, setAndando] = useState<'aceitar' | 'recusar' | null>(null);
  const categoria = payload.categoria ?? '';
  const chave = payload.chave ?? '';
  const { acao, agente } = partesDaChave(chave);

  async function responder(decisao: 'aceitar' | 'recusar') {
    setAndando(decisao);
    try {
      await responderAutomacao(projectId, { categoria, chave, escopo: payload.escopo, decisao });
    } catch (erro) {
      showToast({ title: t('ofertaDeAutomacao.erroTitulo'), message: mensagemDaApi(erro), tone: 'danger' });
    } finally {
      setAndando(null);
    }
  }

  return (
    <div data-testid="oferta-de-automacao" data-resposta={resposta}>
      <p>
        {t(`ofertaDeAutomacao.texto.${categoria}`, {
          defaultValue: t('ofertaDeAutomacao.texto.generico', { chave }),
          n: payload.n ?? 0,
          acao,
          agente,
          chave,
        })}
      </p>
      <p className={styles.mergearNota}>
        {t('ofertaDeAutomacao.desfazerAntes')}{' '}
        <a href={destinoDasRegras(projectId)} data-testid="oferta-de-automacao-desfazer">
          {t('ofertaDeAutomacao.ondePadrao')}
        </a>
        {t('ofertaDeAutomacao.desfazerDepois')}
      </p>
      {resposta === 'pendente' ? (
        <div className={styles.mergearNoChat}>
          <Button
            variant="primary"
            disabled={!podeResponder || andando !== null}
            loading={andando === 'aceitar'}
            onClick={() => void responder('aceitar')}
          >
            <Check aria-hidden="true" />
            {t('ofertaDeAutomacao.aceitar')}
          </Button>
          <Button
            variant="secondary"
            disabled={!podeResponder || andando !== null}
            loading={andando === 'recusar'}
            onClick={() => void responder('recusar')}
          >
            {t('ofertaDeAutomacao.recusar')}
          </Button>
          {!podeResponder && <span className={styles.mergearNota}>{t('ofertaDeAutomacao.semPapel')}</span>}
        </div>
      ) : (
        <span className={styles.mergearNota} data-testid="oferta-de-automacao-resposta">
          {t(resposta === 'aceita' ? 'ofertaDeAutomacao.aceita' : 'ofertaDeAutomacao.recusada')}
        </span>
      )}
    </div>
  );
}
