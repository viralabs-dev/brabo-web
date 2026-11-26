import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ExplicacaoDoBloqueio } from '../lib/api-types';
import { acoesDoBloqueio, causaDoBloqueio, type AcaoProntaDoBloqueio } from '../lib/explicacao-do-bloqueio';
import { Button } from './ui/Button';
import { Disclosure } from './ui/Disclosure';
import { Textarea } from './ui/Textarea';
import styles from './PendenciasDeOutrasSessoes.module.css';

/**
 * AT-1021 (RN-1531): o corpo de um bloqueio para quem não programa. Causa em uma frase, uma ou duas
 * ações que retomam em UM clique (sem confirmação), o relato técnico recolhido e o campo livre
 * recolhido, mas disponível. Serve a fila das Pendências e a Visão geral; quem chama decide o que o
 * clique faz (`aoRetomar`) e o que vem antes dos botões (`antes`, o campo do teto).
 */
export function BloqueioRetomavel({
  tarefa,
  podeDecidir,
  enviando,
  aoRetomar,
  antes,
  acaoDesabilitada,
  acoesOcultas,
}: {
  tarefa: { blockedReason: string | null; blockedExplicacao?: ExplicacaoDoBloqueio | null };
  podeDecidir: boolean;
  enviando: boolean;
  /** `orientacao` é a da ação clicada, ou o texto livre. */
  aoRetomar: (orientacao: string, acao?: AcaoProntaDoBloqueio) => void;
  antes?: ReactNode;
  acaoDesabilitada?: (acao: AcaoProntaDoBloqueio) => boolean;
  /** Ações que esta tela não sabe executar (ex.: o teto, que só as Pendências gravam). */
  acoesOcultas?: readonly string[];
}) {
  const { t, i18n } = useTranslation('sessionPage');
  const [texto, setTexto] = useState('');
  const acoes = acoesDoBloqueio(tarefa, t).filter((a) => !a.id || !acoesOcultas?.includes(a.id));
  // O que só o dono pode fazer (ex.: recarregar o saldo): texto do catálogo, traduzido por código.
  const chaveSoVoce = `pendencias.bloqueadas.soVocePode.${tarefa.blockedExplicacao?.codigo}`;
  const soVoce = tarefa.blockedExplicacao?.codigo && i18n.exists(chaveSoVoce, { ns: 'sessionPage' }) ? t(chaveSoVoce) : null;
  const inerte = !podeDecidir || enviando;
  return (
    <>
      <p className={styles.causa} data-testid="causa-do-bloqueio">
        {causaDoBloqueio(tarefa, t)}
      </p>
      {soVoce && (
        <div className={styles.soVoce} data-testid="so-voce-pode">
          <strong>{t('pendencias.bloqueadas.soVoce')}</strong>
          <span>{soVoce}</span>
        </div>
      )}
      {antes}
      <div className={styles.acoesDaLinha}>
        {acoes.map((a, i) => (
          <Button
            key={a.id ?? a.rotulo}
            variant={i === 0 ? 'primary' : 'secondary'}
            disabled={inerte || !!acaoDesabilitada?.(a)}
            loading={enviando && i === 0}
            onClick={() => aoRetomar(a.orientacao, a)}
            data-testid="acao-do-bloqueio"
          >
            {a.rotulo}
          </Button>
        ))}
        {!podeDecidir && <span className={styles.nota}>{t('pendencias.bloqueadas.semPapel')}</span>}
      </div>
      {tarefa.blockedReason && (
        <Disclosure titulo={t('pendencias.bloqueadas.diagnosticoTecnico')}>
          <p className={styles.nota} data-testid="diagnostico-tecnico">
            {tarefa.blockedReason}
          </p>
        </Disclosure>
      )}
      <Disclosure titulo={t('pendencias.bloqueadas.outraOrientacao')}>
        <Textarea
          label={t('pendencias.bloqueadas.orientacao')}
          placeholder={t('pendencias.bloqueadas.orientacaoDica')}
          maxLength={2000}
          value={texto}
          disabled={inerte}
          onChange={(e) => setTexto(e.target.value)}
        />
        <div className={styles.acoesDaLinha}>
          <Button variant="secondary" disabled={inerte || texto.trim() === ''} onClick={() => aoRetomar(texto.trim())}>
            {t('pendencias.bloqueadas.botaoComTexto')}
          </Button>
        </div>
      </Disclosure>
    </>
  );
}

/**
 * A causa numa linha de lista (Backlog, PRs, esteira do gate). O relato cru fica no `title` e, com
 * `comDetalhe`, também num "Ver detalhes técnicos" recolhido (não cabe dentro de um `<p>`).
 */
export function CausaDaLinha({
  tarefa,
  className,
  comDetalhe = false,
}: {
  tarefa: { blockedReason: string | null; blockedExplicacao?: ExplicacaoDoBloqueio | null };
  className?: string;
  comDetalhe?: boolean;
}) {
  const { t } = useTranslation('sessionPage');
  return (
    <>
      <span className={className} title={tarefa.blockedReason ?? undefined} data-testid="causa-da-linha">
        {causaDoBloqueio(tarefa, t)}
      </span>
      {comDetalhe && tarefa.blockedReason && (
        <Disclosure titulo={t('pendencias.bloqueadas.diagnosticoTecnico')}>
          <p className={styles.nota}>{tarefa.blockedReason}</p>
        </Disclosure>
      )}
    </>
  );
}
