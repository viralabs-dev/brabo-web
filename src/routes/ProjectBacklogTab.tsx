import { useEffect, useRef, useState } from 'react';
import { Archive, ListTree, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  useBacklog,
  useCoverage,
  useCurrentWorkspaceWithRole,
} from '../lib/hooks';
import {
  archiveStory,
  archiveTask,
  mensagemDaApi,
  promoteStories,
  returnStory,
  updateStoryTitle,
} from '../lib/api-client';
import { roleAtLeast } from '../lib/roles';
import { estadoDaTarefa, type EstadoDaTarefa } from '../lib/execution';
import { usePerguntasEmAberto } from '../lib/perguntas-em-aberto';
import { AtivarExecucao } from '../components/AtivarExecucao';
import { Chip } from '../components/ui/Chip';
import { motivoDeCorrecaoInerte } from '../lib/correcao-de-historia';
import { useHistoriaInicial } from '../lib/historia-inicial';
import { Checkbox } from '../components/shadcn/checkbox';
import { Item, ItemGroup } from '../components/shadcn/item';
import { Input } from '../components/ui/Input';
import type { Epic, Story, StoryStatus, Task } from '../lib/api-types';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ajuda } from '../components/ui/Ajuda';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Textarea } from '../components/ui/Textarea';
import { useToast } from '../components/ui/ToastProvider.helpers';
import {
  ChevronRightIcon,
  StackIcon,
  HypothesisIcon,
  CheckIcon,
} from '../components/ui/icons';
import styles from './ProjectBacklogTab.module.css';

import { historiaPassaNoFiltro } from '../lib/trabalho-v9';
import { aguardandoPromocao } from './ProjectBacklogTab.helpers';
const STATUS_TONE: Record<StoryStatus, BadgeTone> = {
  draft: 'muted',
  ready: 'accent',
  in_progress: 'warning',
  done: 'success',
};

const STATUS_LABEL_KEY: Record<StoryStatus, string> = {
  draft: 'statusLabel.draft',
  ready: 'statusLabel.ready',
  in_progress: 'statusLabel.inProgress',
  done: 'statusLabel.done',
};

const TASK_STATE_TONE: Record<EstadoDaTarefa, BadgeTone> = {
  blocked: 'danger',
  todo: 'muted',
  in_progress: 'warning',
  in_review: 'accent',
  done: 'success',
};

const TASK_STATE_LABEL_KEY: Record<EstadoDaTarefa, string> = {
  blocked: 'taskState.blocked',
  todo: 'taskState.todo',
  in_progress: 'taskState.inProgress',
  in_review: 'taskState.inReview',
  done: 'taskState.done',
};

