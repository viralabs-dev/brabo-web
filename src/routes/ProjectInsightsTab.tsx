import { Shimmer } from '../components/ui/Shimmer';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  useHypotheses,
  usePsychologistAnalyses,
  usePsychologistStatus,
} from '../lib/hooks';
import {
  acceptHypothesis,
  ApiError,
  dismissHypothesis,
  mensagemDaApi,
  reanalyzeSession,
} from '../lib/api-client';
import { areaFor } from '../lib/agents';
import { formatMicros } from '../lib/execution';
import { idCurtoDaSessao } from '../lib/session-label';
import { HypothesisCard } from '../components/HypothesisCard';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import { Badge } from '../components/ui/Badge';
import { Lightbulb, Pause, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/ToastProvider.helpers';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTrigger,
} from '@/components/shadcn/popover';
// Estilo próprio (AT-945): a aba deixou de depender do módulo da Visão geral,
// que é compartilhado e continua com o que a Visão geral usa.
import styles from './ProjectInsightsTab.module.css';

/**
 * Aba Insights — hipóteses do Psicólogo (Fase 4b) agrupadas por agente alvo,
 * com confiança, evidências navegáveis e ações aceitar/descartar. Escopo de
 * PROJETO (não da sessão aberta): hipóteses acumulam a cada sessão encerrada,
 * e a navegação de evidência leva à sessão ANALISADA.
 *
 * Morava no fim da Visão geral, embaixo do painel do time, da execução e da
 * arquitetura — quatro assuntos numa coluna só, na aba que abre por padrão.
 * Era o achado #15 do primeiro dogfooding: a fila de decisões do Psicólogo
 * ficava fora da tela, sem contador, num lugar onde ninguém a procurava. Aqui
 * ela tem aba própria e badge de quantas esperam decisão, ao lado das outras
 * duas filas de decisão do projeto (backlog e aprovações).
 */
