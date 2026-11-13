import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject, listModels, updateProject } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { roleAtLeast } from '../../lib/roles';
import { microsParaUsd } from '../../lib/currency';
import type { DegrauDaEscada } from '../../lib/api-types';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import styles from '../ProjectSettingsTab.module.css';
import { MarcaDeHeranca } from './heranca';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { CabecalhoDaSecao } from './CabecalhoDaSecao';
import { useSecaoSalvavel } from './secao-salvavel.helpers';
import { usePublicarNoCabecalho } from './salvar-do-cabecalho.helpers';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { Item } from '@/components/shadcn/item';

// Espelham o padrão da api (RN-1142/1143): teto US$ 0,50; escada Haiku 5.5 → Sonnet 5.
const TETO_PADRAO_MICROS = 500_000;
const ESCADA_PADRAO: DegrauDaEscada[] = [
  { modelId: 'claude-haiku-5-5', taskBudgetMicros: 500_000 },
  { modelId: 'claude-sonnet-5', taskBudgetMicros: 2_000_000 },
];
const usdParaMicros = (usd: number) => Math.round(usd * 1_000_000);

type LinhaDaEscada = { modelId: string; usd: string };

/**
 * Teto de gasto por TAREFA e escada de modelos (RN-1142/1143). Saiu da seção
 * Execução na v9 (P18): a Execução ficou com o que a prévia mostra e estas duas
 * vêm depois das quatro primeiras. O teto é escalar e vai para a barra do
 * cabeçalho (RN-1265); a escada é uma LISTA e mantém o salvar próprio.
 */