export function ProjectBacklogTab({ projectId }: { projectId: string }) {
  const { t } = useTranslation('backlog');
  const { data: epics } = useBacklog(projectId);
  // RN-727: editar/arquivar pedem `developer` no ENDPOINT — o papel de
  // WORKSPACE, com a lacuna declarada da RN-471 (o de projeto pode sobrepor).
  const { data: workspaceComPapel } = useCurrentWorkspaceWithRole();
  const podeEscrever = roleAtLeast(workspaceComPapel?.role, 'developer');
  // AT-912: arquivar tarefa é gesto do dono (o Dev Lead arquiva a que ele criou, pela ferramenta).
  const podeArquivarTarefa = roleAtLeast(workspaceComPapel?.role, 'owner');
  const { data: coverage } = useCoverage(projectId);
  const propostas = aguardandoPromocao(epics);
  const [visao, setVisao] = useState<'epico' | 'quadro'>('epico');
  const [busca, setBusca] = useState('');
  const [soComPergunta, setSoComPergunta] = useState(false);
  const [modulo, setModulo] = useState('');
  // RN-180: a lista de perguntas tem teto (50); acima dele a contagem por história é recorte e a tela diz.
  const perguntasQuery = usePerguntasEmAberto(projectId).data;
  const perguntasPorHistoria = new Map<string, number>();
  for (const q of perguntasQuery?.itens ?? []) {
    for (const h of q.afeta.historias) perguntasPorHistoria.set(h, (perguntasPorHistoria.get(h) ?? 0) + 1);
  }
  const recorte = !!perguntasQuery && perguntasQuery.total > perguntasQuery.itens.length;
  const modulos = [...new Set((epics ?? []).flatMap((e) => e.stories.flatMap((st) => st.moduleIds ?? [])))].sort();
  const epicsVisiveis = (epics ?? []).map((e) => ({
    ...e,
    stories: e.stories.filter((st) => historiaPassaNoFiltro(st, { busca, soComPergunta, modulo, perguntasPorHistoria })),
  }));
  const filtrando = busca.trim() !== '' || soComPergunta || modulo !== '';
  const totalComPergunta = (epics ?? []).reduce(
    (n, e) => n + e.stories.filter((st) => (perguntasPorHistoria.get(st.id) ?? 0) > 0).length,
    0,
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.tree}>
        {propostas.length > 0 && (
          <PromotionQueue projectId={projectId} stories={propostas} />
        )}

        <div className={styles.sectionLabel}>{t('sectionLabel.backlog')}</div>
        <div className={styles.visoes}>
          <AtivarExecucao projectId={projectId} />
        </div>
        <div className={styles.visoes}>
          <Input
            label={t('busca.label')}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <Chip pressed={soComPergunta} onClick={() => setSoComPergunta((v) => !v)}>
            {t('filtro.comPergunta', { count: totalComPergunta })}
          </Chip>
          <select aria-label={t('filtro.modulo')} value={modulo} onChange={(e) => setModulo(e.target.value)}>
            <option value="">{t('filtro.todosModulos')}</option>
            {modulos.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        {recorte && <p className={styles.description}>{t('filtro.recorte', { total: perguntasQuery?.total })}</p>}
        <div role="group" aria-label={t('visao.label')} className={styles.visoes}>
          {(['epico', 'quadro'] as const).map((v) => (
            <Button key={v} variant={visao === v ? 'secondary' : 'ghost'} aria-pressed={visao === v} onClick={() => setVisao(v)}>
              {t(`visao.${v}`)}
            </Button>
          ))}
        </div>
        {visao === 'quadro' ? (
          <QuadroDeTarefas epics={epicsVisiveis} />
        ) : !epics || epics.length === 0 ? (
          <EmptyState titulo={t('empty.epicsTitle')} icone={<ListTree size={18} />}>{t('empty.epics')}</EmptyState>
        ) : filtrando && epicsVisiveis.every((e) => e.stories.length === 0) ? (
          <EmptyState titulo={t('empty.filtrado')} icone={<ListTree size={18} />}>{t('empty.filtrado')}</EmptyState>
        ) : (
          epicsVisiveis.filter((e) => !filtrando || e.stories.length > 0).map((epic) => (
            <EpicNode
              key={epic.id}
              epic={epic}
              perguntasPorHistoria={perguntasPorHistoria}
              projectId={projectId}
              podeEscrever={podeEscrever}
              podeArquivarTarefa={podeArquivarTarefa}
            />
          ))
        )}
      </div>

      <aside className={styles.traceability}>
        <div className={styles.sectionLabel}>
          {t('sectionLabel.traceability')}
          {coverage && coverage.uncoveredCount > 0 && (
            <Badge tone="danger">
              {t('coverage.uncoveredBadge', { count: coverage.uncoveredCount })}
            </Badge>
          )}
        </div>
        {!coverage || coverage.rules.length === 0 ? (
          <EmptyState titulo={t('empty.rulesTitle')} icone={<ListTree size={18} />}>{t('empty.rules')}</EmptyState>
        ) : (
          coverage.rules.map((r) => (
            <div
              key={r.ruleId}
              className={[styles.ruleCard, !r.covered && styles.uncovered]
                .filter(Boolean)
                .join(' ')}
            >
              <div className={styles.ruleTitle}>{r.title}</div>
              {r.covered ? (
                <div className={styles.ruleMeta}>
                  <CheckIcon size={12} />{' '}
                  {t('coverage.coveredBy', {
                    count: r.coveredByStoryIds.length,
                  })}
                </div>
              ) : (
                <Badge tone="danger">{t('coverage.uncovered')}</Badge>
              )}
            </div>
          ))
        )}
      </aside>
    </div>
  );
}

