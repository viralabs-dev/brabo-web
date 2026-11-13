import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { listAgentAreas, setAreaMaxParallel } from '../../lib/api-client';
import type { AgentArea } from '../../lib/api-types';
import { nomeDoAgente } from '../../lib/agents';
import { Input } from '../../components/ui/Input';
import { CabecalhoDaSecao } from './CabecalhoDaSecao';
import styles from './CabecalhoDaSecao.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { useSecaoSalvavel } from './secao-salvavel.helpers';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { LinhaDeConfiguracao } from './LinhaDeConfiguracao';
import { usePublicarNoCabecalho } from './salvar-do-cabecalho.helpers';

/**
 * O teto de paralelismo de cada lead (FASE 14d — RN-083, ADR 0053).
 *
 * Uma linha por ÁREA, e não um número único do projeto: o trabalho de dev e o
 * de QA têm custos e formatos diferentes, e foi por isso que o ADR pôs o teto
 * na área. Tem botão de salvar, ao contrário do seletor de promoção logo
 * abaixo — é um número digitado, e salvar a cada tecla mandaria `1` a caminho
 * de `12`.
 *
 * O botão é UM, da seção, e não um por linha (`settings/secao-salvavel.tsx`):
 * revisar o teto de dev quase nunca é revisar só o de dev, e N botões idênticos
 * pediam N cliques para uma decisão só. O que a seção passou a dever em troca é
 * dizer quantas linhas estão pendentes, e nunca afirmar que salvou uma linha que
 * a api recusou — as N chamadas não são uma transação, e o hook trata cada
 * desfecho por linha.
 *
 * Vazio para projeto que nunca ativou execução, e a tela DIZ isso em vez de
 * sumir: seção que desaparece parece bug, e o motivo (as áreas nascem do
 * `module_map`) não é adivinhável.
 */
export function ParallelismSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { data: areas } = useQuery({
    queryKey: ['agent-areas', projectId],
    queryFn: () => listAgentAreas(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });

  const secao = useSecaoSalvavel<AgentArea, number>({
    itens: areas,
    chaveDe: (area) => area.key,
    textoDoServidor: (area) => String(area.maxParallel),
    // Zero não é "sem limite" — é configuração inválida, e a api recusa.
    interpretar: (texto) => {
      const numero = Number(texto);
      return Number.isInteger(numero) && numero >= 1
        ? { valido: true, valor: numero }
        : { valido: false };
    },
    salvar: (chave, valor) => setAreaMaxParallel(projectId, chave, valor),
    aoConcluir: () =>
      queryClient.invalidateQueries({ queryKey: ['agent-areas', projectId] }),
    sucessoDeUm: (chave) => t('parallelism.toast.success', { area: chave }),
    erroGenerico: t('parallelism.toast.error'),
  });

  usePublicarNoCabecalho('parallelism', t('parallelism.title'), secao);

  return (
    <SecaoDeConfiguracoes chave="parallelism">
      <CabecalhoDaSecao titulo={t('parallelism.title')} subtitulo={t('parallelism.subtitle')} />

      {!areas || areas.length === 0 ? (
        <div className={styles.subtitulo}>
          {t('parallelism.empty.before')}
          <code>{t('parallelism.empty.code')}</code>
          {t('parallelism.empty.after')}
        </div>
      ) : (
        <>
          {areas.map((area) => (
            <LinhaDeConfiguracao
              key={area.key}
              rotulo={<span className={styles.linhaDaArea}><span className={styles.papel} aria-hidden="true">{area.key.charAt(0).toUpperCase()}</span>{t('parallelism.card.title', { area: area.key.charAt(0).toUpperCase() + area.key.slice(1) })}</span>}
              descricao={
                <>
                  {t('parallelism.card.lead', { lead: nomeDoAgente(area.leadAgentId) })}
                  {area.members.length > 0
                    ? t('parallelism.card.membersCount', { count: area.members.length })
                    : t('parallelism.card.noMembersYet')}
                </>
              }
            >
              <Input
                mono
                type="number"
                min={1}
                aria-label={t('parallelism.card.capAria', { area: area.key })}
                value={secao.textoDe(area)}
                onChange={(e) => secao.editar(area.key, e.target.value)}
              />
            </LinhaDeConfiguracao>
          ))}
        </>
      )}
    </SecaoDeConfiguracoes>
  );
}
