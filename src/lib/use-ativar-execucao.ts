import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activateExecution, getRepository, mensagemDaApi } from './api-client';
import { useToast } from '../components/ui/ToastProvider.helpers';

/**
 * "Ativar execução" com a regra de hoje, num lugar só (AT-888, RN-1210): a
 * recusa por repositório (RN-582 — só a ausência CONFIRMADA tranca) e o toast
 * com a causa REAL da api (RN-1101 incluída). Mesma `queryKey` do repositório
 * que a página já lê: nenhuma requisição a mais.
 */
export function useAtivarExecucao(projectId: string) {
  const { t } = useTranslation('overview');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const repositorioQuery = useQuery({
    queryKey: ['repository', projectId],
    queryFn: () => getRepository(projectId),
    staleTime: 30_000, // a página já o leu: o segundo observador não repete (RN-632)
  });
  const semRepositorio = repositorioQuery.isSuccess && repositorioQuery.data === null;

  async function ativar() {
    try {
      await activateExecution(projectId);
      await queryClient.invalidateQueries({ queryKey: ['sessions', projectId] });
    } catch (erro) {
      showToast({
        title: t('executionSection.errorTitle'),
        message: mensagemDaApi(erro, t('executionSection.activateError')),
        tone: 'danger',
      });
    }
  }

  return { ativar, semRepositorio };
}
