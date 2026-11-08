import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Ajuda } from '@/components/ui/Ajuda';
import { useQueryClient } from '@tanstack/react-query';
import {
  approveAction,
  approveAlwaysAction,
  denyAction,
  mensagemDaApi,
  rearmDevAgent,
  unblockTask,
} from '../lib/api-client';
import type { OpenQuestion, ProposedAction, Task } from '../lib/api-types';
import { usePrsProntas } from '../lib/prs-prontas';
import { useAgentesTravados } from '../lib/agentes-travados-query';
import { assinaturaDoBacklog, tarefasBloqueadas } from '../lib/prontas-e-bloqueadas';
import { Button } from './ui/Button';
import { PerguntasEmAberto } from './PerguntasEmAberto';
import { EVENTO_ABRIR_FILA, EVENTO_ABRIR_PERGUNTAS, usePerguntasEmAberto } from '../lib/perguntas-em-aberto';
import {
  CHAVE_DAS_PENDENCIAS_DO_PROJETO,
  separarPendenciasDeOutrasSessoes,
} from '../lib/pendencias-do-projeto';
import { hashtagDaSessao } from '../lib/session-label';
import { formatRelativeTime } from '../lib/time';
import { useDecisoesDaPolitica } from '../lib/decisao-da-politica-queries';
import { ApprovalCard } from './ApprovalCard';
import { useRegistrarAcoesNoBloco } from '../lib/acoes-no-bloco';
import { Disclosure } from './ui/Disclosure';
import { Alert } from './ui/Alert';
import { MergearNoChat } from '../routes/MergearNoChat';
import { entradasDaFila, saidasDaFila, tituloEDiagnostico, type IdsPorFila } from '../lib/saidas-da-fila';
import { PaginadorDaFila } from './PaginadorDaFila';
import { paginar } from '../lib/paginacao-de-fila';
import { ToggleGroup, ToggleGroupItem } from './shadcn/toggle-group';
import styles from './PendenciasDeOutrasSessoes.module.css';

type ChaveDeFila = 'perguntas' | 'aprovacoes' | 'merges' | 'prontas' | 'bloqueadas' | 'travados';

/** Nenhum evento local: estas ações são sempre de OUTRA sessão (AT-340). */
const SEM_EVENTOS_LOCAIS: readonly never[] = [];

interface PendenciasDeOutrasSessoesProps {
  projectId: string;
  /** A sessão em que o dono está: as ações dela o fio já desenha. */
  sessionId: string;
  /**
   * O papel alcança o mínimo do ENDPOINT de decisão (`developer`, RN-102)?
   * Quem não alcança VÊ a pendência e o controle fica inerte com o motivo em
   * texto — o que se tira é o controle, nunca a informação (ADR 0064).
   */
  podeDecidir: boolean;
  /**
   * Mostra as filas de PR pronta e de tarefa bloqueada (RN-825/826)? Só o chat
   * da sessão as quer; a aba Executores tem a própria leitura do backlog e o
   * orçamento dela (RN-794) passa `false`.
   */
  filasDoChat?: boolean;
}

/**
 * As pendências que os agentes propuseram em OUTRAS sessões do mesmo projeto
 * (tipicamente a de execução), decididas aqui, onde o dono está — AT-265,
 * RN-626.
 *
 * É ATALHO e nunca substituto (RN-467): renderiza o MESMO `ApprovalCard` e
 * chama os MESMOS endpoints, com o `sessionId` que a PRÓPRIA ação carrega. As
 * duas filas (aprovações e merges de PR) ficam com título e contagem
 * separados, nunca somadas. Nenhum teto muda: `git_merge` em branch protegida
 * segue `require_approval` incondicional (RN-418) — o clique é do humano —, e
 * `onActivateAutoMode` é omitido de propósito (ligar o modo automático é mudar
 * política, não decidir a ação que está na frente).
 */
