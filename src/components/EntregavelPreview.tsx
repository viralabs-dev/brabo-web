import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WebPreview } from './ai-elements/web-preview';
import { Button } from './ui/Button';
import styles from './EntregavelPreview.module.css';
import { urlLocalSegura } from './RodarNaSuaMaquina.helpers';

const TEMPO_LIMITE_MS = 3000;

/**
 * AT-975 (RN-1479): a checagem que decide se a prévia existe. `no-cors` devolve
 * uma resposta opaca, que basta para saber que a porta atende; porta fechada
 * rejeita, e o tempo limite corta o que ficar pendurado. Roda ao montar e ao
 * `tentarDeNovo`, nunca em intervalo.
 */
function useEntregavelNoAr(url: string | undefined) {
  const [estado, setEstado] = useState<'checando' | 'no-ar' | 'fora'>('checando');
  const [rodada, setRodada] = useState(0);
  useEffect(() => {
    if (!url) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TEMPO_LIMITE_MS);
    let cancelado = false;
    setEstado('checando');
    fetch(url, { mode: 'no-cors', signal: ctl.signal })
      .then(() => !cancelado && setEstado('no-ar'))
      .catch(() => !cancelado && setEstado('fora'))
      .finally(() => clearTimeout(timer));
    return () => {
      cancelado = true;
      clearTimeout(timer);
      ctl.abort();
    };
  }, [url, rodada]);
  return { estado, tentarDeNovo: useCallback(() => setRodada((r) => r + 1), []) };
}

/* Encaixe do Web preview: usa a primeira URL local declarada; sem ela, ou sem resposta da porta, diz em texto (nunca iframe vazio). */
export function EntregavelPreview({ urls }: { urls: { label: string; url: string }[] }) {
  const { t } = useTranslation('overview');
  const alvo = urls.find((u) => urlLocalSegura(u.url));
  const { estado, tentarDeNovo } = useEntregavelNoAr(alvo?.url);
  if (!alvo) return <p>{t('entregavel.vazio')}</p>;
  if (estado === 'checando') return <p role="status">{t('entregavel.checando')}</p>;
  if (estado === 'fora') {
    return (
      <div role="status" data-testid="entregavel-fora" className={styles.fora}>
        <span>{t('entregavel.naoRespondeu', { url: alvo.url })}</span>
        <Button size="sm" variant="secondary" onClick={tentarDeNovo}>
          {t('entregavel.tentarDeNovo')}
        </Button>
        <a href={alvo.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          {t('entregavel.abrir')}
        </a>
      </div>
    );
  }
  return <WebPreview url={alvo.url} />;
}
