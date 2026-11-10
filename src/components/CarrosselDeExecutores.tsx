import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Badge, type BadgeTone } from './ui/Badge';
import { Button } from './ui/Button';
import { Carousel } from './ui/Carousel';
import { ChevronDownIcon, XIcon } from './ui/icons';
import { useIsMobile } from './shadcn/use-mobile';
import { useExecutoresAoVivo } from '../lib/executores-ao-vivo-query';
import { contagemPorEstado, type CartaoDeExecutor, type EstadoDoCartao } from '../lib/executores-ao-vivo';
import styles from './CarrosselDeExecutores.module.css';

const CHAVE_MINIMIZADO = 'brabo:carrossel-de-executores:minimizado';

const TOM: Record<EstadoDoCartao, BadgeTone> = {
  trabalhando: 'success',
  aguardando: 'warning',
  ocioso: 'muted',
  bloqueado: 'warning',
  travado: 'danger',
  falhou: 'danger',
  concluido: 'success',
};

function lerMinimizado(): boolean | null {
  try {
    const v = window.localStorage.getItem(CHAVE_MINIMIZADO);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

function dolar(micros: number | undefined): string {
  return `US$ ${((micros ?? 0) / 1_000_000).toFixed(4)}`;
}

/** Tempo em minutos (segundos só abaixo de 1 min): não tiquetaqueia, muda com o poll. */
function useDesde() {
  const { t } = useTranslation('executors');
  return (iso: string | undefined) => {
    if (!iso) return '';
    const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (seg < 60) return t('carrossel.haSeg', { n: seg });
    const min = Math.round(seg / 60);
    return min < 60 ? t('carrossel.haMin', { n: min }) : t('carrossel.haH', { n: Math.round(min / 60) });
  };
}

function Estado({ cartao }: { cartao: CartaoDeExecutor }) {
  const { t } = useTranslation('executors');
  return (
    <Badge tone={TOM[cartao.estado]} dot pulse={cartao.estado === 'trabalhando'}>
      {t(`carrossel.estado.${cartao.estado}`)}
    </Badge>
  );
}

interface Props {
  projectId: string;
  /** A sessão aberta no chat. */
  sessionId: string;
}

/**
 * AT-880 (RN-1072): a faixa acima do fio do chat com os executores da execução
 * vigente — devs, QA e SecOps — num carrossel MANUAL (sem autoplay). Expandido
 * mostra tarefa, última ação, motivo do ócio e o link do fio; minimizado (e
 * recolhido no celular, o mesmo estado) mostra só nome, estado, tempo e gasto.
 */
export function CarrosselDeExecutores({ projectId, sessionId }: Props) {
  const { t } = useTranslation('executors');
  const desde = useDesde();
  const celular = useIsMobile();
  const [escolha, setEscolha] = useState<boolean | null>(lerMinimizado);
  const dados = useExecutoresAoVivo(projectId, sessionId);
  const [encerrada, setEncerrada] = useState<{ done: number; total: number; custo: number } | null>(null);
  const [dispensada, setDispensada] = useState(false);
  const { done, total } = dados.progresso;

  // A execução some do servidor quando termina: guarda o último retrato para o resumo (P2).
  useEffect(() => {
    if (dados.execId) {
      setEncerrada({ done, total, custo: dados.custoTotal });
      setDispensada(false);
    }
  }, [dados.execId, done, total, dados.custoTotal]);

  const minimizado = escolha ?? celular;
  function alternar() {
    const proximo = !minimizado;
    setEscolha(proximo);
    try {
      window.localStorage.setItem(CHAVE_MINIMIZADO, proximo ? '1' : '0');
    } catch {
      /* sem storage: a escolha vale só nesta tela */
    }
  }

  if (!dados.execId) {
    if (!encerrada || dispensada) return null;
    const concluida = encerrada.total > 0 && encerrada.done === encerrada.total;
    return (
      <section className={styles.faixa} aria-label={t('carrossel.regiao')}>
        <div className={styles.cabecalho}>
          <Badge tone={concluida ? 'success' : 'muted'}>
            {t(concluida ? 'carrossel.fim.concluida' : 'carrossel.fim.parada')}
          </Badge>
          <span role="status">
            {t('carrossel.progresso', { done: encerrada.done, total: encerrada.total })} · {dolar(encerrada.custo)}
          </span>
          <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: 'executores' }} className={styles.link}>
            {t('carrossel.verExecutores')}
          </Link>
          <Button type="button" variant="ghost" aria-label={t('carrossel.dispensar')} onClick={() => setDispensada(true)}>
            <XIcon size={12} />
          </Button>
        </div>
      </section>
    );
  }
  if (dados.cartoes.length === 0) return null;

  const contagem = contagemPorEstado(dados.cartoes);
  const resumo = [
    contagem.trabalhando > 0 && t('carrossel.contagem.trabalhando', { n: contagem.trabalhando }),
    contagem.aguardando > 0 && t('carrossel.contagem.aguardando', { n: contagem.aguardando }),
    contagem.ocioso > 0 && t('carrossel.contagem.ocioso', { n: contagem.ocioso }),
    contagem.bloqueado + contagem.travado + contagem.falhou > 0 &&
      t('carrossel.contagem.atencao', { n: contagem.bloqueado + contagem.travado + contagem.falhou }),
  ]
    .filter(Boolean)
    .join(' · ');
  const porPagina = celular ? 1 : 3;
  const paginas = [];
  for (let i = 0; i < dados.cartoes.length; i += porPagina) {
    const grupo = dados.cartoes.slice(i, i + porPagina);
    paginas.push({
      key: `p${i}`,
      label: `${i + 1}-${i + grupo.length}`,
      node: (
        <ul className={styles.pagina}>
          {grupo.map((c, j) => (
            <li key={c.agentId}>
              <Cartao cartao={c} posicao={i + j + 1} total={dados.cartoes.length} projectId={projectId} execId={dados.execId!} custo={dados.custoDe(c.agentId)} desde={desde(c.desde)} />
            </li>
          ))}
        </ul>
      ),
    });
  }

  return (
    <section className={styles.faixa} aria-label={t('carrossel.regiao')} data-testid="carrossel-executores">
      <div className={styles.cabecalho}>
        <strong>{t('carrossel.titulo')}</strong>
        <span>{t('carrossel.progresso', { done, total })}</span>
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
        <span role="status" className={styles.resumo}>
          {resumo}
        </span>
        <span className={styles.custo}>{dolar(dados.custoTotal)}</span>
        {!minimizado && (
          <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: 'executores' }} className={styles.link}>
            {t('carrossel.verExecutores')}
          </Link>
        )}
        <Button
          type="button"
          variant="ghost"
          data-testid="carrossel-minimizar"
          aria-expanded={!minimizado}
          aria-label={t(minimizado ? 'carrossel.restaurar' : 'carrossel.minimizar')}
          onClick={alternar}
        >
          <ChevronDownIcon size={14} className={minimizado ? undefined : styles.girado} />
        </Button>
      </div>

      {minimizado ? (
        <ul className={styles.chips} aria-label={t('carrossel.minimizadoLista')}>
          {dados.cartoes.map((c) => (
            <li key={c.agentId} className={styles.chip} data-testid={`carrossel-cartao-${c.agentId}`}>
              <span className={styles.nome}>{c.agentId}</span>
              <Estado cartao={c} />
              <span className={styles.meta}>{desde(c.desde)}</span>
              <span className={styles.meta}>{dolar(dados.custoDe(c.agentId))}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Carousel ariaLabel={t('carrossel.regiao')} slides={paginas} anunciar={false} />
      )}
    </section>
  );
}

function Cartao({
  cartao,
  posicao,
  total,
  projectId,
  execId,
  custo,
  desde,
}: {
  cartao: CartaoDeExecutor;
  posicao: number;
  total: number;
  projectId: string;
  execId: string;
  custo: number | undefined;
  desde: string;
}) {
  const { t } = useTranslation('executors');
  return (
    <article
      className={styles.cartao}
      data-testid={`carrossel-cartao-${cartao.agentId}`}
      role="group"
      aria-label={t('carrossel.cartaoRotulo', {
        posicao,
        total,
        nome: cartao.agentId,
        estado: t(`carrossel.estado.${cartao.estado}`),
      })}
    >
      <div className={styles.topo}>
        <span className={styles.nome}>{cartao.agentId}</span>
        <Estado cartao={cartao} />
      </div>
      {cartao.tarefa && <p className={styles.tarefa}>{cartao.tarefa}</p>}
      <p className={styles.texto}>{t(`carrossel.texto.${cartao.texto.key}`, cartao.texto.params)}</p>
      {cartao.ultimaAcao && cartao.estado === 'trabalhando' && (
        <p className={styles.acao}>{t('carrossel.ultimaAcao', { acao: cartao.ultimaAcao })}</p>
      )}
      <div className={styles.rodape}>
        <span>{desde}</span>
        <span>{dolar(custo)}</span>
      </div>
      <Link
        to="/projects/$projectId/sessions/$sessionId"
        params={{ projectId, sessionId: execId }}
        search={cartao.eventoId ? { highlightEvent: cartao.eventoId } : {}}
        className={styles.link}
      >
        {t('carrossel.verNoFio')}
      </Link>
    </article>
  );
}
