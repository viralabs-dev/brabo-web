import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ajuda } from '@/components/ui/Ajuda';
import { Item } from '@/components/shadcn/item';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import { desfazerAutomacao, listAutomacoes } from '../../lib/api-client';
import { partesDaChave } from '../../lib/automacao-oferta';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { roleAtLeast } from '../../lib/roles';
import styles from '../ProjectSettingsTab.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';

/**
 * RN-1443 (AT-999): as regras "fazer sozinho" que a pessoa aceitou no chat, com
 * "Desfazer" por linha. Só `maintainer` desfaz; os demais veem o botão inerte e
 * o motivo em TEXTO. Sem regra de oferta, a seção não aparece.
 */
export function RegrasDeOfertaSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: automacoes } = useQuery({
    queryKey: ['automacoes', projectId],
    queryFn: () => listAutomacoes(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const papel = useCurrentWorkspaceWithRole();
  const [desfazendo, setDesfazendo] = useState<string | null>(null);

  const regras = (automacoes ?? []).filter((a) => a.origem === 'oferta');
  if (regras.length === 0) return null;
  const pode = roleAtLeast(papel.data?.role, 'maintainer');

  async function desfazer(categoria: string, chave: string) {
    setDesfazendo(`${categoria}:${chave}`);
    try {
      await desfazerAutomacao(projectId, categoria, chave);
      await queryClient.invalidateQueries({ queryKey: ['automacoes', projectId] });
      showToast({ title: t('regrasDeOferta.toast.ok'), tone: 'success' });
    } catch {
      showToast({ title: t('regrasDeOferta.toast.error'), tone: 'danger' });
    } finally {
      setDesfazendo(null);
    }
  }

  return (
    <SecaoDeConfiguracoes chave="regras-de-oferta">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>
          <Undo2 aria-hidden="true" className={styles.tituloIcone} />
          {t('regrasDeOferta.title')}
        </h2>
        <Ajuda assunto={t('regrasDeOferta.title')}>{t('regrasDeOferta.subtitle')}</Ajuda>
        <span className={styles.eyebrow}>{t('regrasDeOferta.eyebrow')}</span>
      </div>

      {regras.map(({ categoria, chave }) => {
        const { acao, agente } = partesDaChave(chave);
        const nome = categoria === 'aprovacao' ? `${acao} · ${agente}` : chave;
        const rotulo = t(`regrasDeOferta.categoria.${categoria}`, { defaultValue: categoria });
        return (
          <Item key={`${categoria}:${chave}`} variant="outline" className={styles.ajusteCard}>
            <div className={styles.ajusteInfo}>
              <div className={styles.ajusteTitulo}>{nome}</div>
              <div className={styles.ajusteHint}>{rotulo}</div>
              {!pode && (
                <div className={styles.ajusteHint} data-testid="regra-de-oferta-motivo">
                  {t('regrasDeOferta.reason')}
                </div>
              )}
            </div>
            <div className={styles.ajusteControle}>
              <Button
                variant="secondary"
                disabled={!pode || desfazendo !== null}
                loading={desfazendo === `${categoria}:${chave}`}
                onClick={() => void desfazer(categoria, chave)}
              >
                {t('regrasDeOferta.desfazer')}
              </Button>
            </div>
          </Item>
        );
      })}
    </SecaoDeConfiguracoes>
  );
}
