import { useQuery } from '@tanstack/react-query';
import { listCredentials, listModels } from '../lib/api-client';
import type { Model } from '../lib/api-types';
import { useBindingsResolvidos } from '../lib/bindings-resolvidos';
import { derivarPrimeirosPassos } from '../lib/primeiros-passos';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../lib/query-policy';

/**
 * O modelo do Criativo e se ele é LOCAL (RN-1395), pela lista de modelos que a
 * Visão geral já lê (`['models', projectId]`) — nenhuma leitura nova. Traz
 * também o Haiku do catálogo ativo, que o "Aplicar ao time" grava.
 */
export function useModeloDoTime(projectId: string) {
  const bindings = useBindingsResolvidos(projectId);
  const doCriativo = bindings.doAgente('criativo');
  const { data: modelos } = useQuery({ queryKey: ['models', projectId], queryFn: () => listModels(projectId) });
  const locais = modelos ? Object.values(modelos.local).flat() : undefined;
  const modeloLocal = doCriativo === undefined || doCriativo === null ? undefined : locais?.find((m) => m.id === doCriativo.modelId);
  return {
    doCriativo,
    // `undefined` = "não sei" (RN-470): sem a lista de modelos não se afirma local nem nuvem.
    local: doCriativo ? (locais ? !!modeloLocal : undefined) : false,
    nomeLocal: modeloLocal?.displayName ?? modeloLocal?.name,
    haiku: modelos ? haikuAptoMaisBarato(Object.values(modelos.cloud).flat()) : undefined,
  };
}

/** O Haiku apto (RN-040) e disponível mais barato; preço desconhecido (RN-470) vai para o fim. */
export function haikuAptoMaisBarato(modelos: Model[]): Model | undefined {
  const custo = (m: Model) => m.inputPricePerMillionMicros + m.outputPricePerMillionMicros;
  const semPreco = (m: Model) => custo(m) === 0 && m.billing !== 'free';
  return modelos
    .filter((m) => /haiku/i.test(`${m.displayName} ${m.name}`) && m.supportsToolCalling && m.availability === 'available')
    .sort((a, b) => Number(semPreco(a)) - Number(semPreco(b)) || custo(a) - custo(b) || a.name.localeCompare(b.name))[0];
}

/**
 * Os passos da RN-708 (ou `null`): o cartão e o próximo passo (RN-1162) leem
 * as MESMAS chaves de cache, então nenhuma requisição a mais.
 */
export function usePrimeirosPassos(projectId: string, temSessao: boolean | undefined) {
  const { doCriativo, local } = useModeloDoTime(projectId);
  // A Visão geral não lê credenciais, e o orçamento da carga dela é contado
  // (`duas-abas.orcamento.test.tsx`). Com modelo de NUVEM no time o passo da
  // credencial está coberto, então a leitura só acontece quando o cartão
  // precisa dela: o time sem modelo ou no modelo local (RN-1395).
  const credenciais = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
    enabled: doCriativo === null || local === true,
  });

  return derivarPrimeirosPassos({
    credenciais: doCriativo && local === false ? 1 : credenciais.data?.length,
    timeComModelo: doCriativo === undefined ? undefined : doCriativo !== null,
    modeloLocal: local,
    temSessao,
  });
}