export function PendenciasDeOutrasSessoes({
  projectId,
  sessionId,
  podeDecidir,
  filasDoChat = true,
}: PendenciasDeOutrasSessoesProps) {
  const { t } = useTranslation('sessionPage');
  const queryClient = useQueryClient();
  // RN-825/826 (AT-497): as PRs prontas e as tarefas bloqueadas, pelas MESMAS
  // leituras da aba PRs (`['code-pull-requests', id, 'open']`) e do backlog
  // (`['backlog', id]`) — cache compartilhado, sem poll novo apertado (o
  // backlog no ritmo de projeto, 15 s; a lista de PRs sem poll, o canal e a
  // mudança do backlog a invalidam — RN-841).
  const { prontas, consulta, backlogQuery } = usePrsProntas(projectId, sessionId, filasDoChat);
  const { aprovacoes, merges } = separarPendenciasDeOutrasSessoes(consulta.data, sessionId);
  // RN-841 (AT-510): a lista de PRs não tem poll; a PR do dev nasce na sessão
  // de EXECUÇÃO, cujo canal esta página não ouve. A tarefa que muda de status
  // ou de gate (a PR aberta, os gates aprovando) aparece na leitura de 15 s do
  // backlog que já existe — e é ela que relê a lista. Primeira leitura e
  // leitura igual não custam nada.
  const assinaturaAnterior = useRef<string | undefined>(undefined);
  const assinatura = backlogQuery.data ? assinaturaDoBacklog(backlogQuery.data) : undefined;
  useEffect(() => {
    if (assinatura === undefined) return;
    const anterior = assinaturaAnterior.current;
    assinaturaAnterior.current = assinatura;
    if (anterior !== undefined && anterior !== assinatura) {
      void queryClient.invalidateQueries({ queryKey: ['code-pull-requests', projectId] });
      // RN-847 (AT-518): o resumo do contexto lê os arquivos das mesmas PRs.
      void queryClient.invalidateQueries({ queryKey: ['session-context-summary', projectId] });
    }
  }, [assinatura, projectId, queryClient]);
  const [desbloqueio, setDesbloqueio] = useState<
    Record<string, { tom: 'ok' | 'erro'; texto: string } | 'enviando'>
  >({});
  const bloqueadas = tarefasBloqueadas(backlogQuery.data);
  // AT-799: agentes travados pelo disjuntor (RN-047), lidos dos eventos da
  // sessão de execução ativa (mesma chave da aba Executores, sem rota nova).
  const { sessionId: execucaoId, travados } = useAgentesTravados(filasDoChat ? projectId : undefined);
  const idsTravados = new Set(travados.map((a) => a.agentId));
  const [rearme, setRearme] = useState<
    Record<string, { tom: 'ok' | 'erro'; texto: string } | 'enviando'>
  >({});
  // RN-861 (AT-521): a fila "Perguntas em aberto", só no chat; sem poll —
  // o canal da sessão a relê (alvo `perguntas`).
  const perguntasQuery = usePerguntasEmAberto(filasDoChat ? projectId : undefined);
  const perguntas = perguntasQuery.data?.itens ?? [];
  // RN-884: as perguntas respondidas nesta tela, com o "Corrigir a história".
  const [respondidas, setRespondidas] = useState<OpenQuestion[]>([]);
  const totalDePerguntas = perguntasQuery.data?.total ?? 0;
  const total = aprovacoes.length + merges.length;

  // AT-680 (RN-975): cada fila pagina por si, de 3 em 3, no cliente e sobre a
  // lista que já foi lida (nenhuma query nova). A página é ajustada em render:
  // decidir o último item da última página a faz voltar.
  // Faixa de abas (AT-680): nenhuma nasce aberta; o conteúdo das fechadas
  // continua MONTADO (só `hidden`), para o "Responder perguntas" ter alvo e o
  // cartão de merge seguir registrado no fio (RN-843).
  const [aberta, setAberta] = useState<ChaveDeFila | null>(null);
  useEffect(() => {
    const abrir = () => setAberta('perguntas');
    // AT-753: o evento genérico abre qualquer aba (o `detail` é a fila).
    const abrirFila = (e: Event) => setAberta((e as CustomEvent<ChaveDeFila>).detail);
    window.addEventListener(EVENTO_ABRIR_PERGUNTAS, abrir);
    window.addEventListener(EVENTO_ABRIR_FILA, abrirFila);
    return () => {
      window.removeEventListener(EVENTO_ABRIR_PERGUNTAS, abrir);
      window.removeEventListener(EVENTO_ABRIR_FILA, abrirFila);
    };
  }, []);

  // AT-753 (UX-7): o que sai da fila não some em silêncio. Compara os ids da
  // leitura anterior com os da atual, por fila; as perguntas respondidas aqui
  // já têm o retorno delas (`respondidas`) e ficam de fora. Leitura que ainda
  // não chegou só faz entrar ids depois (o react-query guarda o dado), nunca sair.
  const [saidas, setSaidas] = useState<Partial<Record<ChaveDeFila, number>> | null>(null);
  const idsAnteriores = useRef<IdsPorFila | null>(null);
  const respondidasRef = useRef(respondidas);
  respondidasRef.current = respondidas;
  const assinaturaDeIds = JSON.stringify([
    aprovacoes.map((a) => a.id),
    merges.map((a) => a.id),
    prontas.map((p) => p.pr.id),
    bloqueadas.map((b) => b.id),
    perguntas.map((q) => q.questionId),
  ]);
  useEffect(() => {
    const [ap, me, pr, bl, pe] = JSON.parse(assinaturaDeIds) as string[][];
    const atual: IdsPorFila = { aprovacoes: ap!, merges: me!, prontas: pr!, bloqueadas: bl!, perguntas: pe! };
    const anterior = idsAnteriores.current;
    idsAnteriores.current = atual;
    if (!anterior) return;
    const novas = saidasDaFila(anterior, atual, new Set(respondidasRef.current.map((p) => p.questionId)));
    if (Object.keys(novas).length > 0) setSaidas(novas);
  }, [assinaturaDeIds]);
  // RN-1063 (AT-810): PR que ENTRA na fila de prontas abre a aba `prontas` sozinha
  // quando nenhuma está aberta (na primeira leitura, as que já esperavam contam).
  const prontasAnteriores = useRef<readonly string[] | null>(null);
  const idsDasProntas = prontas.map((p) => p.pr.id).join(',');
  useEffect(() => {
    const atual = idsDasProntas === '' ? [] : idsDasProntas.split(',');
    const novas = entradasDaFila(prontasAnteriores.current, atual);
    prontasAnteriores.current = atual;
    if (novas.length > 0) setAberta((a) => a ?? 'prontas');
  }, [idsDasProntas]);
  const painel = (chave: ChaveDeFila, conteudo: React.ReactNode) => (
    <div hidden={aberta !== chave}>{conteudo}</div>
  );
  const [paginas, setPaginas] = useState<Record<string, number>>({});
  const paginaDe = (chave: string) => paginas[chave] ?? 0;
  const irParaPagina = (chave: string) => (nova: number) =>
    setPaginas((atual) => ({ ...atual, [chave]: nova }));
  const pAprovacoes = paginar(aprovacoes, paginaDe('aprovacoes'));
  const pMerges = paginar(merges, paginaDe('merges'));
  const pProntas = paginar(prontas, paginaDe('prontas'));
  const pBloqueadas = paginar(bloqueadas, paginaDe('bloqueadas'));
  const pTravados = paginar(travados, paginaDe('travados'));
  const desenhadas = pAprovacoes.itens.length + pMerges.itens.length;

  // AT-340 (RN-656): o motivo da política de CADA card desenhado, lido pela
  // ação (`?actionId=`) na sessão que a própria ação carrega — a MESMA leitura
  // e o MESMO cache (`staleTime: Infinity`) da aba Aprovações, então a ação
  // que uma das duas telas já leu não custa nada à outra. Nenhuma destas ações
  // é da sessão aberta (é o que as separa), então o log da tela não cobre
  // nenhuma: `[]` e não `null`, que esperaria por um log que não vem. Só os
  // cards DESENHADOS pedem — o recorte segura o número de leituras no teto.
  const { decisoes, falhas } = useDecisoesDaPolitica(
    projectId,
    [...pAprovacoes.itens, ...pMerges.itens],
    SEM_EVENTOS_LOCAIS,
  );

  if (
    saidas === null &&
    total === 0 &&
    prontas.length === 0 &&
    bloqueadas.length === 0 &&
    travados.length === 0 &&
    perguntas.length === 0 &&
    respondidas.length === 0
  )
    return null;

  async function desbloquear(task: Task) {
    setDesbloqueio((d) => ({ ...d, [task.id]: 'enviando' }));
    try {
      await unblockTask(projectId, sessionId, task.id);
      setDesbloqueio((d) => ({ ...d, [task.id]: { tom: 'ok', texto: t('pendencias.bloqueadas.ok') } }));
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
    } catch (erro) {
      setDesbloqueio((d) => ({
        ...d,
        [task.id]: { tom: 'erro', texto: mensagemDaApi(erro, t('pendencias.bloqueadas.erro')) },
      }));
    }
  }

  async function rearmar(agentId: string) {
    if (!execucaoId) return;
    setRearme((d) => ({ ...d, [agentId]: 'enviando' }));
    try {
      await rearmDevAgent(projectId, execucaoId, agentId);
      setRearme((d) => ({ ...d, [agentId]: { tom: 'ok', texto: t('pendencias.travados.ok') } }));
      void queryClient.invalidateQueries({ queryKey: ['session-events', projectId, execucaoId] });
    } catch (erro) {
      setRearme((d) => ({
        ...d,
        [agentId]: { tom: 'erro', texto: mensagemDaApi(erro, t('pendencias.travados.erro')) },
      }));
    }
  }

  function cardDeDecisao(acao: ProposedAction) {
    return (
      <ApprovalCard
        key={acao.id}
        action={acao}
        detalheRecolhido
        decisaoDaPolitica={decisoes.get(acao.id)}
        bloqueio={podeDecidir ? undefined : t('pendencias.semPapel')}
        onApprove={() => decidir(acao, () => approveAction(projectId, acao.sessionId, acao.id))}
        onDeny={() => decidir(acao, () => denyAction(projectId, acao.sessionId, acao.id))}
        onAlwaysAllow={() =>
          decidir(acao, async () => {
            await approveAlwaysAction(projectId, acao.sessionId, acao.id);
            void queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
          })
        }
      />
    );
  }

  function invalidar(acao: ProposedAction) {
    void queryClient.invalidateQueries({
      queryKey: CHAVE_DAS_PENDENCIAS_DO_PROJETO(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: ['session-actions', projectId, acao.sessionId],
    });
    void queryClient.invalidateQueries({ queryKey: ['code-pull-requests', projectId] });
  }
  // Devolvem a promessa: o card segura os botões e diz a frase da api (AT-256),
  // e a lista se refaz MESMO na recusa.
  async function decidir(acao: ProposedAction, chamada: () => Promise<unknown>) {
    try {
      await chamada();
    } finally {
      invalidar(acao);
    }
  }

  // AT-318: o rótulo de origem sai UMA vez por sessão, não por card — com
  // três cards da mesma sessão ele se repetia entre um card e o seguinte e
  // parecia dizer respeito aos dois. A lista já vem na ordem da espera mais
  // longa; o grupo herda a ordem da primeira ação dele, e o tempo do rótulo é
  // o da mais antiga (é a espera que importa).
  const porSessao = (visiveis: ProposedAction[]) => {
    const grupos = new Map<string, ProposedAction[]>();
    for (const acao of visiveis) {
      const grupo = grupos.get(acao.sessionId);
      if (grupo) grupo.push(acao);
      else grupos.set(acao.sessionId, [acao]);
    }
    return [...grupos.entries()];
  };

  const fila = (
    chave: 'aprovacoes' | 'merges',
    pagina: ReturnType<typeof paginar<ProposedAction>>,
  ) =>
    pagina.total === 0 ? null : (
      <section className={styles.fila} aria-label={t(`pendencias.filas.${chave}`)}>
        <h4 className={styles.filaTitulo}>
          {t(`pendencias.filas.${chave}`)}
          {/* A contagem é DESTA fila e só dela. */}
          <span className={styles.contagem}>{pagina.total}</span>
        </h4>
        {porSessao(pagina.itens).map(([origem, acoes]) => (
          <div key={origem} className={styles.grupo}>
            <div className={styles.origem}>
              {t('pendencias.origem', {
                count: acoes.length,
                hashtag: hashtagDaSessao(origem),
                tempo: formatRelativeTime(acoes[0]!.createdAt),
              })}
            </div>
            {acoes.map((acao) => (
              <ApprovalCard
                key={acao.id}
                action={acao}
                // AT-318: detalhe fechado — empilhados, os detalhes abertos
                // deixavam um card à vista de três.
                detalheRecolhido
                // Carregando ou com a leitura falha, `undefined`: o card cala,
                // e a falha é dita UMA vez no topo (RN-180).
                decisaoDaPolitica={decisoes.get(acao.id)}
                bloqueio={podeDecidir ? undefined : t('pendencias.semPapel')}
                onApprove={() => decidir(acao, () => approveAction(projectId, acao.sessionId, acao.id))}
                onDeny={() => decidir(acao, () => denyAction(projectId, acao.sessionId, acao.id))}
                onAlwaysAllow={() =>
                  decidir(acao, async () => {
                    await approveAlwaysAction(projectId, acao.sessionId, acao.id);
                    void queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
                  })
                }
              />
            ))}
          </div>
        ))}
        <PaginadorDaFila
          fila={t(`pendencias.filas.${chave}`)}
          pagina={pagina}
          aoMudar={irParaPagina(chave)}
        />
      </section>
    );

  // Presença POR FILA no cabeçalho, visível com o bloco recolhido — cada fila
  // com o próprio número, nunca uma soma (RN-467).
  const contagens = {
    aprovacoes: aprovacoes.length,
    merges: merges.length,
    prontas: prontas.length,
    bloqueadas: bloqueadas.length,
    travados: travados.length,
    perguntas: totalDePerguntas,
  };
  const presenca = (['perguntas', 'aprovacoes', 'merges', 'prontas', 'bloqueadas', 'travados'] as const)
    .map((chave) => ({ chave, n: contagens[chave] }))
    .filter(({ n }) => n > 0)
    .map(({ chave, n }) => `${t(`pendencias.filas.${chave}`)} ${n}`)
    .join(' · ');

  return (
    <div className={styles.wrapper} data-testid="pendencias-de-outras-sessoes">
      <Disclosure
        titulo={t(filasDoChat ? 'pendencias.tituloDoProjeto' : 'pendencias.titulo')}
        trailing={<span className={styles.presenca}>{presenca}</span>}
        padraoAberto
        className={styles.disclosure}
        classNameCabecalho={styles.cabecalho}
      >
        {falhas > 0 && (
          <p className={styles.nota} data-testid="motivo-nao-lido">
            {t(
              falhas === desenhadas
                ? 'pendencias.motivoNaoLido.todas'
                : 'pendencias.motivoNaoLido.algumas',
              { count: falhas, total: desenhadas },
            )}
          </p>
        )}
        {saidas && (
          <div className={styles.saidas} data-testid="saidas-da-fila">
            <Alert tone="success" role="status">
              {t('pendencias.saidas.aviso', {
                lista: (Object.keys(saidas) as ChaveDeFila[])
                  .map((fila) => t(`pendencias.saidas.${fila}`, { count: saidas[fila] }))
                  .join(' · '),
              })}
            </Alert>
            <Button variant="secondary" onClick={() => setSaidas(null)}>
              {t('pendencias.saidas.dispensar')}
            </Button>
          </div>
        )}
        <ToggleGroup
          className={styles.abas}
          variant="outline"
          size="sm"
          aria-label={t('pendencias.abas')}
          value={aberta ? [aberta] : []}
          onValueChange={(v) => setAberta((v[0] as ChaveDeFila | undefined) ?? null)}
        >
          <Ajuda assunto={t('pendencias.abas')}>{t('pendencias.nota')}</Ajuda>
          {(['perguntas', 'aprovacoes', 'merges', 'prontas', 'bloqueadas', 'travados'] as const)
            .filter((chave) => contagens[chave] > 0 || (chave === 'perguntas' && respondidas.length > 0))
            .map((chave) => (
              <ToggleGroupItem key={chave} value={chave}>
                {t(`pendencias.filas.${chave}`)} {contagens[chave]}
              </ToggleGroupItem>
            ))}
        </ToggleGroup>
        <div className={styles.lista}>
          {painel('perguntas', <PerguntasEmAberto
            projectId={projectId}
            perguntas={perguntas}
            total={totalDePerguntas}
            tarefas={(backlogQuery.data ?? []).flatMap((e) =>
              (e.stories ?? []).flatMap((st) => st.tasks ?? []),
            )}
            historias={(backlogQuery.data ?? []).flatMap((e) => e.stories ?? [])}
            respondidas={respondidas}
            aoResponder={(p) => setRespondidas((atual) => [...atual, p])}
            aoDispensar={(id) =>
              setRespondidas((atual) => atual.filter((p) => p.questionId !== id))
            }
            podeCorrigir={podeDecidir}
          />)}
          {painel('aprovacoes', fila('aprovacoes', pAprovacoes))}
          {painel('merges', fila('merges', pMerges))}
          {painel('prontas', prontas.length > 0 && (
            <section
              className={styles.fila}
              aria-label={t('pendencias.filas.prontas')}
              data-testid="fila-prs-prontas"
            >
              <h4 className={styles.filaTitulo}>
                {t('pendencias.filas.prontas')}
                <span className={styles.contagem}>{prontas.length}</span>
              </h4>
              {pProntas.itens.map(({ pr, mergeDaSessao }) => {
                // RN-822: a proposta pendente (a de um agente, ou a que sobrou de um
                // Confirmar que não chegou a aprovar) é o cartão de sempre.
                const acao = mergeDaSessao;
                return (
                  <div key={pr.id} className={styles.grupo} data-testid="pr-pronta">
                    <div className={styles.origem}>
                      #{pr.number} {pr.title} · {pr.sourceBranch} → {pr.targetBranch}
                    </div>
                    {acao && acao.status === 'pending' ? (
                      <>
                        {/* RN-843: registra só enquanto o cartão está MONTADO
                            (o Disclosure recolhido desmonta e desregistra). */}
                        <RegistroDoBloco ids={[acao.id]} />
                        <div data-proposta-merge={pr.id}>{cardDeDecisao(acao)}</div>
                      </>
                    ) : (
                      <div className={styles.acoesDaLinha}>
                        <MergearNoChat
                          projectId={projectId}
                          sessionId={sessionId}
                          numero={pr.number}
                          pr={{
                            pullRequestId: pr.id,
                            sourceBranch: pr.sourceBranch,
                            targetBranch: pr.targetBranch,
                            title: pr.title,
                          }}
                          podeDecidir={podeDecidir}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <PaginadorDaFila
                fila={t('pendencias.filas.prontas')}
                pagina={pProntas}
                aoMudar={irParaPagina('prontas')}
              />
            </section>
          ))}
          {painel('bloqueadas', bloqueadas.length > 0 && (
            <section
              className={styles.fila}
              aria-label={t('pendencias.filas.bloqueadas')}
              data-testid="fila-tarefas-bloqueadas"
            >
              <h4 className={styles.filaTitulo}>
                {t('pendencias.filas.bloqueadas')}
                <span className={styles.contagem}>{bloqueadas.length}</span>
              </h4>
              {pBloqueadas.itens.map((task) => {
                const estado = desbloqueio[task.id];
                const { titulo, diagnostico } = tituloEDiagnostico(
                  task.blockedReason ?? t('pendencias.bloqueadas.semMotivo'),
                );
                return (
                  <div key={task.id} className={styles.grupo} data-testid="tarefa-bloqueada">
                    <div className={styles.origem}>{task.title}</div>
                    <p className={styles.nota}>{titulo}</p>
                    {task.assignedTo && idsTravados.has(task.assignedTo) && (
                      <p className={styles.erro} data-testid="bloqueada-agente-travado">
                        {t('pendencias.bloqueadas.agenteTravado', { agente: task.assignedTo })}
                      </p>
                    )}
                    {diagnostico && (
                      <Disclosure titulo={t('pendencias.bloqueadas.diagnostico')}>
                        <p className={styles.nota}>{diagnostico}</p>
                      </Disclosure>
                    )}
                    <div className={styles.acoesDaLinha}>
                      <Button
                        variant="secondary"
                        disabled={!podeDecidir}
                        loading={estado === 'enviando'}
                        onClick={() => void desbloquear(task)}
                      >
                        {t('pendencias.bloqueadas.botao')}
                      </Button>
                      {!podeDecidir && (
                        <span className={styles.nota}>{t('pendencias.bloqueadas.semPapel')}</span>
                      )}
                    </div>
                    {estado && estado !== 'enviando' && (
                      <p
                        className={estado.tom === 'erro' ? styles.erro : styles.nota}
                        role={estado.tom === 'erro' ? 'alert' : 'status'}
                        data-testid="retorno-desbloqueio"
                      >
                        {estado.texto}
                      </p>
                    )}
                  </div>
                );
              })}
              <PaginadorDaFila
                fila={t('pendencias.filas.bloqueadas')}
                pagina={pBloqueadas}
                aoMudar={irParaPagina('bloqueadas')}
              />
            </section>
          ))}
          {painel('travados', travados.length > 0 && (
            <section
              className={styles.fila}
              aria-label={t('pendencias.filas.travados')}
              data-testid="fila-agentes-travados"
            >
              <h4 className={styles.filaTitulo}>
                {t('pendencias.filas.travados')}
                <span className={styles.contagem}>{travados.length}</span>
              </h4>
              {pTravados.itens.map(({ agentId, motivo }) => {
                const estado = rearme[agentId];
                return (
                  <div key={agentId} className={styles.grupo} data-testid="agente-travado">
                    <div className={styles.origem}>{agentId}</div>
                    {motivo && <p className={styles.nota}>{motivo}</p>}
                    <div className={styles.acoesDaLinha}>
                      <Button
                        variant="secondary"
                        disabled={!podeDecidir}
                        loading={estado === 'enviando'}
                        onClick={() => void rearmar(agentId)}
                      >
                        {t('pendencias.travados.botao')}
                      </Button>
                      {!podeDecidir && (
                        <span className={styles.nota}>{t('pendencias.travados.semPapel')}</span>
                      )}
                    </div>
                    {estado && estado !== 'enviando' && (
                      <p
                        className={estado.tom === 'erro' ? styles.erro : styles.nota}
                        role={estado.tom === 'erro' ? 'alert' : 'status'}
                        data-testid="retorno-rearme"
                      >
                        {estado.texto}
                      </p>
                    )}
                  </div>
                );
              })}
              <PaginadorDaFila
                fila={t('pendencias.filas.travados')}
                pagina={pTravados}
                aoMudar={irParaPagina('travados')}
              />
            </section>
          ))}
        </div>
      </Disclosure>
    </div>
  );
}

/** RN-843 (AT-512): o cartão montado na linha da PR se registra para o fio. */
function RegistroDoBloco({ ids }: { ids: readonly string[] }) {
  useRegistrarAcoesNoBloco(ids);
  return null;
}
