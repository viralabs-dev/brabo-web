import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { useCurrentWorkspaceWithRole } from '../lib/hooks';
import { roleAtLeast } from '../lib/roles';
import { useCriarSessao } from '../lib/use-criar-sessao';

/**
 * "Começar a ideação" (RN-1396, AT-986): cria, ativa e abre a sessão do
 * Criativo num clique, pela régua única do `useCriarSessao` (RN-1210) — em vez
 * de cair na lista de sessões vazia. Criar sessão pede `developer` (RN-102);
 * sem o papel o botão fica desabilitado, com o motivo visível.
 */
export function ComecarIdeacao({ projectId, className }: { projectId: string; className?: string }) {
  const { t } = useTranslation('overview');
  const { criar, criando } = useCriarSessao(projectId);
  const { data: comPapel } = useCurrentWorkspaceWithRole();
  const pode = roleAtLeast(comPapel?.role, 'developer');
  return (
    <>
      <Button variant="ghost" size="sm" className={className} loading={criando} disabled={!pode || criando} onClick={() => void criar('criativa')}>
        {t('primeirosPassos.ideacao.link')}
      </Button>
      {!pode && comPapel && <span role="note">{t('primeirosPassos.ideacao.semPapel')}</span>}
    </>
  );
}
