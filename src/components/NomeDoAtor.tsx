import { useTranslation } from 'react-i18next';
import type { ProposedAction } from '../lib/api-types';
import { useAutoriaDaSessao } from '../lib/autoria-da-sessao';
import { autorDaMensagem } from '../lib/autor-da-mensagem';
import { pareceUuid } from '../lib/sem-identificador';

/**
 * O nome de quem propôs, quando é uma PESSOA (RN-705): a mesma leitura de
 * membros do fio da sessão (RN-652/655). Quem a tela não sabe nomear vira
 * "outro membro", nunca o UUID cru.
 */
export function NomeDoMembroAtor({ action }: { action: ProposedAction }) {
  const { t } = useTranslation('approvals');
  const autoria = useAutoriaDaSessao(action.projectId);
  const autor = autorDaMensagem(action.actor, autoria);
  if (autor.tipo === 'voce') return <>{autor.nome ?? t('approvalCard.actorYou')}</>;
  if (autor.tipo === 'membro') return <>{autor.nome}</>;
  if (autor.tipo === 'outroMembro') return <>{t('approvalCard.actorOtherMember')}</>;
  return <>{pareceUuid(action.actor.id) ? t('approvalsTab.decided.agenteSemNome') : action.actor.id}</>;
}
