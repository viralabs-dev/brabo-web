import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitMerge } from 'lucide-react';
import { useArchitecture } from '../lib/hooks';
import { usePrsProntas } from '../lib/prs-prontas';
import { tarefaDaBranch } from '../lib/prontas-e-bloqueadas';
import { abrirFilaDePendencias } from '../lib/perguntas-em-aberto';
import { MergearNoChat } from '../routes/MergearNoChat';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { esperaRelativa, tarefasQueODestrava, tituloComContador } from './AvisoDePrPronta.helpers';
import styles from './AvisoDePrPronta.module.css';

interface Props {
  projectId: string;
  sessionId: string;
  /** Papel alcança o mínimo do endpoint de merge (`developer`)? */
  podeDecidir: boolean;
}

/**
 * Aviso fixo na borda do fio quando há PR pronta para o dono mergear (AT-810,
 * RN-1063), e o contador no título da aba ("(1) Brabo") enquanto houver. Lê as
 * MESMAS prontas do painel de pendências (`usePrsProntas`, cache compartilhado,
 * releitura de 15 s do backlog): sem evento novo, sem notificação do navegador.
 * O merge continua gesto humano (RN-418/RN-663): o aviso só oferece o
 * `MergearNoChat`, com a confirmação na linha. Diz quantas tarefas o merge destrava
 * (AT-902: `module_map` + backlog já lidos) e põe no topo a PR que destrava mais. "Agora não" dispensa as PRs
 * avisadas; só uma PR NOVA o traz de volta.
 */
export function AvisoDePrPronta({ projectId, sessionId, podeDecidir }: Props) {
  const { t, i18n } = useTranslation('sessionPage');
  const { prontas: lidas, backlogQuery } = usePrsProntas(projectId, sessionId);
  const moduleMap = useArchitecture(projectId, 15_000).data?.moduleMap;
  // Mais destrava primeiro; o sort é estável, então o empate guarda a ordem da fila.
  const prontas = useMemo(() => {
    const com = lidas.map((p) => ({
      ...p,
      destrava: tarefasQueODestrava(tarefaDaBranch(backlogQuery.data, p.pr.sourceBranch), backlogQuery.data, moduleMap),
    }));
    return com.sort((a, b) => b.destrava - a.destrava);
  }, [lidas, backlogQuery.data, moduleMap]);
  const [dispensadas, setDispensadas] = useState<ReadonlySet<string>>(new Set());

  // O contador na aba: todas as prontas, mesmo as dispensadas (ainda esperam).
  const quantas = prontas.length;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\) /, '');
    document.title = tituloComContador(base, quantas);
    return () => {
      document.title = base;
    };
  }, [quantas]);

  const avisadas = prontas.filter((p) => !dispensadas.has(p.pr.id));
  if (avisadas.length === 0) return null;

  const topo = avisadas[0]!;
  const unica = avisadas.length === 1 ? avisadas[0]! : null;
  const tarefa = unica ? tarefaDaBranch(backlogQuery.data, unica.pr.sourceBranch) : undefined;

  return (
    <div className={styles.aviso}>
      <Alert tone="accent" role="status" icon={<GitMerge size={15} aria-hidden="true" />}>
        <div className={styles.corpo} data-testid="aviso-pr-pronta">
          <span>
            {unica
              ? t('avisoDePrPronta.uma', { numero: unica.pr.number, titulo: unica.pr.title })
              : t('avisoDePrPronta.varias', { count: avisadas.length })}
            {tarefa && ` ${t('avisoDePrPronta.espera', { quando: esperaRelativa(tarefa.updatedAt, i18n.language) })}`}
            {topo.destrava > 0 &&
              ` ${t(unica ? 'avisoDePrPronta.destrava' : 'avisoDePrPronta.destravaA', { count: topo.destrava, numero: topo.pr.number })}`}
          </span>
          <div className={styles.acoes}>
            {unica && !unica.mergeDaSessao ? (
              <MergearNoChat
                projectId={projectId}
                sessionId={sessionId}
                numero={unica.pr.number}
                pr={{
                  pullRequestId: unica.pr.id,
                  sourceBranch: unica.pr.sourceBranch,
                  targetBranch: unica.pr.targetBranch,
                  title: unica.pr.title,
                }}
                podeDecidir={podeDecidir}
              />
            ) : (
              <Button variant="secondary" onClick={() => abrirFilaDePendencias('prontas')}>
                {unica ? t('avisoDePrPronta.ver') : t('avisoDePrPronta.verAs', { count: avisadas.length })}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setDispensadas((atual) => new Set([...atual, ...avisadas.map((p) => p.pr.id)]))}
            >
              {t('avisoDePrPronta.agoraNao')}
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}
