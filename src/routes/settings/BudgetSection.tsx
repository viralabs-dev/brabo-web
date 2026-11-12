import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { Ajuda } from '@/components/ui/Ajuda';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listAgentAreas, setAreaBudget } from '../../lib/api-client';
import type { AgentArea } from '../../lib/api-types';
import { microsParaUsd } from '../../lib/currency';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatarCustoMicros } from './shared';
import styles from '../ProjectSettingsTab.module.css';
import { MarcaDeHeranca } from './heranca';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { MarcaDeNaoSalvo } from './secao-salvavel';
import { useSecaoSalvavel } from './secao-salvavel.helpers';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { LinhaDeConfiguracao } from './LinhaDeConfiguracao';
import { usePublicarNoCabecalho } from './salvar-do-cabecalho';
import { TetoDoMes } from '../../components/TetoDoMes';
import { getProjectBudget, setProjectBudget } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { roleAtLeast } from '../../lib/roles';

/**
 * O teto de GASTO de cada área, opcional (ADR 0110, RN-443).
 *
 * Mesmo padrão de `ParallelismSection` — uma linha por área, botão de salvar
 * explícito (não autosave, pelo mesmo motivo: salvar a cada tecla mandaria
 * `2` a caminho de `20`) —, mas o campo fala em DÓLAR (não micro-USD, que
 * ninguém digita) e aceita ficar vazio: vazio é "sem teto", o mesmo valor de
 * `budgetMicros: null`. Este teto é ADITIVO ao budget de projeto/sessão que
 * já existe na tela — não substitui nenhum dos dois, e não é a cascata de
 * modelo herdável do ADR 0064 (áreas diferentes, mecanismos diferentes).
 *
 * O estado "sem valor próprio" é dito pela `MarcaDeHeranca`
 * (`settings/heranca.tsx`), como no resto da aba, e NÃO mais pelo placeholder
 * sozinho. O placeholder fazia dois trabalhos: texto-fantasma do campo e
 * único enunciado do estado. Ele é ruim no segundo — some assim que alguém
 * digita, não se lê sem olhar dentro do campo, e não tem como dizer o polo
 * POSITIVO ("esta área tem teto próprio"), que é metade da informação. Ficou
 * só com o primeiro trabalho.
 *
 * O botão é UM, da seção, pelo mesmo motivo de `ParallelismSection` e pelo
 * mesmo mecanismo (`settings/secao-salvavel.tsx`) — inclusive o desfecho POR
 * LINHA quando algumas das N chamadas falham.
 */
export function BudgetSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { data: areas } = useQuery({
    queryKey: ['agent-areas', projectId],
    queryFn: () => listAgentAreas(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });

  const secao = useSecaoSalvavel<AgentArea, number | null>({
    itens: areas,
    chaveDe: (area) => area.key,
    textoDoServidor: (area) =>
      area.budgetMicros === null ? '' : String(microsParaUsd(area.budgetMicros)),
    // Vazio é um valor válido — "sem teto" — e não um erro digitando.
    interpretar: (texto) => {
      if (texto.trim() === '') return { valido: true, valor: null };
      const numero = Number(texto);
      return Number.isFinite(numero) && numero >= 0
        ? { valido: true, valor: numero }
        : { valido: false };
    },
    salvar: (chave, valor) => setAreaBudget(projectId, chave, valor),
    aoConcluir: () =>
      queryClient.invalidateQueries({ queryKey: ['agent-areas', projectId] }),
    sucessoDeUm: (chave) => t('budget.toast.success', { area: chave }),
    erroGenerico: t('budget.toast.error'),
  });

  usePublicarNoCabecalho('budget', t('budget.title'), secao);
  const papel = useCurrentWorkspaceWithRole();

  return (
    <SecaoDeConfiguracoes chave="budget">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}><Wallet aria-hidden="true" className={styles.tituloIcone} />{t('budget.title')}</h2>
        <Ajuda assunto={t('budget.title')}>{t('budget.subtitle.before')}
        <strong>{t('budget.subtitle.strong')}</strong>
        {t('budget.subtitle.after')}</Ajuda>
        <span className={styles.eyebrow}>{t('budget.eyebrow')}</span>
      </div>

      <LinhaDeConfiguracao
        rotulo={t('budget.mes.rotulo')}
        descricao={t('budget.mes.descricao')}
      >
        <TetoDoMes
          escopo="projeto"
          queryKey={['budget', projectId]}
          ler={() => getProjectBudget(projectId)}
          gravar={(input) => setProjectBudget(projectId, input)}
          podeEditar={!!papel.data && roleAtLeast(papel.data.role, 'maintainer')}
        />
      </LinhaDeConfiguracao>

      {!areas || areas.length === 0 ? (
        <div className={styles.subtitle}>
          {t('budget.empty.before')}
          <code>{t('budget.empty.code')}</code>
          {t('budget.empty.after')}
        </div>
      ) : (
        <>
          {areas.map((area) => (
            <LinhaDeConfiguracao
              key={area.key}
              rotulo={t('budget.card.title', { area: area.key })}
              descricao={
                <>
                  {t('budget.card.spent', { amount: formatarCustoMicros(area.spentMicros) })}{' '}
                  <MarcaDeHeranca
                    proprio={area.budgetMicros !== null}
                    detalhe={area.budgetMicros === null ? t('budget.card.noCap') : undefined}
                  />
                </>
              }
            >
              <Input
                mono
                type="number"
                min={0}
                step="any"
                placeholder={t('budget.placeholder')}
                aria-label={t('budget.card.capAria', { area: area.key })}
                value={secao.textoDe(area)}
                onChange={(e) => secao.editar(area.key, e.target.value)}
              />
            </LinhaDeConfiguracao>
          ))}

          <div className={styles.acoesDaSecao}>
            <Button
              onClick={() => void secao.salvarSecao()}
              disabled={!secao.podeSalvar}
            >
              <Save aria-hidden="true" />
              {secao.salvando ? t('budget.saving') : t('budget.save')}
            </Button>
            <MarcaDeNaoSalvo sujas={secao.sujas} invalidas={secao.invalidas} />
          </div>
        </>
      )}
    </SecaoDeConfiguracoes>
  );
}
