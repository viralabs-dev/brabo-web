import { type QueryClient } from '@tanstack/react-query';

/** A `queryKey` do cartão; o aviso `infra.pr_opened` do canal a invalida. */
export const chaveDasInstrucoesDeExecucao = (projectId: string) =>
  ['run-instructions', projectId] as const;

/** RN-855: a PR de infra aberta traz o "como rodar" novo; relê o cartão. */
export function releSeInfraAbriuPr(queryClient: QueryClient, projectId: string, type: string): boolean {
  if (type !== 'infra.pr_opened') return false;
  void queryClient.invalidateQueries({ queryKey: chaveDasInstrucoesDeExecucao(projectId) });
  return true;
}

/** Só endereço local vira link: a api já recusa outro, e a tela não confia. */
export function urlLocalSegura(url: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+(\/|$)/.test(url);
}
