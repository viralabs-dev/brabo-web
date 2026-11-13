import { useState } from 'react';
import { GitMerge } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ajuda } from '@/components/ui/Ajuda';
import { Item } from '@/components/shadcn/item';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import { getProject, setMergeAutomatico } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { roleAtLeast } from '../../lib/roles';
import styles from '../ProjectSettingsTab.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';

/**
 * A chave do merge automático (RN-1316, ADR 0292): desligada por padrão.
 * LIGAR exige `owner` do workspace e confirma dizendo o que a chave libera e o
 * que segue manual; DESLIGAR exige `maintainer` e é direto (só devolve o teto).
 * Quem não alcança o papel vê a chave inerte, com o motivo em TEXTO.
 */
export function MergeAutomaticoSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const papel = useCurrentWorkspaceWithRole();
  const [saving, setSaving] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  async function gravar(habilitado: boolean) {
    setSaving(true);
    setConfirmando(false);
    try {
      await setMergeAutomatico(projectId, habilitado);
      await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      showToast({ title: t(habilitado ? 'autoMerge.toast.on' : 'autoMerge.toast.off'), tone: 'success' });
    } catch {
      showToast({ title: t('autoMerge.toast.error'), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  if (!project) return null;

  const ligado = project.mergeAutomatico === true;
  const pode = roleAtLeast(papel.data?.role, ligado ? 'maintainer' : 'owner');

  return (
    <SecaoDeConfiguracoes chave="auto-merge">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}><GitMerge aria-hidden="true" className={styles.tituloIcone} />{t('autoMerge.title')}</h2>
        <Ajuda assunto={t('autoMerge.title')}>{t('autoMerge.subtitle')}</Ajuda>
        <span className={styles.eyebrow}>{t('autoMerge.eyebrow')}</span>
      </div>

      <Item variant="outline" className={styles.ajusteCard}>
        <div className={styles.ajusteInfo}>
          <div className={styles.ajusteTitulo}>{t('autoMerge.card.title')}</div>
          <div className={styles.ajusteHint}>
            {ligado ? t('autoMerge.card.hintOn') : t('autoMerge.card.hintOff')}
          </div>
          {!pode && (
            <div className={styles.ajusteHint} data-testid="merge-automatico-motivo">
              {t(ligado ? 'autoMerge.reason.desligar' : 'autoMerge.reason.ligar')}
            </div>
          )}
        </div>
        <div className={styles.ajusteControle}>
          <input
            type="checkbox"
            role="switch"
            checked={ligado}
            disabled={!pode || saving}
            aria-label={t('autoMerge.switchAria')}
            onChange={() => (ligado ? void gravar(false) : setConfirmando(true))}
          />
        </div>
      </Item>

      {confirmando && (
        <Modal title={t('autoMerge.confirm.title')} onClose={() => setConfirmando(false)}>
          <p>{t('autoMerge.confirm.body')}</p>
          <p>{t('autoMerge.confirm.manual')}</p>
          <Button variant="secondary" onClick={() => setConfirmando(false)}>
            {t('autoMerge.confirm.cancel')}
          </Button>
          <Button onClick={() => void gravar(true)}>{t('autoMerge.confirm.ok')}</Button>
        </Modal>
      )}
    </SecaoDeConfiguracoes>
  );
}
