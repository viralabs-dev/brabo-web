import { useState } from 'react';
import { Workflow } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ajuda } from '@/components/ui/Ajuda';
import { Item } from '@/components/shadcn/item';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import { listAutomacoes, setAutomacao } from '../../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { roleAtLeast } from '../../lib/roles';
import styles from '../ProjectSettingsTab.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';

const PASSAGENS = [
  { chave: 'arquiteto->infra', i18n: 'arquitetoInfra' },
  { chave: 'infra->dev-lead', i18n: 'infraDevLead' },
] as const;

/**
 * As passagens Arquiteto→Infra e Infra→Dev Lead sem clique (RN-1421, AT-994):
 * nascem LIGADAS e a pessoa pode desligá-las; desligada, a oferta volta a
 * pedir o clique em Aceitar. Quem não é `maintainer` vê a chave inerte, com o
 * motivo em TEXTO.
 */
export function PassagensSemCliqueSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: automacoes } = useQuery({
    queryKey: ['automacoes', projectId],
    queryFn: () => listAutomacoes(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const papel = useCurrentWorkspaceWithRole();
  const [saving, setSaving] = useState(false);

  async function gravar(chave: string, ligada: boolean) {
    setSaving(true);
    try {
      await setAutomacao(projectId, 'handoff', chave, ligada);
      await queryClient.invalidateQueries({ queryKey: ['automacoes', projectId] });
      showToast({ title: t(ligada ? 'passagensSemClique.toast.on' : 'passagensSemClique.toast.off'), tone: 'success' });
    } catch {
      showToast({ title: t('passagensSemClique.toast.error'), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  }

  if (!automacoes) return null;

  const pode = roleAtLeast(papel.data?.role, 'maintainer');

  return (
    <SecaoDeConfiguracoes chave="passagens-sem-clique">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>
          <Workflow aria-hidden="true" className={styles.tituloIcone} />
          {t('passagensSemClique.title')}
        </h2>
        <Ajuda assunto={t('passagensSemClique.title')}>{t('passagensSemClique.subtitle')}</Ajuda>
        <span className={styles.eyebrow}>{t('passagensSemClique.eyebrow')}</span>
      </div>

      {PASSAGENS.map(({ chave, i18n }) => {
        const ligada = automacoes.find((a) => a.chave === chave)?.ligada ?? true;
        return (
          <Item key={chave} variant="outline" className={styles.ajusteCard}>
            <div className={styles.ajusteInfo}>
              <div className={styles.ajusteTitulo}>{t(`passagensSemClique.${i18n}.title`)}</div>
              <div className={styles.ajusteHint}>{t(`passagensSemClique.${i18n}.hint`)}</div>
              {!pode && (
                <div className={styles.ajusteHint} data-testid="passagem-sem-clique-motivo">
                  {t('passagensSemClique.reason')}
                </div>
              )}
            </div>
            <div className={styles.ajusteControle}>
              <input
                type="checkbox"
                role="switch"
                checked={ligada}
                disabled={!pode || saving}
                aria-label={t('passagensSemClique.switchAria', { passagem: t(`passagensSemClique.${i18n}.title`) })}
                onChange={() => void gravar(chave, !ligada)}
              />
            </div>
          </Item>
        );
      })}
    </SecaoDeConfiguracoes>
  );
}
