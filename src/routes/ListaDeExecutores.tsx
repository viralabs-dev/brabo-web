import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { useExecutoresAoVivo } from '../lib/executores-ao-vivo-query';
import { dolar, type EstadoDoCartao } from '../lib/executores-ao-vivo';
import { rodadaAtual, type EtapaDaLane, type LaneDoPlano, type RodadaDoPlano } from '../lib/plano-por-rodada';
import styles from './ListaDeExecutores.module.css';

const TOM: Record<EstadoDoCartao, BadgeTone> = {
  trabalhando: 'success',
  aguardando: 'warning',
  ocioso: 'muted',
  bloqueado: 'warning',
  travado: 'danger',
  falhou: 'danger',
  concluido: 'success',
};

// Cor só no que pede ação: verde mergeada, amarelo esperando, azul (infra) pronta e no gate; o resto é neutro.
const TOM_DA_ETAPA: Record<EtapaDaLane, BadgeTone> = {
  mergeada: 'success',
  espera: 'warning',
  pronta: 'agent',
  noGate: 'agent',
  implementando: 'neutral',
  aFazer: 'neutral',
};
const AZUL = { ['--agent-color' as string]: 'var(--ag-infra)' } as CSSProperties;

function MotivoDaEspera({ lane }: { lane: LaneDoPlano }) {
  const { t } = useTranslation('executors');
  const [primeira] = lane.esperaPor;
  if (!primeira) return null;
  const texto =
    lane.esperaPor.length > 1
      ? t('carrossel.plano.esperaVarias', { n: lane.esperaPor.length, titulo: primeira.titulo })
      : primeira.itens.length > 0
        ? t('carrossel.plano.esperaCom', { itens: primeira.itens.join(', '), titulo: primeira.titulo })
        : t('carrossel.plano.espera', { titulo: primeira.titulo });
  return <p className={styles.texto}>{texto}</p>;
}

/** AT-993 (RN-1408 a RN-1410): só a rodada em curso nasce aberta; as outras são uma linha que abre no clique. */
function PlanoPorRodada({ plano }: { plano: RodadaDoPlano[] }) {
  const { t } = useTranslation('executors');
  const atual = rodadaAtual(plano);
  const [abertas, setAbertas] = useState<Record<number, boolean>>({});
  return (
    <section className={styles.plano} aria-label={t('carrossel.plano.titulo')} data-testid="plano-por-rodada">
      {plano.map((r, i) => {
        const aberta = abertas[i] ?? i === atual;
        const feitas = r.lanes.every((l) => l.etapa === 'mergeada');
        return (
          <div key={r.nivel} className={styles.rodada} data-testid={`rodada-${i + 1}`}>
            <h4 className={styles.rodadaTitulo}>
              <button
                type="button"
                className={styles.rodadaBotao}
                aria-expanded={aberta}
                onClick={() => setAbertas((a) => ({ ...a, [i]: !aberta }))}
              >
                {aberta
                  ? t('carrossel.plano.rodada', { n: i + 1, total: plano.length })
                  : t('carrossel.plano.rodadaFechada', {
                      n: i + 1,
                      resumo: t(feitas ? 'carrossel.plano.resumoMergeadas' : 'carrossel.plano.resumoTarefas', {
                        count: r.lanes.length,
                      }),
                    })}
              </button>
            </h4>
            {aberta && (
              <ul className={styles.itens}>
                {r.lanes.map((l) => (
                  <li key={l.id} className={styles.lane} data-testid={`lane-${l.id}`}>
                    <span>{l.titulo}</span>
                    <Badge tone={TOM_DA_ETAPA[l.etapa]} style={l.etapa === 'pronta' || l.etapa === 'noGate' ? AZUL : undefined}>
                      {t(`carrossel.plano.etapa.${l.etapa}`)}
                    </Badge>
                    {l.agente && <span className={styles.texto}>{t('carrossel.plano.agente', { agente: l.agente })}</span>}
                    <MotivoDaEspera lane={l} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
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

/**
 * AT-957 (RN-1303): a aba Executores do painel da sessão — os cartões do antigo carrossel viram
 * UMA lista, na ordem de atenção, com o motivo da espera e a ação ("Ver no fio") na própria linha.
 */
export function ListaDeExecutores({ projectId, sessionId }: { projectId: string; sessionId: string }) {
  const { t } = useTranslation('executors');
  const { t: tp } = useTranslation('sessionPage');
  const desde = useDesde();
  const dados = useExecutoresAoVivo(projectId, sessionId);
  if (!dados.execId || dados.cartoes.length === 0) {
    return <p className={styles.vazio}>{tp('painel.executoresVazio')}</p>;
  }
  const execId = dados.execId;
  return (
    <div className={styles.lista} data-testid="lista-de-executores">
      <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: 'executores' }} className={styles.link}>
        {t('carrossel.verExecutores')}
      </Link>
      {dados.plano.length > 0 && <PlanoPorRodada plano={dados.plano} />}
      <ul className={styles.itens} aria-label={t('carrossel.titulo')}>
        {dados.cartoes.map((c) => (
          <li key={c.agentId} className={styles.item} data-testid={`executor-${c.agentId}`}>
            <div className={styles.topo}>
              <span className={styles.nome}>{c.agentId}</span>
              <Badge tone={TOM[c.estado]} dot pulse={c.estado === 'trabalhando'}>
                {t(`carrossel.estado.${c.estado}`)}
              </Badge>
            </div>
            {c.tarefa && <p className={styles.tarefa}>{c.tarefa}</p>}
            <p className={styles.texto}>{t(`carrossel.texto.${c.texto.key}`, c.texto.params)}</p>
            {c.ultimaAcao && c.estado === 'trabalhando' && (
              <p className={styles.texto}>{t('carrossel.ultimaAcao', { acao: c.ultimaAcao })}</p>
            )}
            <div className={styles.rodape}>
              <span>{desde(c.desde)}</span>
              <span>{dolar(dados.custoDe(c.agentId))}</span>
              <Link
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: execId }}
                search={c.eventoId ? { highlightEvent: c.eventoId } : {}}
                className={styles.link}
              >
                {t('carrossel.verNoFio')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
