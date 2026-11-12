import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { createSession, mensagemDaApi, transitionSession } from './api-client';
import { useToast } from '../components/ui/ToastProvider.helpers';
import type { SessionKind } from './api-types';

/**
 * Criar, ativar e abrir uma sessão: a régua ÚNICA do "Nova sessão" da aba de
 * Sessões e do cabeçalho do projeto (AT-888, RN-1210).
 *
 * Os DOIS passos têm desfecho próprio: falhar em ativar não desfaz a criação
 * (a sessão existe), então a navegação acontece de todo modo — é lá que mora o
 * "Ativar sessão". Nome em branco não vai no corpo (RN-098).
 */
export function useCriarSessao(projectId: string) {
  const { t } = useTranslation('sessions');
  const [criando, setCriando] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  async function criar(kind: SessionKind, nome?: string) {
    setCriando(true);
    try {
      const session = await createSession(projectId, { kind, name: nome?.trim() || undefined });
      try {
        await transitionSession(projectId, session.id, 'active');
      } catch (erro) {
        showToast({
          title: mensagemDaApi(erro, t('sessionsTab.createActivationFailed.title')),
          message: t('sessionsTab.createActivationFailed.message'),
          tone: 'danger',
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['sessions', projectId] });
      navigate({ to: '/projects/$projectId/sessions/$sessionId', params: { projectId, sessionId: session.id } });
    } catch (erro) {
      showToast({ title: mensagemDaApi(erro, t('sessionsTab.createFailed.title')), tone: 'danger' });
    } finally {
      setCriando(false);
    }
  }

  return { criar, criando };
}
