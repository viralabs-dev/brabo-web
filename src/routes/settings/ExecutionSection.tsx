import { useState } from 'react';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Save } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject, listModels, updateProject } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { roleAtLeast } from '../../lib/roles';
import { microsParaUsd } from '../../lib/currency';
import type { DegrauDaEscada } from '../../lib/api-types';
import { Select } from '../../components/ui/Select';
import { Ajuda } from '../../components/ui/Ajuda';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import styles from '../ProjectSettingsTab.module.css';
import { MarcaDeHeranca } from './heranca';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { Item } from '@/components/shadcn/item';

const DEFAULT_MAX_CONSECUTIVE_BLOCKED = 3;
// Espelham o padrão da api (RN-1142/1143): teto US$ 0,50; escada Haiku 5.5 → Sonnet 5.
const TETO_PADRAO_MICROS = 500_000;
const ESCADA_PADRAO: DegrauDaEscada[] = [
  { modelId: 'claude-haiku-5-5', taskBudgetMicros: 500_000 },
  { modelId: 'claude-sonnet-5', taskBudgetMicros: 2_000_000 },
];
const usdParaMicros = (usd: number) => Math.round(usd * 1_000_000);

type LinhaDaEscada = { modelId: string; usd: string };

/**
 * Teto do circuit breaker por dev agent (Fase 12b — RN-047): quantas tasks
 * consecutivas terminando `blocked` param o agente do módulo em
 * `idle_tripped`, em vez de continuar reivindicando trabalho.
 *
 * Primeiro campo numérico da aba — sem botão de "voltar ao default": o
 * default É o valor mostrado quando o projeto ainda não tem um próprio
 * (`null` na api), então digitar por cima e salvar já cobre os dois casos.
 *
 * E é exatamente por isso que esta seção precisa da `MarcaDeHeranca`
 * (`settings/heranca.tsx`): o campo mostra `3` tendo ou não valor próprio, de
 * modo que olhar para ele não distingue os dois estados. A marca é a única
 * coisa na linha que distingue.
 */
export function ExecutionSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const [draft, setDraft] = useState<string | null>(null);
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
  const [tetoDraft, setTetoDraft] = useState<string | null>(null);
  const [escadaDraft, setEscadaDraft] = useState<LinhaDaEscada[] | null>(null);

  const valorAtual = project?.maxConsecutiveBlocked ?? DEFAULT_MAX_CONSECUTIVE_BLOCKED;
  const valorExibido = draft ?? String(valorAtual);
  const numero = Number(valorExibido);
  const valido = Number.isInteger(numero) && numero > 0;

  async function handleSave() {
    if (!valido) return;
    setSaving(true);
    try {
      await updateProject(projectId, { maxConsecutiveBlocked: numero });
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      setDraft(null);
      showToast({ title: t('execution.toast.success'), tone: 'success' });
    } catch {
      showToast({ title: t('execution.toast.error'), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  if (!project) return null;

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

  const tetoMicros = project.taskBudgetMicros ?? null;
  const tetoExibido = tetoDraft ?? String(microsParaUsd(tetoMicros ?? TETO_PADRAO_MICROS));
  const tetoNumero = Number(tetoExibido);
  const tetoValido = Number.isFinite(tetoNumero) && usdParaMicros(tetoNumero) > 0;

  const escadaAtual = project.modelEscalation?.ladder ?? ESCADA_PADRAO;
  const linhas: LinhaDaEscada[] =
    escadaDraft ?? escadaAtual.map((d) => ({ modelId: d.modelId, usd: String(microsParaUsd(d.taskBudgetMicros)) }));
  const escadaValida =
    linhas.length > 0 &&
    linhas.every((l) => l.modelId !== '' && Number.isFinite(Number(l.usd)) && usdParaMicros(Number(l.usd)) > 0);
  const mudarLinha = (i: number, parte: Partial<LinhaDaEscada>) =>
    setEscadaDraft(linhas.map((l, j) => (j === i ? { ...l, ...parte } : l)));

  return (
    <SecaoDeConfiguracoes chave="execution">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}><Play aria-hidden="true" className={styles.tituloIcone} />{t('execution.title')}</h2>
        <Ajuda assunto={t('execution.title')}>{t('execution.subtitle')}</Ajuda>
        <span className={styles.eyebrow}>{t('execution.eyebrow')}</span>
      </div>

      <Item variant="outline" className={styles.ajusteCard}>
        <div className={styles.ajusteInfo}>
          <div className={styles.ajusteTitulo}>{t('execution.card.title')}</div>
          <div className={styles.ajusteHint}>
            <MarcaDeHeranca
              proprio={project.maxConsecutiveBlocked !== null}
              detalhe={
                project.maxConsecutiveBlocked === null
                  ? t('execution.card.hintDefault', {
                      default: DEFAULT_MAX_CONSECUTIVE_BLOCKED,
                    })
                  : t('execution.card.hintConfigured')
              }
            />
          </div>
        </div>
        <div className={styles.ajusteNumero}>
          <Input
            mono
            type="number"
            min={1}
            value={valorExibido}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={!valido || saving}>
          <Save aria-hidden="true" />
          {saving ? t('execution.saving') : t('execution.save')}
        </Button>
      </Item>

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
            value={tetoExibido}
            disabled={!podeEditar}
            onChange={(e) => setTetoDraft(e.target.value)}
          />
        </div>
        <Button
          disabled={!podeEditar || !tetoValido || saving}
          onClick={() =>
            void gravar({ taskBudgetMicros: usdParaMicros(tetoNumero) }, () => setTetoDraft(null))
          }
        >
          <Save aria-hidden="true" />
          {saving ? t('execution.saving') : t('execution.save')}
        </Button>
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
