import { useState } from 'react';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { activateExecution, mensagemDaApi } from '../lib/api-client';
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
      <Button variant="primary" loading={ocupado} disabled={!pode} onClick={ativar}>
        <Play aria-hidden="true" />
        {t('chamada.activate')}
      </Button>
      {!pode && <p>{t('chamada.needsMaintainer')}</p>}
      {recusa && <p role="alert">{recusa}</p>}
    </div>
  );
}