export function ProjectInsightsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('insights');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hypothesesQuery = useHypotheses(projectId);
  const { data: analyses } = usePsychologistAnalyses(projectId);
  // O Psicólogo pode estar pausado GLOBALMENTE (decisão do usuário em
  // 2026-08-10, não bug — ver docs/explanation/backlog.md). RN-454: a
  // leitura de `usePsychologistStatus` sabe disso de ANTEMÃO — antes desta
  // rodada, o único jeito de descobrir era o 503 do primeiro clique em
  // "Reanalisar", e esse botão só existe quando já há uma rodada de análise
  // (`runs.length > 0`); a tela com ZERO hipóteses nunca chegava perto dele,
  // então nunca conseguia distinguir "pausado por decisão" de "ainda não
  // analisou nada". `psicologoDesativado` continua existindo como reforço
  // do 503 em si — a flag pode mudar EM VOO entre a leitura de status e o
  // clique — com a explicação PERSISTENTE na tela, não só um toast que some
  // (RN-088: nunca falha silenciosa ou confusa). Mesmo padrão de
  // `ProficiencySection` (Anamnese).
  const { data: status } = usePsychologistStatus(projectId);
  const [psicologoDesativado, setPsicologoDesativado] = useState(false);
  const pausadoConhecido = status?.enabled === false;
  const psicologoBloqueado = psicologoDesativado || pausadoConhecido;

  const all = hypothesesQuery.data ?? [];
  const pending = all.filter((h) => h.status === 'proposed');
  const runs = analyses ?? [];

  // Agrupa por ÁREA quando o alvo é um subagente conhecido (Fase 8d, ADR
  // 0038) — hipóteses de `qa-automacao` e `qa-performance-seguranca` caem
  // no MESMO grupo "QA", em vez de duas seções soltas que escondem que são
  // a mesma área. Alvo sem área (dev-api, po, ...) continua agrupado pelo
  // próprio nome, como sempre. Preserva a ordem de chegada dos grupos.
  const byAgent = new Map<string, typeof all>();
  for (const h of all) {
    const chave = areaFor(h.agenteAlvo)?.label ?? h.agenteAlvo;
    byAgent.set(chave, [...(byAgent.get(chave) ?? []), h]);
  }

  async function decide(
    hypothesisId: string,
    action: 'accept' | 'dismiss',
  ) {
    try {
      if (action === 'accept') {
        await acceptHypothesis(projectId, hypothesisId);
      } else {
        await dismissHypothesis(projectId, hypothesisId);
      }
      await queryClient.invalidateQueries({ queryKey: ['hypotheses', projectId] });
    } catch {
      showToast({
        title: t('projectInsightsTab.toasts.genericErrorTitle'),
        message:
          action === 'accept'
            ? t('projectInsightsTab.toasts.acceptError')
            : t('projectInsightsTab.toasts.dismissError'),
        tone: 'danger',
      });
    }
  }

  // Reprocessamento explícito: substitui a análise anterior (que fica
  // `superseded`, nunca apagada). Gasta orçamento de verdade, daí o aviso
  // no título e o papel `maintainer` exigido pela api.
  async function reanalyze(sessionId: string) {
    try {
      await reanalyzeSession(projectId, sessionId);
      showToast({
        title: t('projectInsightsTab.toasts.reanalyzeQueuedTitle'),
        message: t('projectInsightsTab.toasts.reanalyzeQueuedMessage'),
      });
    } catch (erro) {
      if (erro instanceof ApiError && erro.status === 503) {
        // Distinto de qualquer outra falha — a api já manda a frase pronta
        // em `body.message` (ServiceUnavailableException do
        // ReanalyzeSessionUseCase).
        setPsicologoDesativado(true);
        showToast({
          title: t('projectInsightsTab.toasts.psychologistPausedTitle'),
          message: mensagemDaApi(
            erro,
            t('projectInsightsTab.toasts.psychologistPausedFallback'),
          ),
          tone: 'warning',
        });
      } else {
        showToast({
          title: t('projectInsightsTab.toasts.genericErrorTitle'),
          message: t('projectInsightsTab.toasts.reanalyzeError'),
          tone: 'danger',
        });
      }
    }
  }

  return (
    // AT-327: a aba começa no topo como as outras — `.arch` (margem de 28px)
    // é de SEÇÃO que vem depois de outra, e deixava o título 29px abaixo.
    <div>
      {/* P17 (AT-945): o estado do Psicólogo aparece sempre, com hipótese ou
          sem. Pausado, o cartão traz "Reativar" — que só EXPLICA como religar
          (env var + reinício do engine, RN-117); não chama a api. */}
      {status && (
        <div className={styles.estado} data-testid="estado-do-psicologo">
          <div className={styles.estadoIcone}>
            {psicologoBloqueado ? <Pause size={18} /> : <Lightbulb size={18} />}
          </div>
          <div className={styles.estadoCorpo}>
            <div className={styles.estadoTitulo}>
              <strong>
                {t(psicologoBloqueado ? 'projectInsightsTab.estado.pausado' : 'projectInsightsTab.estado.ativo')}
              </strong>
              <Badge tone="muted">
                {t(psicologoBloqueado ? 'projectInsightsTab.estado.pausadoTag' : 'projectInsightsTab.estado.ativoTag')}
              </Badge>
            </div>
            <div>
              {t(
                psicologoBloqueado
                  ? 'projectInsightsTab.estado.pausadoDescricao'
                  : 'projectInsightsTab.estado.descricao',
              )}
            </div>
            {psicologoBloqueado && (
              <Popover>
                <PopoverTrigger
                  render={<Button variant="secondary" size="sm" className={styles.estadoAcao} />}
                >
                  {t('projectInsightsTab.estado.reativar')}
                </PopoverTrigger>
                <PopoverContent>
                  <PopoverDescription>
                    {t('projectInsightsTab.estado.reativarExplicacao')}
                  </PopoverDescription>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      )}
      {/* Os três estados da RN-088, com o ERRO antes do vazio: `data ?? []`
          seguido de `length === 0` fazia a api respondendo 429 dizer "sem
          hipóteses ainda", que é indistinguível de um projeto que o Psicólogo
          nunca analisou. RN-454: o estado vazio TAMBÉM se divide em dois —
          pausado por decisão (sabido) vs. genuinamente ainda sem análise —
          e cada um tem a frase que É verdade para ele. */}
      {hypothesesQuery.isError ? (
        <ErroDeCarregamento
          titulo={t('projectInsightsTab.errorTitle')}
          erro={hypothesesQuery.error}
          onTentarDeNovo={() => void hypothesesQuery.refetch()}
        />
      ) : hypothesesQuery.data === undefined ? (
        <div className={styles.sectionSub}><Shimmer>{t('projectInsightsTab.loading')}</Shimmer></div>
      ) : all.length === 0 ? (
        <>
        {/* Pausado, o cartão de estado já diz; o vazio só cabe com o Psicólogo ativo. */}
        {!psicologoBloqueado && (
          <EmptyState
            titulo={t('projectInsightsTab.emptyTitle')}
            icone={<Lightbulb size={18} />}
          >
            {t('projectInsightsTab.empty')}
          </EmptyState>
        )}
        {/* Cartão de exemplo, rotulado: nunca é uma hipótese real, e Aceitar/
            Recusar ficam inertes para mostrar a forma sem prometer efeito. */}
        <div className={styles.exemplo} data-testid="exemplo-de-hipotese">
          <div className={styles.sectionHeader}>{t('projectInsightsTab.exemplo.titulo')}</div>
          <div className={styles.exemploCartao}>
            <div className={styles.exemploCabecalho}>
              <span className={styles.exemploIcone} aria-hidden="true">Ψ</span>
              <strong>{t('projectInsightsTab.exemplo.rotulo')}</strong>
              <Badge tone="muted">{t('projectInsightsTab.exemplo.tag')}</Badge>
              <span className={styles.exemploAncora}>{t('projectInsightsTab.exemplo.ancorada')}</span>
            </div>
            <p>{t('projectInsightsTab.exemplo.observacao')}</p>
            <p className={styles.exemploSugestao}>{t('projectInsightsTab.exemplo.sugestao')}</p>
            <div className={styles.exemploAcoes}>
              <Button variant="secondary" size="sm" disabled title={t('projectInsightsTab.exemplo.inerte')}>
                {t('projectInsightsTab.exemplo.aceitar')}
              </Button>
              <Button variant="ghost" size="sm" disabled title={t('projectInsightsTab.exemplo.inerte')}>
                {t('projectInsightsTab.exemplo.recusar')}
              </Button>
            </div>
          </div>
        </div>
        </>
      ) : (
        <>
          <div className={styles.sectionSub}>
            {t('projectInsightsTab.summary', {
              count: all.length,
              pending: pending.length,
            })}
          </div>

          {/* Faixa de análises: é aqui que o custo distinto entre triagem
              leve e pesada fica visível — some do metering por sessão. */}
          {runs.length > 0 && (
            <div className={styles.analysisStrip}>
              {runs.map((run) => (
                <div key={run.id} className={styles.analysisRow}>
                  <Badge tone={run.tier === 'pesada' ? 'accent' : 'muted'}>
                    {t('projectInsightsTab.analysisStrip.tier', { tier: run.tier })}
                  </Badge>
                  <Link
                    to="/projects/$projectId/sessions/$sessionId"
                    params={{ projectId, sessionId: run.sessionId }}
                    className={styles.analysisSession}
                  >
                    {t('projectInsightsTab.analysisStrip.sessionLabel', {
                      id: idCurtoDaSessao(run.sessionId),
                    })}
                  </Link>
                  <span className={styles.analysisMeta}>
                    {t('projectInsightsTab.analysisStrip.metaEvents', {
                      count: run.eventCountAtAnalysis,
                    })}
                    {' · '}
                    {t('projectInsightsTab.analysisStrip.metaHypotheses', {
                      count: run.hypothesisCount,
                    })}
                  </span>
                  <span className={styles.analysisCost}>
                    {formatMicros(run.costMicros)}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className={styles.analysisReanalyze}
                    onClick={() => reanalyze(run.sessionId)}
                    disabled={psicologoBloqueado}
                    legenda={t('projectInsightsTab.analysisStrip.reanalyzeTitleEnabled')}
                  >
                    <RefreshCw aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          )}


          {[...byAgent.entries()].map(([agenteAlvo, group]) => (
            <div key={agenteAlvo}>
              <div className={styles.archLabel}>
                {agenteAlvo}
                <Badge tone="muted">{group.length}</Badge>
              </div>
              <div className={styles.moduleGrid}>
                {group.map((hypothesis) => (
                  <HypothesisCard
                    key={hypothesis.id}
                    hypothesis={hypothesis}
                    projectId={projectId}
                    onAccept={() => decide(hypothesis.id, 'accept')}
                    onDismiss={() => decide(hypothesis.id, 'dismiss')}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
