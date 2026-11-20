import { useEffect, useState } from 'react';
import { Ajuda } from '@/components/ui/Ajuda';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidarBindingsResolvidos, useBindingsDosAgentes } from '../lib/bindings-resolvidos';
import {
  useActiveExecutionSession,
  useArchitecture,
  useBacklog,
  useCurrentWorkspace,
  useCurrentWorkspaceWithRole,
  useHandoffs,
  useProjectPendingActions,
  useProjectsSummary,
  useSessionEvents,
  useSessionTokenUsage,
} from '../lib/hooks';
import {
  listAgentAutonomy,
  listModels,
  mensagemDaApi,
  listBacklog,
  rearmDevAgent,
  setAgentAutonomy,
  setAgentModelBinding,
  wakeDevAgent,
} from '../lib/api-client';
import {
  autonomyActionTypeFor,
  breakerReasonFor,
  deriveAgentRoster,
  groupRosterByArea,
  isExecutorAgentId,
  isExecutorGroup,
  subagentOutcomeLabel,
} from '../lib/agent-status';
import { ordenarExecutores, resolverVisao, type VisaoDaExecucao } from '../lib/execucao-tabela';
import { deriveExecutionProgress, execucaoParadaDe } from '../lib/execution';
import { connectSessionHeartbeat } from '../lib/session-channel';
import { INTERVALO_DO_PROJETO_MS, criarInvalidadorDoCanal } from '../lib/canal-vivo';
import { rotuloDaSessao } from '../lib/session-label';
import { roleAtLeast } from '../lib/roles';
import { PendenciasDeOutrasSessoes } from '../components/PendenciasDeOutrasSessoes';
import { ModoAutomaticoDoTime } from '../components/ModoAutomaticoDoTime';
import { agentesDaOfertaEmLote } from '../components/ModoAutomaticoDoTime.helpers';
import { PararExecucao } from '../components/PararExecucao';
import type { AutonomyMode } from '../components/AgentCard';
import { AgentTimelineTree } from '../components/AgentTimelineTree';
import { Alert } from '../components/ui/Alert';
import { AcoesDaExecucao } from './AcoesDaExecucao';
import { ResumoDaExecucao } from './ResumoDaExecucao';
import { DestravarExecucao } from './DestravarExecucao';
import { textoDaExecucaoParada } from './DestravarExecucao.helpers';
import { Badge } from '../components/ui/Badge';
import { Users } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import { useToast } from '../components/ui/ToastProvider.helpers';
import { AGENT_AUTONOMY_ALL_ACTIONS, type AgentAutonomyActionType } from '../lib/api-types';
import { nomeDoAgente } from '../lib/agents';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import { IndicadoresDaExecucao } from './IndicadoresDaExecucao';
import { TabelaDeExecutores, type LinhaDeExecutor } from './TabelaDeExecutores';
import tabela from './ProjectExecutorsTab.module.css';
import styles from './ProjectOverviewTab.module.css';

/**
 * A aba Executores (FASE 27, RN-121) — dev agent e QA num lugar próprio, fora
 * do "Time de agentes" da Visão geral.
 *
 * O que forçou a separação: dev-<módulo> e QA (lead + subespecialidades) são
 * quem IMPLEMENTA e VERIFICA — a pergunta que quem acompanha execução faz é
 * diferente de "como está o time inteiro", e no grid misturado com
 * Criativo/PO/Arquiteto/Infra a resposta ficava perdida no meio de agentes
 * que não mudam de estado a cada poll.
 *
 * A tela reusa a MESMA renderização da Visão geral (`AgentTeamGrid`,
 * `AgentTimelineTree`) — nada foi reinventado aqui, só filtrado: quem decide
 * "é executor?" é `isExecutorGroup`/`isExecutorAgentId`
 * (`lib/agent-status.ts`), a mesma função que a Visão geral usa para EXCLUIR
 * os mesmos agentes. Uma decisão errada nos dois lugares apareceria como
 * duplicação ou sumiço, nunca como divergência silenciosa.
 *
 * A busca de dados é INDEPENDENTE da Visão geral — são duas rotas de aba
 * montadas uma de cada vez, e cada componente de rota resolve os próprios
 * hooks; o react-query dedup pela `queryKey` evita a requisição em dobro
 * quando as duas já rodaram na mesma sessão.
 *
 * A SESSÃO que a aba lê é a de execução VIGENTE (RN-139,
 * `useActiveExecutionSession`) — `active` com `execution.activated` gravado —
 * e NUNCA a mais recente do projeto. Era `useLatestSession` antes: funcionava
 * só por coincidência (a sessão de execução costuma ser a mais nova) e
 * silenciosamente passava a olhar qualquer sessão nova criada depois (uma
 * ideação, um chat), vazia de eventos de dev/QA, sem pista nenhuma na tela. O
 * indicador logo abaixo do título mostra sempre QUAL sessão está sendo
 * exibida, nos três estados da RN-088.
 */