/**
 * "Aguardando sua promoção" — o passo humano que a Fase 12c devolve ao
 * usuário. Enquanto uma história está aqui, NENHUMA tarefa dela é pegável por
 * dev agent nenhum; promover libera o lote de uma vez e acorda os agentes
 * ociosos do módulo (Fase 12b).
 *
 * A seleção em lote copia o `ProjectApprovalsTab` (Set imutável, barra de
 * seleção, invalidação da query) com UM desvio deliberado: `Promise.allSettled`
 * no lugar de `Promise.all`. Lá o primeiro erro aborta o lote e nem limpa a
 * seleção; aqui a resposta do servidor já é parcial por contrato (`promoted` e
 * `failed` convivem num 201), e engolir isso num throw perderia exatamente a
 * informação que o usuário precisa para agir.
 */
function PromotionQueue({
  projectId,
  stories,
}: {
  projectId: string;
  stories: Story[];
}) {
  const { t } = useTranslation('backlog');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recusando, setRecusando] = useState<Story | null>(null);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function promover(ids: string[]) {
    if (ids.length === 0 || ocupado) return;
    setOcupado(true);
    try {
      const r = await promoteStories(projectId, ids);
      setSelected(new Set());
      await invalidate();

      if (r.failed.length === 0) {
        showToast({
          title: t('promotionQueue.toast.promoted', { count: r.promoted.length }),
          tone: 'success',
        });
      } else {
        // O motivo da primeira falha vai no corpo: sem ele o usuário só sabe
        // que "não deu", e a causa mais comum (módulo que saiu do module_map
        // entre a proposta e a decisão) não é adivinhável.
        showToast({
          title: `${t('promotionQueue.toast.partialPromoted', {
            count: r.promoted.length,
          })}, ${t('promotionQueue.toast.partialFailed', { count: r.failed.length })}`,
          message: r.failed[0]?.reason,
          tone: 'warning',
        });
      }
    } catch {
      showToast({ title: t('promotionQueue.toast.promoteError'), tone: 'danger' });
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarRecusa() {
    if (!recusando || motivo.trim() === '' || ocupado) return;
    setOcupado(true);
    try {
      await returnStory(projectId, recusando.id, motivo.trim());
      setRecusando(null);
      setMotivo('');
      await invalidate();
      showToast({ title: t('promotionQueue.toast.returnedSuccess'), tone: 'success' });
    } catch {
      showToast({ title: t('promotionQueue.toast.returnError'), tone: 'danger' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className={styles.promotion}>
      <div className={styles.sectionLabel}>
        {t('sectionLabel.promotionQueue')}
        <Badge tone="warning">{stories.length}</Badge>
        <Ajuda assunto={t('sectionLabel.promotionQueue')}>{t('promotionQueue.hint')}</Ajuda>
      </div>

      {selected.size > 0 && (
        <div className={styles.selectionBar}>
          <span>{t('promotionQueue.selectedCount', { count: selected.size })}</span>
          <Button
            variant="success"
            loading={ocupado}
            onClick={() => promover(Array.from(selected))}
          >
            {t('promotionQueue.promoteSelected')}
          </Button>
        </div>
      )}

      <div className={styles.proposals}>
        {stories.map((story) => (
          <div key={story.id} className={styles.proposal}>
            <label className={styles.proposalPick}>
              <Checkbox
                checked={selected.has(story.id)}
                onCheckedChange={() => toggleSelect(story.id)}
                aria-label={t('promotionQueue.selectAria', { title: story.title })}
              />
            </label>
            <div className={styles.proposalBody}>
              <div className={styles.proposalTitle}>{story.title}</div>
              {story.description && (
                <p className={styles.description}>{story.description}</p>
              )}
              <FieldList label={t('fieldLabels.rf')} items={story.rf} />
              <FieldList label={t('fieldLabels.dor')} items={story.dor} />
              <FieldList label={t('fieldLabels.dod')} items={story.dod} />
              <div className={styles.ruleRefs}>
                {t('ruleRefs', { count: story.businessRuleIds.length })}
                {story.tasks.length > 0 &&
                  t('promotionQueue.taskRefsSuffix', { count: story.tasks.length })}
              </div>
            </div>
            <div className={styles.proposalActions}>
              <Button
                variant="success"
                disabled={ocupado}
                onClick={() => promover([story.id])}
              >
                {t('promotionQueue.promote')}
              </Button>
              <Button
                variant="ghost"
                disabled={ocupado}
                onClick={() => {
                  setRecusando(story);
                  setMotivo('');
                }}
              >
                <X aria-hidden="true" />
                {t('promotionQueue.reject')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {recusando && (
        <Modal
          title={t('promotionQueue.returnModalTitle', { title: recusando.title })}
          onClose={() => setRecusando(null)}
        >
          <Textarea
            label={t('promotionQueue.reasonLabel')}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            hint={t('promotionQueue.reasonHint')}
            placeholder={t('promotionQueue.reasonPlaceholder')}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              variant="danger"
              loading={ocupado}
              disabled={motivo.trim() === ''}
              onClick={confirmarRecusa}
            >
              {t('promotionQueue.returnConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setRecusando(null)}>
              {t('promotionQueue.cancel')}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function EpicNode({
  epic,
  perguntasPorHistoria,
  projectId,
  podeEscrever,
  podeArquivarTarefa,
}: {
  epic: Epic;
  perguntasPorHistoria: Map<string, number>;
  projectId: string;
  podeEscrever: boolean;
  podeArquivarTarefa: boolean;
}) {
  const { t } = useTranslation('backlog');
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.epic}>
      <button
        type="button"
        className={styles.epicHeader}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={[styles.chevron, open && styles.chevronOpen]
            .filter(Boolean)
            .join(' ')}
        >
          <ChevronRightIcon size={13} />
        </span>
        <StackIcon size={15} />
        <span className={styles.epicTitle}>{epic.title}</span>
        <span className={styles.count}>
          {t('epico.progresso', { count: epic.stories.length, prontas: epic.stories.filter((st) => st.status === 'done').length })}
        </span>
      </button>
      {open && (
        <div className={styles.stories}>
          {epic.stories.map((story) => (
            <StoryNode
              key={story.id}
              story={story}
              perguntas={perguntasPorHistoria.get(story.id) ?? 0}
              projectId={projectId}
              podeEscrever={podeEscrever}
              podeArquivarTarefa={podeArquivarTarefa}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryNode({
  story,
  perguntas,
  projectId,
  podeEscrever,
  podeArquivarTarefa,
}: {
  story: Story;
  perguntas: number;
  projectId: string;
  podeEscrever: boolean;
  podeArquivarTarefa: boolean;
}) {
  const { t } = useTranslation('backlog');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  // RN-884: o deep-link `?historia=` (o "Corrigir a história" do chat) abre
  // a história e a traz à vista.
  const alvo = useHistoriaInicial() === story.id;
  const [open, setOpen] = useState(alvo);
  const refDaHistoria = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (alvo) refDaHistoria.current?.scrollIntoView?.({ block: 'center' });
  }, [alvo]);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(story.title);
  const [arquivando, setArquivando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const inerte = motivoDeCorrecaoInerte(story, podeEscrever);

  async function aposCorrigir() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['backlog', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['coverage', projectId] }),
    ]);
  }

  async function salvarTitulo() {
    if (titulo.trim() === '' || ocupado) return;
    setOcupado(true);
    try {
      await updateStoryTitle(projectId, story.id, titulo.trim());
      setEditando(false);
      await aposCorrigir();
      showToast({ title: t('storyNode.toast.updated'), tone: 'success' });
    } catch (erro) {
      showToast({
        title: t('storyNode.toast.updateError'),
        message: mensagemDaApi(erro),
        tone: 'danger',
      });
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarArquivo() {
    if (ocupado) return;
    setOcupado(true);
    try {
      await archiveStory(projectId, story.id, motivo.trim() || undefined);
      setArquivando(false);
      await aposCorrigir();
      showToast({ title: t('storyNode.toast.archived'), tone: 'success' });
    } catch (erro) {
      showToast({
        title: t('storyNode.toast.archiveError'),
        message: mensagemDaApi(erro),
        tone: 'danger',
      });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className={styles.story} ref={refDaHistoria} data-historia={story.id}>
      <button
        type="button"
        className={styles.storyHeader}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={[styles.chevron, open && styles.chevronOpen]
            .filter(Boolean)
            .join(' ')}
        >
          <ChevronRightIcon size={12} />
        </span>
        <HypothesisIcon size={13} />
        <span className={styles.storyTitle}>{story.title}</span>
        {(story.moduleIds ?? []).map((m) => (
          <Badge key={m} tone="neutral">
            {m}
          </Badge>
        ))}
        {perguntas > 0 && <Badge tone="warning">{t('historia.perguntas', { count: perguntas })}</Badge>}
        <Badge tone={STATUS_TONE[story.status]}>
          {t(STATUS_LABEL_KEY[story.status])}
        </Badge>
        {/* Chip ADICIONAL, não substituto: `proposedReady` é uma proposta que
            convive com o status `draft`, não um estado da máquina. */}
        {story.proposedReady && (
          <Badge tone="warning">{t('storyNode.awaitingYou')}</Badge>
        )}
        {story.returnedReason && (
          <Badge tone="danger">{t('storyNode.returned')}</Badge>
        )}
        <span className={styles.count}>
          {t('storyNode.taskCount', { count: story.tasks.length })}
        </span>
      </button>
      {open && (
        <div className={styles.storyBody}>
          {story.returnedReason && (
            <p className={styles.returned}>
              <strong>{t('storyNode.youReturned')}</strong> {story.returnedReason}
            </p>
          )}
          {story.description && (
            <p className={styles.description}>{story.description}</p>
          )}
          <FieldList label={t('fieldLabels.rf')} items={story.rf} />
          <FieldList label={t('fieldLabels.rnf')} items={story.rnf} />
          <FieldList label={t('fieldLabels.dor')} items={story.dor} />
          <FieldList label={t('fieldLabels.dod')} items={story.dod} />
          <div className={styles.ruleRefs}>
            {t('ruleRefs', { count: story.businessRuleIds.length })}
          </div>
          {story.tasks.length > 0 && (
            <ItemGroup className={styles.tasks}>
              {story.tasks.map((task) => (
                <TarefaDoBacklog key={task.id} task={task} projectId={projectId} podeArquivar={podeArquivarTarefa} />
              ))}
            </ItemGroup>
          )}
          <div className={styles.storyActions}>
            <Button
              variant="ghost"
              legenda={t('storyNode.editTitle')}
              disabled={inerte !== null || ocupado}
              onClick={() => {
                setTitulo(story.title);
                setEditando(true);
              }}
            >
              <Pencil aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              disabled={inerte !== null || ocupado}
              onClick={() => {
                setMotivo('');
                setArquivando(true);
              }}
            >
              <Archive aria-hidden="true" />
              {t('storyNode.archive')}
            </Button>
          </div>
          {inerte && (
            <p className={styles.inertReason}>
              {t(inerte.chave, { count: inerte.count })}
            </p>
          )}
        </div>
      )}

      {editando && (
        <Modal
          title={t('storyNode.editModalTitle')}
          onClose={() => setEditando(false)}
        >
          <Input
            label={t('storyNode.titleLabel')}
            value={titulo}
            maxLength={200}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              variant="primary"
              loading={ocupado}
              disabled={titulo.trim() === ''}
              onClick={salvarTitulo}
            >
              <Save aria-hidden="true" />
              {t('storyNode.save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditando(false)}>
              {t('storyNode.cancel')}
            </Button>
          </div>
        </Modal>
      )}

      {arquivando && (
        <Modal
          title={t('storyNode.archiveModalTitle', { title: story.title })}
          onClose={() => setArquivando(false)}
        >
          <p className={styles.description}>
            {t('storyNode.archiveExplain', { count: story.tasks.length })}
          </p>
          <Textarea
            label={t('storyNode.archiveReasonLabel')}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t('storyNode.archiveReasonPlaceholder')}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button
              variant="danger"
              loading={ocupado}
              onClick={confirmarArquivo}
            >
              {t('storyNode.archiveConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setArquivando(false)}>
              {t('storyNode.cancel')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FieldList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <ul className={styles.fieldItems}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * AT-912: a tarefa do backlog. A `todo` ganha "Arquivar" com motivo obrigatório (só para o dono);
 * a arquivada fica no histórico, riscada e com o motivo. A api recusa a que tem agente (409 nomeado).
 */
function TarefaDoBacklog({
  task,
  projectId,
  podeArquivar,
}: {
  task: Task;
  projectId: string;
  podeArquivar: boolean;
}) {
  const { t } = useTranslation('backlog');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [arquivando, setArquivando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const arquivada = Boolean(task.archivedAt);
  const estado = arquivada ? 'archived' : estadoDaTarefa(task);

  async function confirmar() {
    if (ocupado || motivo.trim() === '') return;
    setOcupado(true);
    try {
      await archiveTask(projectId, task.id, motivo.trim());
      setArquivando(false);
      await queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
      showToast({ title: t('taskNode.toast.archived'), tone: 'success' });
    } catch (erro) {
      showToast({ title: t('taskNode.toast.archiveError'), message: mensagemDaApi(erro), tone: 'danger' });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Item size="sm" className={styles.task} data-task-state={estado}>
      <Badge tone={arquivada ? 'muted' : TASK_STATE_TONE[estadoDaTarefa(task)]}>
        {t(arquivada ? 'taskState.archived' : TASK_STATE_LABEL_KEY[estadoDaTarefa(task)])}
      </Badge>{' '}
      {arquivada ? <s>{task.title}</s> : task.title}
      {arquivada && task.archivedReason && (
        <div className={styles.taskBlockedReason}>{t('taskNode.archivedReason', { motivo: task.archivedReason })}</div>
      )}
      {!arquivada && task.blocked && task.blockedReason && (
        <div className={styles.taskBlockedReason}>{task.blockedReason}</div>
      )}
      {!arquivada && podeArquivar && task.status === 'todo' && (
        <Button
          variant="ghost"
          onClick={() => {
            setMotivo('');
            setArquivando(true);
          }}
        >
          <Archive aria-hidden="true" />
          {t('taskNode.archive')}
        </Button>
      )}
      {arquivando && (
        <Modal title={t('taskNode.archiveModalTitle', { title: task.title })} onClose={() => setArquivando(false)}>
          <p className={styles.description}>{t('taskNode.archiveExplain')}</p>
          <Textarea
            label={t('taskNode.archiveReasonLabel')}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t('taskNode.archiveReasonPlaceholder')}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="danger" loading={ocupado} disabled={motivo.trim() === ''} onClick={confirmar}>
              {t('taskNode.archiveConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setArquivando(false)}>
              {t('storyNode.cancel')}
            </Button>
          </div>
        </Modal>
      )}
    </Item>
  );
}

const COLUNAS_DO_QUADRO: EstadoDaTarefa[] = ['todo', 'in_progress', 'in_review', 'done', 'blocked'];

/** AT-894 (RN-1220): o Quadro é só leitura; as colunas são o estado da tarefa (`estadoDaTarefa`), sem arquivadas. */
export function QuadroDeTarefas({ epics }: { epics: Epic[] }) {
  const { t } = useTranslation('backlog');
  const tarefas = epics.flatMap((e) => e.stories.flatMap((s) => s.tasks.filter((x) => !x.archivedAt)));
  return (
    <div className={styles.quadro} data-testid="quadro-de-tarefas">
      {COLUNAS_DO_QUADRO.map((estado) => {
        const doEstado = tarefas.filter((x) => estadoDaTarefa(x) === estado);
        return (
          <section key={estado} className={styles.colunaDoQuadro} data-coluna={estado}>
            <div className={styles.sectionLabel}>
              {t(TASK_STATE_LABEL_KEY[estado])} <Badge tone={TASK_STATE_TONE[estado]}>{doEstado.length}</Badge>
            </div>
            {doEstado.map((x) => (
              <Item key={x.id} size="sm" className={styles.task}>
                {x.title}
              </Item>
            ))}
          </section>
        );
      })}
    </div>
  );
}
