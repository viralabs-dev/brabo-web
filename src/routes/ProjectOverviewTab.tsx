import { Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBindingsDosAgentes } from '../lib/bindings-resolvidos';
import {
  useArchitecture,
  useCurrentWorkspace,
  useHandoffs,
  useActiveExecutionSession,
  useLatestSession,
  useProjectPendingActions,
  useProjectsSummary,
  useSessionEventHistory,
  useSessionEvents,
  useSessionTokenUsage,
} from '../lib/hooks';
import {
  mensagemDaApi,
  listAgentAutonomy,
  listModels,
  rearmDevAgent,
  setAgentAutonomy,
  wakeDevAgent,
} from '../lib/api-client';
import {
  deriveAgentRoster,
  groupRosterByArea,
  isExecutorGroup,
} from '../lib/agent-status';
import { deriveExecutionProgress } from '../lib/execution';
import { connectSessionHeartbeat } from '../lib/session-channel';
import { INTERVALO_DO_PROJETO_MS, criarInvalidadorDoCanal } from '../lib/canal-vivo';
import type { AutonomyMode } from '../components/AgentCard';
import { AgentTeamGrid } from '../components/AgentTeamGrid';
import { ActivityFeed } from '../components/ActivityFeed';
import { useLayoutMovel } from '../lib/layout-movel';
import { AmbienteDoProjeto } from '../components/AmbienteDoProjeto';
import { PrimeirosPassos } from '../components/PrimeirosPassos';
import { RodarNaSuaMaquina } from '../components/RodarNaSuaMaquina';
import { releSeInfraAbriuPr } from '../components/RodarNaSuaMaquina.helpers';
import { EmptyState } from '../components/ui/EmptyState';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import { Skeleton } from '../components/ui/Skeleton';
import {
  Item,
  ItemContent,
  ItemDescription,
ItemMedia,
} from '../components/shadcn/item';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/ToastProvider.helpers';
import type { AgentAutonomyActionType, Architecture } from '../lib/api-types';
import { addressableAgents, nomeDoAgente } from '../lib/agents';
import { FaixaPrecisaDeVoce } from '../components/FaixaPrecisaDeVoce';
import { ResumoDeTurno } from '../components/ResumoDeTurno';
import { custoDoPayload, gravadoDoPayload } from '../lib/resumo-de-turno';
import { passosDoTurno } from '../lib/passos-do-turno';
import { formatRelativeTime } from '../lib/time';
import { ProximoPasso } from '../components/ProximoPasso';
import styles from './ProjectOverviewTab.module.css';

interface ProjectOverviewTabProps {
  projectId: string;
}

