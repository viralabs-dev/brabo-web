import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { XIcon } from '../components/ui/icons';
import { useExecutoresAoVivo } from '../lib/executores-ao-vivo-query';
import { contagemPorEstado, dolar } from '../lib/executores-ao-vivo';
import { useLayoutMovel } from '../lib/layout-movel';
import styles from './FaixaDeEstado.module.css';

/**
 * AT-957 (RN-1303): a execução vigente vira UMA linha de 40px acima do fio — progresso, quantos
 * esperam e custo. Nunca cresce (RN-816); o detalhe mora na aba Executores do painel, que o clique
 * abre. Mesma fonte do que era o carrossel (`useExecutoresAoVivo`), sem leitura nova (RN-632).
 * Quando a execução deixa de ser a vigente, o resumo do fim ("concluída"/"parada") mora aqui.
 */
export function FaixaDeEstado({
  projectId,
  sessionId,
  aoAbrirExecutores,
}: {
  projectId: string;
  sessionId: string;
  aoAbrirExecutores: () => void;
}) {
  const movel = useLayoutMovel();
  const { t } = useTranslation('executors');
  const { t: tp } = useTranslation('sessionPage');
  const dados = useExecutoresAoVivo(projectId, sessionId);
  const [encerrada, setEncerrada] = useState<{ done: number; total: number; custo: number } | null>(null);
  const [dispensada, setDispensada] = useState(false);
  const { done, total } = dados.progresso;

  // A execução some do servidor quando termina: guarda o último retrato para o resumo.
  useEffect(() => {
    if (dados.execId) {
      setEncerrada({ done, total, custo: dados.custoTotal });
      setDispensada(false);
    }
  }, [dados.execId, done, total, dados.custoTotal]);

  if (!dados.execId) {
    if (!encerrada || dispensada) return null;
    const concluida = encerrada.total > 0 && encerrada.done === encerrada.total;
    return (
      <section className={styles.faixa} data-layout={movel ? 'movel' : undefined} aria-label={t('carrossel.regiao')} data-testid="faixa-de-estado">
        <Badge tone={concluida ? 'success' : 'muted'}>
          {t(concluida ? 'carrossel.fim.concluida' : 'carrossel.fim.parada')}
        </Badge>
        <span role="status" className={styles.texto}>
          {t('carrossel.progresso', { done: encerrada.done, total: encerrada.total })} · {dolar(encerrada.custo)}
        </span>
        <Button type="button" variant="ghost" aria-label={t('carrossel.dispensar')} onClick={() => setDispensada(true)}>
          <XIcon size={12} />
        </Button>
      </section>
    );
  }
  if (dados.cartoes.length === 0) return null;

  const contagem = contagemPorEstado(dados.cartoes);
  const esperam = contagem.aguardando + contagem.ocioso + contagem.bloqueado + contagem.travado;
  return (
    <section className={styles.faixa} data-layout={movel ? 'movel' : undefined} aria-label={t('carrossel.regiao')} data-testid="faixa-de-estado">
      <span className={styles.texto}>{t('carrossel.progresso', { done, total })}</span>
      <div
        className={styles.barra}
        role="progressbar"
        aria-label={t('carrossel.progresso', { done, total })}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div className={styles.barraPreenchida} style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
      </div>
      {/* Só aqui há região viva: muda quando a contagem muda, não a cada evento. */}
      <span role="status" className={styles.espera}>
        {tp('faixa.esperam', { count: esperam })}
      </span>
      <span className={styles.custo}>{dolar(dados.custoTotal)}</span>
      <Button type="button" variant="ghost" onClick={aoAbrirExecutores} data-testid="faixa-abrir-executores">
        {tp('faixa.abrir')}
      </Button>
    </section>
  );
}