export function ProjectExecutorsTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('executors');
  const { t: tParada } = useTranslation('sessionPage');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  // AT-298: decidir pede `developer` no ENDPOINT (RN-102) — o mesmo papel de
  // WORKSPACE que a tela de Sessão lê, com a mesma lacuna declarada (RN-471).
  const { data: workspaceComPapel } = useCurrentWorkspaceWithRole();
  const podeDecidir = roleAtLeast(workspaceComPapel?.role, 'developer');
  // RN-661 (AT-315): ligar o modo automático pede `maintainer` no endpoint
  // (`PUT .../agent-autonomy`, RN-153) — o mesmo papel de WORKSPACE, com a
  // mesma lacuna declarada, e a tela diz isso em texto.
  const podeLigarModoAutomatico = roleAtLeast(workspaceComPapel?.role, 'maintainer');
  const executionSessionQuery = useActiveExecutionSession(projectId);
  const executionSession = executionSessionQuery.session;
  const sessionId = executionSession?.id;
  // RN-794 (AT-469): o backlog só é lido quando a leitura CONFIRMOU que não há
  // execução vigente — é ele que diz quantas tarefas ficaram pendentes. Com a
  // execução de pé a query fica desligada (nenhuma requisição a mais, RN-632),
  // e no ritmo de projeto quando ligada.
  const semExecucaoVigente = executionSessionQuery.isSuccess && !executionSession;
  const backlogQuery = useBacklog(semExecucaoVigente ? projectId : undefined, INTERVALO_DO_PROJETO_MS);
  // Com a execução de pé o backlog NÃO é lido aqui (RN-794, RN-632): o que a tela mostra vem do
  // cache que o trilho do projeto já mantém na MESMA chave, sem requisição nova.
  const backlogEmCache = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => listBacklog(projectId),
    enabled: false,
  });
  const epicsDaTela = backlogQuery.data ?? backlogEmCache.data;
  const eventsQuery = useSessionEvents(projectId, sessionId);
  const events = eventsQuery.data?.items ?? [];
  // Quem espera decisão sai da fila do PROJETO (AT-297, RN-638): a mesma
  // chave do contador do trilho, no ritmo de projeto, avisada pelo canal
  // abaixo no `proposed_action.*` (AT-299) — nenhuma requisição a mais.
  const pendentesQuery = useProjectPendingActions(projectId, undefined, INTERVALO_DO_PROJETO_MS);
  const pendentes = pendentesQuery.data ?? [];
  // Periferia de PROJETO (AT-278): o `module_map` só muda quando o Arquiteto
  // escreve, e nenhum canal desta aba avisa disso — ritmo de projeto.
  const { data: architecture } = useArchitecture(projectId, INTERVALO_DO_PROJETO_MS);
  const handoffsQuery = useHandoffs(projectId, sessionId);
  const handoffs = handoffsQuery.data ?? [];

  // `execution.activated` é dos PRIMEIROS eventos de uma sessão de execução —
  // `useSessionEvents` só traz os ÚLTIMOS 200 (`latest: true`), então numa
  // sessão real ele sai da janela e `events.some(...)` volta a mentir
  // "nunca ativou". O resumo do workspace (RN-090) agrega TODOS os eventos
  // no backend (`projects-summary.repository.ts`), então é ele — não a
  // janela — quem decide se o roster de dev agents aparece.
  const { data: workspace } = useCurrentWorkspace();
  const summaryQuery = useProjectsSummary(workspace?.id);
  const projectSummary = summaryQuery.data?.find((s) => s.projectId === projectId);
  const pendingActionAgentIds = new Set(
    pendentes.filter((a) => a.status === 'pending').map((a) => a.actor.id),
  );
  // RN-568 — a presença de QA/SecOps (`gatesEverOpened`) e dos membros de
  // área (`delegatedSubagents`) sofria da MESMA classe de defeito acima
  // (`pr.gate_changed`/`infra.gate_changed` e delegações saindo da janela
  // numa sessão longa). O resumo já agrega os dois sobre a sessão inteira, e
  // vai como `agregado` — que SOMA à janela, nunca a substitui; a regra de
  // presença continua uma só (`rosterFromFacts`).
  //
  // A guarda de sessão NÃO é enfeite aqui: o resumo agrega a sessão mais
  // RECENTE do projeto, e esta aba lê a sessão de EXECUÇÃO vigente (RN-139).
  // Uma ideação aberta depois faz as duas divergirem, e aí o agregado é de
  // OUTRA sessão — a janela volta a decidir sozinha, como antes.
  // AT-130: `executionActivated` passa pela MESMA guarda — antes era lido do
  // resumo sem ela, e o resumo de outra sessão apagava (ou forjava) os dev agents.
  const agregado =
    projectSummary && projectSummary.latestSessionId === sessionId
      ? {
          executionActivated: projectSummary.roster.executionActivated,
          gatesEverOpened: projectSummary.roster.gatesEverOpened,
          delegatedSubagents: projectSummary.roster.delegatedSubagents,
        }
      : undefined;
  const roster = deriveAgentRoster(
    events,
    architecture?.moduleMap,
    false,
    handoffs,
    pendingActionAgentIds,
    agregado,
  );
  const progressByAgent = deriveExecutionProgress(events);
  const { data: tokenUsage } = useSessionTokenUsage(projectId, sessionId);

  const { data: modelsByCategory } = useQuery({
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

  const rosterGroups = groupRosterByArea(roster);
  const executorGroups = rosterGroups.filter(isExecutorGroup);
  const executorRosterIds = new Set(
    executorGroups.flatMap((group) =>
      group.kind === 'solo' ? [group.entry.id] : [group.lead.id, ...group.members.map((m) => m.id)],
    ),
  );
  const executorRoster = roster.filter((r) => executorRosterIds.has(r.id));
  const executorEvents = events.filter(
    (e) => e.actor.kind === 'agent' && isExecutorAgentId(e.actor.id),
  );
  const paradaVigente = execucaoParadaDe(events);
  const workingCount = executorRoster.filter((r) => r.status === 'trabalhando').length;
  const waitingCount = executorRoster.filter((r) => r.status === 'aguardando').length;

  useEffect(() => {
    if (!sessionId || executionSession?.status !== 'active') return;
    // AT-278 (RN-632): o aviso passa pelo MESMO invalidador da tela de
    // Sessão (RN-579). Antes cada `event.appended` invalidava os eventos NA
    // HORA, sem janela — uma rajada de `tool.call`/`tool.result` de dev agent
    // (10/s) virava 630 GET de eventos por minuto só nesta aba, o dobro do
    // teto do usuário. E as ações/handoffs, que o canal vivo deixa no
    // fallback de 15s, nunca eram invalidadas por aqui: a proposta de um dev
    // agent levava até 15s para aparecer.
    const invalidador = criarInvalidadorDoCanal(queryClient, projectId, sessionId);
    const disconnect = connectSessionHeartbeat(projectId, sessionId, {
      onEvent: ({ type }) => invalidador.aoEvento(type, false),
      onAgentStatus: () => invalidador.aoEvento('agent.status', false),
    });
    return () => {
      disconnect();
      invalidador.encerrar();
    };
  }, [sessionId, executionSession?.status, projectId, queryClient]);

  // AT-916: a troca de modelo pelo cartão pede `developer` no endpoint (`PUT agent-bindings`).
  async function handleModelChange(agentId: string, modelId: string) {
    try {
      await setAgentModelBinding(projectId, agentId, modelId);
      await invalidarBindingsResolvidos(queryClient, projectId);
    } catch {
      showToast({ title: t('tab.toast.modelError'), message: nomeDoAgente(agentId), tone: 'danger' });
    }
  }

  async function handleAutonomyChange(agentId: string, actionType: string, mode: AutonomyMode) {
    try {
      await setAgentAutonomy(projectId, {
        agentId,
        actionType: actionType as AgentAutonomyActionType,
        mode: mode === 'auto' ? 'auto_approve' : 'require_approval',
      });
      await queryClient.invalidateQueries({ queryKey: ['agent-autonomy', projectId] });
    } catch {
      showToast({
        title: t('tab.toast.autonomyError'),
        message: `${nomeDoAgente(agentId)} · ${actionType}`,
        tone: 'danger',
      });
    }
  }

  async function handleRearm(agentId: string) {
    if (!sessionId) return;
    try {
      await rearmDevAgent(projectId, sessionId, agentId);
      await queryClient.invalidateQueries({
        queryKey: ['session-events', projectId, sessionId],
      });
      showToast({ title: t('tab.toast.rearmed'), tone: 'success' });
    } catch {
      showToast({ title: t('tab.toast.rearmError'), message: agentId, tone: 'danger' });
    }
  }

  // AT-906: o 409 do engine (agente fora de `idle`) chega com a frase dele.
  async function handleWake(agentId: string) {
    if (!sessionId) return;
    try {
      await wakeDevAgent(projectId, sessionId, agentId);
      await queryClient.invalidateQueries({ queryKey: ['session-events', projectId, sessionId] });
      showToast({ title: t('tab.toast.woken'), tone: 'success' });
    } catch (erro) {
      showToast({ title: t('tab.toast.wakeError'), message: mensagemDaApi(erro), tone: 'danger' });
    }
  }

  // AT-970 (RN-1467): a tabela lê a regra de autonomia como o cartão lia — a curinga `*` ligada é o
  // modo automático (RN-153) e manda sobre a do tipo representativo.
  function regraDeAutonomia(agentId: string) {
    const tipo = autonomyActionTypeFor(agentId);
    const curinga = autonomyRules?.find((a) => a.agentId === agentId && a.actionType === AGENT_AUTONOMY_ALL_ACTIONS);
    const regra = curinga ?? autonomyRules?.find((a) => a.agentId === agentId && a.actionType === tipo);
    return { curinga, regra, tipo: curinga ? AGENT_AUTONOMY_ALL_ACTIONS : tipo };
  }
  const idsDeLead = new Set(executorGroups.flatMap((g) => (g.kind === 'area' ? [g.lead.id] : [])));
  const idsDeMembro = new Set(executorGroups.flatMap((g) => (g.kind === 'area' ? g.members.map((m) => m.id) : [])));
  const linhasDaTabela: LinhaDeExecutor[] = ordenarExecutores(executorRoster, idsDeLead).map((entry) => {
    const { id, status } = entry;
    const progresso = progressByAgent.get(id);
    const desfecho = idsDeMembro.has(id) ? subagentOutcomeLabel(events, id) : undefined;
    const { curinga, regra } = regraDeAutonomia(id);
    return {
      entry,
      lead: idsDeLead.has(id),
      tarefa:
        status === 'travado'
          ? { label: breakerReasonFor(events, id) ?? t('agentStatus.circuitBreaker.default') }
          : progresso?.taskTitle
            ? { label: progresso.taskTitle, branch: progresso.branch }
            : desfecho
              ? { label: desfecho }
              : undefined,
      modelId: bindingDoAgente(id)?.modelId,
      custoMicros: tokenUsage?.find((u) => u.actorId === id)?.costMicros,
      autonomia: idsDeMembro.has(id) ? undefined : regra?.mode === 'auto_approve' ? 'auto' : 'manual',
      autonomiaHint: curinga?.mode === 'auto_approve' ? t('agentCard.autonomy.autoModeHint') : undefined,
    };
  });
  const modelosDaTabela = allModels.map((m) => ({ id: m.id, name: m.displayName }));
  const sessaoAtiva = executionSession?.status === 'active';

  // RN-1466: a escolha entre Executores e Linha do tempo mora na URL (`?visao=`); trocar não recarrega.
  const [visao, setVisao] = useState<VisaoDaExecucao>(() =>
    resolverVisao(typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('visao')),
  );
  function trocarVisao(nova: VisaoDaExecucao) {
    setVisao(nova);
    try {
      const url = new URL(window.location.href);
      if (nova === 'executores') url.searchParams.delete('visao');
      else url.searchParams.set('visao', nova);
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // sem `window` (teste/SSR): só a troca local
    }
  }

  // Sem `semRespiro` no registro: a moldura do `ProjectPage` já dá os 24px de respiro e a rolagem
  // própria (`.body`, `ProjectPage.module.css`).
  return (
    <div>
      {/* v9 (AT-943): com a execução parada o topo é só o cartão de chamada. */}
      {executionSessionQuery.isError ? (
        <ErroDeCarregamento
          titulo={t('tab.sessionError.title')}
          erro={executionSessionQuery.error}
          onTentarDeNovo={() => void executionSessionQuery.refetch()}
        />
      ) : executionSessionQuery.isPending ? (
        <div className={styles.sectionSub} aria-busy="true">
          <Skeleton width={220} height={18} />
        </div>
      ) : !executionSession ? null : (
        // v11 (AT-970): uma linha — título, estado, sessão e contagem; à direita a visão e "Parar execução".
        // Indicador de QUAL sessão a aba olha (RN-139, os três estados da RN-088, erro antes de vazio).
        <div className={tabela.topo}>
          <div className={tabela.titulo}>
            <h2 className={styles.sectionHeader}>{t('tab.title')}</h2>
            <Ajuda assunto={t('tab.title')}>{t('tab.subtitle')}</Ajuda>
            <Badge tone="success" dot>
              {t(`sessionsTab.status.${executionSession.status}`, {
                ns: 'sessions',
                defaultValue: executionSession.status,
              })}
            </Badge>
            <span className={styles.sectionCount}>
              {t('tab.sessao')}{' '}
              <Link
                to="/projects/$projectId/sessions/$sessionId"
                params={{ projectId, sessionId: executionSession.id }}
              >
                {rotuloDaSessao(executionSession.id, executionSession.name)}
              </Link>{' '}
              ·{' '}
              {t('tab.summary', {
                count: executorRoster.length,
                working: workingCount,
                waiting: waitingCount,
              })}
            </span>
          </div>
          <div className={tabela.controles}>
            <ToggleGroup
              value={[visao]}
              onValueChange={(v) => v[0] && trocarVisao(resolverVisao(v[0]))}
              variant="outline"
              size="sm"
              aria-label={t('tab.visao.rotulo')}
            >
              <ToggleGroupItem value="executores">{t('tab.visao.executores')}</ToggleGroupItem>
              <ToggleGroupItem value="linha-do-tempo">{t('tab.visao.linhaDoTempo')}</ToggleGroupItem>
            </ToggleGroup>
            {sessaoAtiva && sessionId && (
              <PararExecucao projectId={projectId} sessionId={sessionId} podeParar={podeDecidir} compacto />
            )}
          </div>
        </div>
      )}

      {/* Parada: o cartão de chamada, as áreas e a fila (a execução não está de pé para mostrar a tabela). */}
      {executionSessionQuery.isSuccess && semExecucaoVigente && (
        <ResumoDaExecucao
          projectId={projectId}
          epics={epicsDaTela}
          parada={semExecucaoVigente}
          grupos={executorGroups}
          budget={projectSummary?.budget}
        />
      )}

      {sessionId && (
        <>
          {/* RN-1061 (AT-800): a execução parada atrás de tarefa bloqueada ou de agente travado — o
              mesmo aviso e os mesmos botões do chat, numa faixa só. */}
          {sessaoAtiva && paradaVigente && (
            <Alert tone="danger" role="status">
              <span className={tabela.faixa}>
                <span data-testid="execucao-parada">{textoDaExecucaoParada(tParada, paradaVigente)}</span>
                <DestravarExecucao
                  projectId={projectId}
                  sessionId={sessionId}
                  parada={paradaVigente}
                  podeDecidir={podeDecidir}
                />
              </span>
            </Alert>
          )}

          {sessaoAtiva && summaryQuery.isSuccess && workingCount === 0 && (
            <Alert tone="warning" role="status">
              {t('tab.idleWarning')}
            </Alert>
          )}

          {visao === 'executores' && <IndicadoresDaExecucao epics={epicsDaTela} tokenUsage={tokenUsage} />}

          {visao === 'linha-do-tempo' ? (
            <>
              <div className={styles.sectionSub}>{t('tab.timeline.subtitle')}</div>
              <AgentTimelineTree events={executorEvents} projectId={projectId} />
            </>
          ) : summaryQuery.isError ? (
            /* `executionActivated` vem do resumo agregado — os três estados da RN-088: sem eles, um
               "nenhum dev agent" de CARREGANDO fica indistinguível do vazio real. */
            <ErroDeCarregamento
              titulo={t('tab.rosterError.title')}
              erro={summaryQuery.error}
              onTentarDeNovo={() => void summaryQuery.refetch()}
            />
          ) : summaryQuery.isPending ? (
            <div className={styles.sectionSub} aria-busy="true">
              <Skeleton width={220} height={18} />
            </div>
          ) : executorGroups.length === 0 ? (
            <EmptyState titulo={t('tab.noExecutorsTitle')} icone={<Users size={18} />}>{t('tab.noExecutors')}</EmptyState>
          ) : (
            <TabelaDeExecutores
              projectId={projectId}
              sessionId={sessionId}
              linhas={linhasDaTabela}
              modelos={modelosDaTabela}
              modelDisabledReason={podeDecidir ? undefined : t('tab.modelSemPapel')}
              onModelChange={handleModelChange}
              onAutonomyChange={(id, modo) => void handleAutonomyChange(id, regraDeAutonomia(id).tipo, modo)}
              onRearm={handleRearm}
              onWake={handleWake}
            />
          )}

          {/* AT-970: da oferta em diante vem DEPOIS da tabela, para ela caber na primeira tela. RN-661 (AT-315): no início da execução, a oferta de ligar o modo automático para o time de
              uma vez. Some quando todos já estão em automático; desligar segue no menu da linha. */}
          {visao === 'executores' && sessaoAtiva && executorRoster.length > 0 && (
            <ModoAutomaticoDoTime
              projectId={projectId}
              agentes={agentesDaOfertaEmLote(executorRoster.map((r) => r.id))}
              autonomyRules={autonomyRules}
              podeLigar={podeLigarModoAutomatico}
            />
          )}

          {/* AT-298: o que os agentes propuseram FORA da execução e a destrava (o `container_start` do
              Infra Lead nasce na sessão de chat; o `dev.blocked_by_container` aparece aqui). As da
              PRÓPRIA execução não entram: o roster as marca como `aguardando`. */}
          <PendenciasDeOutrasSessoes
            projectId={projectId}
            sessionId={sessionId}
            podeDecidir={podeDecidir}
            // RN-825/826: as filas de PR pronta e tarefa bloqueada são do chat; aqui o backlog só é lido sem execução vigente (RN-794).
            filasDoChat={false}
          />

          <AcoesDaExecucao projectId={projectId} sessionId={sessionId} epics={epicsDaTela} acoes={pendentes} events={events} podeDecidir={podeDecidir} />
        </>
      )}
    </div>
  );
}
