import { useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { activateExecution, getContainerLifecycle, getRepository, mensagemDaApi } from '../lib/api-client';
import { useActiveExecutionSession, useCurrentWorkspaceWithRole } from '../lib/hooks';
import { roleAtLeast } from '../lib/roles';
import { Button } from './ui/Button';

/**
 * AT-894 (RN-1220): a ação primária "Ativar execução" do cabeçalho de Trabalho.
 * Mesmo gesto da Visão geral (`POST .../execution/activate`, `maintainer` no
 * endpoint, RN-102); só aparece com a leitura CONFIRMANDO que não há execução
 * vigente. A recusa da api (409 sem container, RN-1101; sem repositório) é dita
 * aqui, em texto, ao lado da ação.
 */
export function AtivarExecucao({ projectId }: { projectId: string }) {
  const { t } = useTranslation('executors');
  const queryClient = useQueryClient();
  const { data: workspace } = useCurrentWorkspaceWithRole();
  const { session, isSuccess } = useActiveExecutionSession(projectId);
  // RN-582: sem repositório CONFIRMADO o botão tranca e o motivo aparece aqui, no cartão (v9).
  const repositorio = useQuery({
    queryKey: ['repository', projectId], // a mesma do `useAtivarExecucao`: nenhuma leitura a mais (RN-632)
    queryFn: () => getRepository(projectId),
    staleTime: 30_000,
  });
  const semRepositorio = repositorio.isSuccess && repositorio.data === null;
  // Mesma queryKey do painel de código: nenhuma leitura a mais (RN-632).
  const lifecycle = useQuery({
    queryKey: ['container-lifecycle', projectId],
    queryFn: () => getContainerLifecycle(projectId),
    staleTime: 30_000,
  });
  // RN-1300: só `running` libera; leitura em curso ou com erro não tranca (a api decide).
  const semContainer = lifecycle.isSuccess && lifecycle.data?.status !== 'running';
  const [ocupado, setOcupado] = useState(false);
  const [recusa, setRecusa] = useState<string | null>(null);
  if (!isSuccess || session) return null;
  const pode = roleAtLeast(workspace?.role, 'maintainer');

  async function ativar() {
    if (ocupado) return;
    setOcupado(true);
    setRecusa(null);
    try {
      await activateExecution(projectId);
      await queryClient.invalidateQueries({ queryKey: ['sessions', projectId] });
    } catch (erro) {
      setRecusa(mensagemDaApi(erro, t('chamada.activateError')));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div data-testid="ativar-execucao">
      <Button variant="primary" loading={ocupado} disabled={!pode || semContainer || semRepositorio} onClick={ativar}>
        <Play aria-hidden="true" />
        {t('chamada.activate')}
      </Button>
      {semRepositorio && <p data-testid="sem-repositorio">{t('chamada.semRepositorio')}</p>}
      {semContainer && (
        <p>
          {t('chamada.semContainer')} <Link to="/containers">{t('chamada.abrirContainers')}</Link>
        </p>
      )}
      {!pode && <p>{t('chamada.needsMaintainer')}</p>}
      {recusa && <p role="alert">{recusa}</p>}
    </div>
  );
}