export function TetoPorTarefaSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const [saving, setSaving] = useState(false);
  const { data: comPapel } = useCurrentWorkspaceWithRole();
  // O mínimo é o do ENDPOINT (`PATCH /projects/:id`, `maintainer`).
  const podeEditar = roleAtLeast(comPapel?.role, 'maintainer');
  const { data: modelos } = useQuery({
    queryKey: ['models', projectId],
    queryFn: () => listModels(projectId),
  });
  const idsDeModelos = modelos
    ? [...Object.values(modelos.local).flat(), ...Object.values(modelos.cloud).flat()].map((m) => m.id)
    : [];
  const [escadaDraft, setEscadaDraft] = useState<LinhaDaEscada[] | null>(null);

  const tetoMicros = project?.taskBudgetMicros ?? null;
  const teto = useSecaoSalvavel<{ id: string }, number>({
    itens: project ? [{ id: 'taskBudget' }] : undefined,
    chaveDe: (i) => i.id,
    textoDoServidor: () => String(microsParaUsd(tetoMicros ?? TETO_PADRAO_MICROS)),
    interpretar: (texto) => {
      const n = Number(texto);
      return texto.trim() !== '' && Number.isFinite(n) && usdParaMicros(n) > 0
        ? { valido: true, valor: n }
        : { valido: false };
    },
    salvar: (_chave, usd) => updateProject(projectId, { taskBudgetMicros: usdParaMicros(usd) }),
    aoConcluir: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    sucessoDeUm: () => t('execution.teto.saved'),
    erroGenerico: t('execution.toast.error'),
  });
  usePublicarNoCabecalho('task-budget', t('taskBudget.title'), teto);

  async function gravar(input: Parameters<typeof updateProject>[1], aoGravar: () => void) {
    setSaving(true);
    try {
      await updateProject(projectId, input);
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      aoGravar();
      showToast({ title: t('execution.toast.success'), tone: 'success' });
    } catch {
      showToast({ title: t('execution.toast.error'), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  if (!project) return null;

  const escadaAtual = project.modelEscalation?.ladder ?? ESCADA_PADRAO;
  const linhas: LinhaDaEscada[] =
    escadaDraft ?? escadaAtual.map((d) => ({ modelId: d.modelId, usd: String(microsParaUsd(d.taskBudgetMicros)) }));
  const escadaValida =
    linhas.length > 0 &&
    linhas.every((l) => l.modelId !== '' && Number.isFinite(Number(l.usd)) && usdParaMicros(Number(l.usd)) > 0);
  const mudarLinha = (i: number, parte: Partial<LinhaDaEscada>) =>
    setEscadaDraft(linhas.map((l, j) => (j === i ? { ...l, ...parte } : l)));

  return (
    <SecaoDeConfiguracoes chave="task-budget">
      <CabecalhoDaSecao titulo={t('taskBudget.title')} subtitulo={t('taskBudget.subtitle')} />

      <Item variant="outline" className={styles.ajusteCard}>
        <div className={styles.ajusteInfo}>
          <div className={styles.ajusteTitulo}>{t('execution.teto.title')}</div>
          <div className={styles.ajusteHint}>
            <MarcaDeHeranca
              proprio={tetoMicros !== null}
              detalhe={
                tetoMicros === null
                  ? t('execution.teto.hintDefault', { default: microsParaUsd(TETO_PADRAO_MICROS).toFixed(2) })
                  : t('execution.card.hintConfigured')
              }
            />
            {t('execution.teto.vale')}
          </div>
          {!podeEditar && <div className={styles.ajusteHint}>{t('execution.semPapel')}</div>}
        </div>
        <div className={styles.ajusteNumero}>
          <Input
            mono
            type="number"
            min={0.01}
            step={0.01}
            aria-label={t('execution.teto.title')}
            value={teto.textoDe({ id: 'taskBudget' })}
            disabled={!podeEditar}
            onChange={(e) => teto.editar('taskBudget', e.target.value)}
          />
        </div>
      </Item>

      <Item variant="outline" className={styles.ajusteCard} data-testid="escada-de-modelos">
        <div className={styles.ajusteInfo}>
          <div className={styles.ajusteTitulo}>{t('execution.escada.title')}</div>
          <div className={styles.ajusteHint}>
            <MarcaDeHeranca
              proprio={project.modelEscalation != null}
              detalhe={
                project.modelEscalation == null
                  ? t('execution.escada.hintDefault')
                  : t('execution.card.hintConfigured')
              }
            />
            {t('execution.escada.vale')}
          </div>
          {!podeEditar && <div className={styles.ajusteHint}>{t('execution.semPapel')}</div>}
          {linhas.map((l, i) => (
            <div key={i} className={styles.ajusteInfo}>
              <Select
                aria-label={t('execution.escada.modelo', { n: i + 1 })}
                value={l.modelId}
                disabled={!podeEditar}
                onChange={(e) => mudarLinha(i, { modelId: e.target.value })}
              >
                {!idsDeModelos.includes(l.modelId) && <option value={l.modelId}>{l.modelId}</option>}
                {idsDeModelos.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </Select>
              <div className={styles.ajusteNumero}>
                <Input
                  mono
                  type="number"
                  min={0.01}
                  step={0.01}
                  aria-label={t('execution.escada.teto', { n: i + 1 })}
                  value={l.usd}
                  disabled={!podeEditar}
                  onChange={(e) => mudarLinha(i, { usd: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                disabled={!podeEditar || linhas.length === 1}
                onClick={() => setEscadaDraft(linhas.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" />
                {t('execution.escada.remover', { n: i + 1 })}
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            disabled={!podeEditar || idsDeModelos.length === 0}
            onClick={() => setEscadaDraft([...linhas, { modelId: idsDeModelos[0], usd: '1' }])}
          >
            <Plus aria-hidden="true" />
            {t('execution.escada.adicionar')}
          </Button>
        </div>
        <Button
          disabled={!podeEditar || !escadaValida || escadaDraft === null || saving}
          onClick={() =>
            void gravar(
              {
                modelEscalation: {
                  ladder: linhas.map((l) => ({ modelId: l.modelId, taskBudgetMicros: usdParaMicros(Number(l.usd)) })),
                },
              },
              () => setEscadaDraft(null),
            )
          }
        >
          <Save aria-hidden="true" />
          {saving ? t('execution.saving') : t('execution.save')}
        </Button>
      </Item>
    </SecaoDeConfiguracoes>
  );
}
