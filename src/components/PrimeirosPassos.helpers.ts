import { useQuery } from '@tanstack/react-query';
import { listCredentials } from '../lib/api-client';
import { useBindingsResolvidos } from '../lib/bindings-resolvidos';
import { derivarPrimeirosPassos } from '../lib/primeiros-passos';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../lib/query-policy';

/**
 * Os passos da RN-708 (ou `null`): o cartão e o próximo passo (RN-1162) leem
 * as MESMAS chaves de cache, então nenhuma requisição a mais.
 */
export function usePrimeirosPassos(projectId: string, temSessao: boolean | undefined) {
  const bindings = useBindingsResolvidos(projectId);
  const doCriativo = bindings.doAgente('criativo');
  // A Visão geral não lê credenciais, e o orçamento da carga dela é contado
  // (`duas-abas.orcamento.test.tsx`). Com modelo resolvido para o time o
  // passo da credencial está coberto (o modelo já roda — local não pede
  // chave), então a leitura só acontece quando o cartão realmente precisa
  // dela: o time ainda sem modelo.
  const credenciais = useQuery({
    queryKey: ['credentials'],
    queryFn: listCredentials,
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
    enabled: doCriativo === null,
  });

  return derivarPrimeirosPassos({
    credenciais: doCriativo ? 1 : credenciais.data?.length,
    timeComModelo: doCriativo === undefined ? undefined : doCriativo !== null,
    temSessao,
  });
}
