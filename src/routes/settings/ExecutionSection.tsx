import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProject, getProjectBudget, setProjectBudget, updateProject } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { roleAtLeast } from '../../lib/roles';
import { Input } from '../../components/ui/Input';
import { TetoDoMes } from '../../components/TetoDoMes';
import { MarcaDeHeranca } from './heranca';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { CabecalhoDaSecao } from './CabecalhoDaSecao';
import { LinhaDeConfiguracao } from './LinhaDeConfiguracao';
import { useSecaoSalvavel } from './secao-salvavel.helpers';
import { usePublicarNoCabecalho } from './salvar-do-cabecalho.helpers';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';

const DEFAULT_MAX_CONSECUTIVE_BLOCKED = 3;

/**
 * Execução, como a v9 (P18) a mostra: o teto do circuit breaker por dev agent
 * (RN-047) e o teto de gasto do MÊS (RN-1200), que subiu do bloco de orçamento.
 *
 * O número de bloqueadas é escalar e vai para a barra do cabeçalho (RN-1265),
 * sem botão próprio. O campo mostra `3` tendo ou não valor próprio, então a
 * `MarcaDeHeranca` é a única coisa na linha que distingue os dois estados. O
 * teto do mês é o `TetoDoMes`, que tem o salvar dele (componente compartilhado
 * com a aba Gastos). Teto por tarefa e escada: `TetoPorTarefaSection`.
 */
export function ExecutionSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const { data: comPapel } = useCurrentWorkspaceWithRole();

  const secao = useSecaoSalvavel<{ id: string }, number>({
    itens: project ? [{ id: 'maxConsecutiveBlocked' }] : undefined,
    chaveDe: (i) => i.id,
    textoDoServidor: () => String(project?.maxConsecutiveBlocked ?? DEFAULT_MAX_CONSECUTIVE_BLOCKED),
    interpretar: (texto) => {
      const n = Number(texto);
      return texto.trim() !== '' && Number.isInteger(n) && n > 0
        ? { valido: true, valor: n }
        : { valido: false };
    },
    salvar: (_chave, n) => updateProject(projectId, { maxConsecutiveBlocked: n }),
    aoConcluir: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    sucessoDeUm: () => t('execution.toast.success'),
    erroGenerico: t('execution.toast.error'),
  });
  usePublicarNoCabecalho('execution', t('execution.title'), secao);

  if (!project) return null;

  return (
    <SecaoDeConfiguracoes chave="execution">
      <CabecalhoDaSecao titulo={t('execution.title')} subtitulo={t('execution.subtitle')} />

      <LinhaDeConfiguracao
        rotulo={t('execution.card.title')}
        descricao={
          <MarcaDeHeranca
            proprio={project.maxConsecutiveBlocked !== null}
            detalhe={
              project.maxConsecutiveBlocked === null
                ? t('execution.card.hintDefault', { default: DEFAULT_MAX_CONSECUTIVE_BLOCKED })
                : t('execution.card.hintConfigured')
            }
          />
        }
      >
        <Input
          mono
          type="number"
          min={1}
          aria-label={t('execution.card.title')}
          value={secao.textoDe({ id: 'maxConsecutiveBlocked' })}
          onChange={(e) => secao.editar('maxConsecutiveBlocked', e.target.value)}
        />
      </LinhaDeConfiguracao>

      <LinhaDeConfiguracao rotulo={t('budget.mes.rotulo')} descricao={t('budget.mes.descricao')}>
        <TetoDoMes
          escopo="projeto"
          queryKey={['budget', projectId]}
          ler={() => getProjectBudget(projectId)}
          gravar={(input) => setProjectBudget(projectId, input)}
          podeEditar={!!comPapel && roleAtLeast(comPapel.role, 'maintainer')}
        />
      </LinhaDeConfiguracao>
    </SecaoDeConfiguracoes>
  );
}