export function ProjectOverviewTab({ projectId }: ProjectOverviewTabProps) {
  const { t } = useTranslation('overview');
  // Layout móvel (RN-643): as duas regiões EMPILHAM e rolam juntas — o
  // trilho de 360px ao lado do time não cabe numa tela de telefone.
  const movel = useLayoutMovel();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sessoesQuery = useLatestSession(projectId);
  const latestSession = sessoesQuery.latest;
  const sessionId = latestSession?.id;
  // ESTADO ATUAL — a cauda em poll, que alimenta a roster, a árvore e a
  // seção de execução. Continua `latest` de propósito: as três perguntam
  // "como está agora", e nenhuma delas pagina.
  const eventsQuery = useSessionEvents(projectId, sessionId);
  const events = eventsQuery.data?.items ?? [];
  // HISTÓRICO — o que a coluna de Atividade mostra, em páginas (RN-099).
  // Mesma `queryKey` da cauda por dentro: nenhuma requisição a mais por ciclo.
  const historico = useSessionEventHistory(projectId, sessionId);
  const execucao = useActiveExecutionSession(projectId);
  const { data: architecture } = useArchitecture(projectId);
  const handoffsQuery = useHandoffs(projectId, sessionId);
  const handoffs = handoffsQuery.data ?? [];

  // `execution.activated` é dos PRIMEIROS eventos de uma sessão de execução —
  // `useSessionEvents` só traz os ÚLTIMOS 200 (`latest: true`), então numa
  // sessão real ele sai da janela e `events.some(...)` volta a mentir "nunca
  // ativou" (roster de dev agents some, e a seção Execução volta a oferecer
  // "Ativar execução" para uma execução que já está rodando). O resumo do
  // workspace (RN-090) agrega TODOS os eventos no backend
  // (`projects-summary.repository.ts`), então é ele — não a janela — quem
  // decide.
  const { data: workspace } = useCurrentWorkspace();
  const summaryQuery = useProjectsSummary(workspace?.id);
  const projectSummary = summaryQuery.data?.find((s) => s.projectId === projectId);
  const executionActivated = projectSummary?.roster.executionActivated ?? false;
  // Agentes com ação pendente de aprovação entram como `aguardando` — antes
  // esse estado era inalcançável e o contador do header ficava sempre em 0.
  //
  // A fila é a do PROJETO (AT-297, RN-638), não a da sessão mais recente: um
  // dev agent esperando decisão na sessão de execução segue `aguardando`
  // mesmo com uma ideação aberta depois. Mesma chave do contador do trilho.
  const pendentesDoProjeto = useProjectPendingActions(projectId, undefined, INTERVALO_DO_PROJETO_MS);
  const pendingActionAgentIds = new Set(
    (pendentesDoProjeto.data ?? [])
      .filter((a) => a.status === 'pending')
      .map((a) => a.actor.id),
  );
  // RN-568 — a presença de QA/SecOps (`gatesEverOpened`) e dos membros de
  // área (`delegatedSubagents`) sofria da MESMA classe de defeito acima: o
  // `pr.gate_changed` e as delegações saem da janela de 200 numa sessão
  // longa. O resumo já agrega os dois sobre a sessão inteira, e vai como
  // `agregado` — que SOMA à janela, nunca a substitui. Só entra quando o
  // resumo é da MESMA sessão que a tela lê: sem resumo, ou com ele apontando
  // outra sessão, a janela decide sozinha, como antes.
  const agregado =
    projectSummary && projectSummary.latestSessionId === sessionId
      ? {
          gatesEverOpened: projectSummary.roster.gatesEverOpened,
          delegatedSubagents: projectSummary.roster.delegatedSubagents,
        }
      : undefined;
  const roster = deriveAgentRoster(
    events,
    architecture?.moduleMap,
    executionActivated,
    handoffs,
    pendingActionAgentIds,
    agregado,
  );
  // A task/branch corrente por agente já era derivada aqui perto, mas só
  // alimentava a ExecutionSection — o mesmo dev aparecia duas vezes na tela,
  // uma com o dado e outra sem.
  const progressByAgent = deriveExecutionProgress(events);
  const { data: tokenUsage } = useSessionTokenUsage(projectId, sessionId);

  const { data: modelsByCategory } = useQuery({
    // A chave carrega o projeto porque a lista é do WORKSPACE dele (ADR 0049):
    // um cache global devolveria a curadoria de outro workspace.
    queryKey: ['models', projectId],
    queryFn: () => listModels(projectId),
  });
  const allModels = modelsByCategory
    ? [...Object.values(modelsByCategory.local).flat(), ...Object.values(modelsByCategory.cloud).flat()]
    : [];
  // RN-654 (AT-339): os bindings do roster saem do LOTE, não de uma rota por
  // agente — os do catálogo pela mesma chave da aba Configurações.
  const bindingDoAgente = useBindingsDosAgentes(
    projectId,
    roster.map((r) => r.id),
  );
  const { data: autonomyRules } = useQuery({
    queryKey: ['agent-autonomy', projectId],
    queryFn: () => listAgentAutonomy(projectId),
  });

  // Áreas recolhidas no painel (Fase 8d) — vazio por padrão: a hierarquia
  // fica visível de cara, o usuário recolhe se quiser menos ruído.
  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set());
  function toggleArea(areaKey: string) {
    setCollapsedAreas((current) => {
      const next = new Set(current);
      if (next.has(areaKey)) next.delete(areaKey);
      else next.add(areaKey);
      return next;
    });
  }

  // Agrupamento por área vem de `groupRosterByArea` (lib/agent-status.ts,
  // compartilhado com o card do dashboard) — devolve ENTRADAS, não índices;
  // a grade acha cada entrada na roster inteira por `roster.indexOf(...)` na
  // hora de renderizar (roster é sempre pequena).
  const rosterGroups = groupRosterByArea(roster);

  // Fase 4a — painel do time ao vivo: qualquer evento persistido (Dev/QA/
  // SecOps/Infra) ou `agent.status` (Criativo/PO/Arquiteto/Infra) antecipa
  // o refetch do polling — mesmo princípio de SessionPage.tsx.
  useEffect(() => {
    if (!sessionId || latestSession?.status !== 'active') return;
    // AT-278 (RN-632): pelo MESMO invalidador da tela de Sessão (RN-579),
    // com janela por alvo — invalidar por aviso sem janela troca poll por
    // rajada. O backlog segue sendo invalidado a cada aviso (tasks bloqueadas
    // vêm dele, não do event log), só que também com janela.
    const invalidador = criarInvalidadorDoCanal(queryClient, projectId, sessionId);
    const disconnect = connectSessionHeartbeat(projectId, sessionId, {
      onEvent: ({ type }) => {
        invalidador.aoEvento(type, false, ['backlog']);
        releSeInfraAbriuPr(queryClient, projectId, type);
      },
      onAgentStatus: () => invalidador.aoEvento('agent.status', false),
    });
    return () => {
      disconnect();
      invalidador.encerrar();
    };
  }, [sessionId, latestSession?.status, projectId, queryClient]);

  // `setAgentAutonomy` existia no api-client desde a Fase 4a e nunca tinha
  // sido chamado de lugar nenhum — o toggle do design nunca renderizou.
  async function handleAutonomyChange(
    agentId: string,
    actionType: string,
    mode: AutonomyMode,
  ) {
    try {
      await setAgentAutonomy(projectId, {
        agentId,
        actionType: actionType as AgentAutonomyActionType,
        mode: mode === 'auto' ? 'auto_approve' : 'require_approval',
      });
      await queryClient.invalidateQueries({ queryKey: ['agent-autonomy', projectId] });
    } catch {
      showToast({
        title: t('team.autonomyErrorTitle'),
        message: `${nomeDoAgente(agentId)} · ${actionType}`,
        tone: 'danger',
      });
    }
  }

  // Única saída de idle_tripped (Fase 12b — RN-047): sem sessionId (sessão
  // não carregou ainda) o botão nem aparece — deriveAgentRoster depende de
  // eventos da sessão, então os dois chegam juntos na prática.
  async function handleRearm(agentId: string) {
    if (!sessionId) return;
    try {
      await rearmDevAgent(projectId, sessionId, agentId);
      await queryClient.invalidateQueries({
        queryKey: ['session-events', projectId, sessionId],
      });
      showToast({ title: t('team.rearmSuccess'), tone: 'success' });
    } catch {
      showToast({ title: t('team.rearmErrorTitle'), message: agentId, tone: 'danger' });
    }
  }

  // AT-906: o 409 do engine (agente fora de `idle`) chega com a frase dele.
  async function handleWake(agentId: string) {
    if (!sessionId) return;
    try {
      await wakeDevAgent(projectId, sessionId, agentId);
      await queryClient.invalidateQueries({ queryKey: ['session-events', projectId, sessionId] });
      showToast({ title: t('team.wakeSuccess'), tone: 'success' });
    } catch (erro) {
      showToast({ title: t('team.wakeErrorTitle'), message: mensagemDaApi(erro), tone: 'danger' });
    }
  }

  // FASE 27 — dev/QA saem daqui para a aba Executores (RN-121); o resto do
  // time (Criativo/PO/Arquiteto/Infra) continua na Visão geral. Contagem do
  // cabeçalho e a árvore abaixo passam a refletir só o que a Visão geral
  // ainda desenha — mostrar "10 agentes" com 6 cards na tela contaria dado
  // que sumiu do grid.
  const overviewGroups = rosterGroups.filter((group) => !isExecutorGroup(group));
  const overviewRosterIds = new Set(
    overviewGroups.flatMap((group) =>
      group.kind === 'solo' ? [group.entry.id] : [group.lead.id, ...group.members.map((m) => m.id)],
    ),
  );
  const overviewRoster = roster.filter((r) => overviewRosterIds.has(r.id));
  const [modo, setModo] = useState<'turnos' | 'eventos'>('turnos');
  const turnos = events.filter((e) => e.type === 'agent.response').slice(-10).reverse();
  const workingCount = overviewRoster.filter((r) => r.status === 'trabalhando').length;
  const conversacionais = new Set<string>(addressableAgents());
  const agenteTrabalhando = overviewRoster.find((r) => r.status === 'trabalhando' && conversacionais.has(r.id));
  const waitingCount = overviewRoster.filter((r) => r.status === 'aguardando').length;

  return (
    <div className={[styles.layout, movel && styles.layoutMovel].filter(Boolean).join(' ')}>
      <div className={styles.main}>
        <FaixaPrecisaDeVoce projectId={projectId} />
        {/* RN-708: o próximo passo de um projeto novo, enquanto faltar. */}
        <PrimeirosPassos
          projectId={projectId}
          temSessao={sessoesQuery.data ? !!latestSession : undefined}
        />
        {/* RN-855: como rodar o entregável, declarado pela Infra. */}
        <RodarNaSuaMaquina projectId={projectId} />
        <div className={styles.sectionRow}>
          <h2 className={styles.sectionHeader}>{t('team.title')}</h2>
          <span className={styles.sectionCount}>
            {t('team.summary', {
              count: overviewRoster.length,
              working: workingCount,
              waiting: waitingCount,
            })}
          </span>
        </div>
        <AgentTeamGrid
          roster={roster}
          groups={overviewGroups}
          events={events}
          bindingDoAgente={bindingDoAgente}
          allModels={allModels}
          tokenUsage={tokenUsage}
          autonomyRules={autonomyRules}
          progressByAgent={progressByAgent}
          collapsedAreas={collapsedAreas}
          onToggleArea={toggleArea}
          onAutonomyChange={handleAutonomyChange}
          onRearm={handleRearm}
          onWake={handleWake}
        />

      </div>

      <aside className={styles.aside}>
        {/* RN-1162: o próximo passo do projeto, da tabela ordenada. */}
        <ProximoPasso
          projectId={projectId}
          temSessao={sessoesQuery.data ? !!latestSession : undefined}
          agenteTrabalhando={agenteTrabalhando ? nomeDoAgente(agenteTrabalhando.id) : null}
          execucaoAtiva={execucao.isSuccess ? !!execucao.session : undefined}
          architecture={architecture}
        />
        <ArchitectureSummary projectId={projectId} architecture={architecture} />
        {/* Estado de ambiente ANTES da atividade: a atividade responde "o que
            aconteceu", e ela só se lê direito depois de saber onde o código
            roda e o que está de pé em volta. As duas consultas do bloco reusam
            chaves que esta página já busca — nenhuma requisição a mais. */}
        <div className={styles.ambiente}>
          <AmbienteDoProjeto projectId={projectId} />
        </div>

        <div className={styles.sectionRow}>
          <h2 className={styles.sectionHeader}>{t('activity.title')}</h2>
          <Button size="sm" variant="secondary" aria-pressed={modo === 'turnos'} onClick={() => setModo(modo === 'turnos' ? 'eventos' : 'turnos')}>
            {modo === 'turnos' ? t('activity.verEventos') : t('activity.verTurnos')}
          </Button>
          <span className={styles.sectionCount}>
            {t('activity.count', { count: historico.carregados })}
          </span>
        </div>
        {/* Os três estados, e o ERRO antes do vazio (RN-088): `!dados` é
            verdadeiro nos três, e colapsá-los era o que fazia a coluna dizer
            "nenhuma atividade" quando na verdade a api tinha recusado. */}
        {historico.isError ? (
          <ErroDeCarregamento
            titulo={t('activity.loadErrorTitle')}
            erro={historico.error}
            onTentarDeNovo={historico.refetch}
          />
        ) : sessoesQuery.data && !sessionId ? (
          // Sem sessão a consulta do histórico nem roda (`enabled: false`), e
          // o `isPending` dela é eterno: o esqueleto ficava parado ao lado de
          // "0 eventos". Sem sessão o vazio é um fato, e se diz (AT-372).
          <EmptyState>{t('activity.emptyNoSession')}</EmptyState>
        ) : modo === 'turnos' ? (
          <div className={styles.turnos}>
            {turnos.length === 0 && <EmptyState>{t('activity.turnosVazio')}</EmptyState>}
            {turnos.map((e) => (
              <Link
                key={e.id}
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: e.sessionId }}
                search={{ highlightEvent: e.id }}
              >
                <ResumoDeTurno
                  agente={nomeDoAgente(e.actor.id)}
                  passos={passosDoTurno(events, e).length}
                  gravado={gravadoDoPayload(e.payload)}
                  custo={custoDoPayload(e.payload)}
                  hora={formatRelativeTime(e.createdAt)}
                />
              </Link>
            ))}
          </div>
        ) : historico.isPending ? (
          <Skeleton height={180} />
        ) : (
          <ActivityFeed
            events={historico.events}
            agentOptions={roster.map((r) => ({ id: r.id, label: r.def.name }))}
            onLoadOlder={historico.carregarMaisAntigos}
            hasOlder={historico.temMaisAntigos}
            loadingOlder={historico.carregandoMaisAntigos}
          />
        )}
      </aside>
    </div>
  );
}

function ArchitectureSummary({
  projectId,
  architecture,
}: {
  projectId: string;
  architecture?: Architecture;
}) {
  const { t } = useTranslation('overview');
  const moduleCount = architecture?.moduleMap?.modules.length ?? 0;
  const diagramaGerado = architecture?.c4Diagram.status === 'gerado';

  return (
    <div className={styles.arch}>
      <h2 className={styles.sectionHeader}>{t('architectureSummary.title')}</h2>
      <Item variant="outline" size="sm">
       <ItemMedia variant="icon"><Info aria-hidden="true" /></ItemMedia>
       <ItemContent>
        <ItemDescription>
        {moduleCount > 0
          ? t('architectureSummary.summary', {
              count: moduleCount,
              status: diagramaGerado
                ? t('architectureSummary.statusGenerated')
                : t('architectureSummary.statusPending'),
            })
          : t('architectureSummary.emptyState')}{' '}
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          search={{ tab: 'arquitetura' }}
          className={styles.adrLink}
        >
          {t('architectureSummary.link')}
        </Link>
        </ItemDescription>
       </ItemContent>
      </Item>
    </div>
  );
}
