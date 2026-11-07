import { useQuery } from '@tanstack/react-query';
import { listProviderCapabilities } from '../../lib/api-client';

/**
 * As capabilities de PROVIDER (ADR 0166). Chave global: é fato do código da
 * instalação, igual para todo projeto, e as duas seções de modelo a dividem.
 */
export function useCapacidadesDosProviders() {
  return useQuery({
    queryKey: ['provider-capabilities'],
    queryFn: listProviderCapabilities,
    staleTime: Infinity,
  });
}
