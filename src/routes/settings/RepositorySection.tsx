import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getBootstrapPlan, getRepository } from '../../lib/api-client';
import { divergencias } from '../../lib/adoption';
import { Alert } from '../../components/ui/Alert';
import { BranchIcon } from '../../components/ui/icons';
import { CabecalhoDaSecao } from './CabecalhoDaSecao';
import styles from './CabecalhoDaSecao.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { Item } from '@/components/shadcn/item';

/**
 * Repositório do projeto e, quando ele foi ADOTADO, as divergências que
 * o plano registrou (Fase 12a).
 *
 * Fica em Configurações, não na Visão geral: aquela é a superfície viva
 * (time de agentes, execução, feed de atividade em polling), e um
 * diagnóstico estático e não-bloqueante ali competiria com o que muda. É
 * aqui que fatos de repositório e credencial já moram, e é para cá que o
 * maintainer vem quando decide agir.
 */
export function RepositorySection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const { data: repository, isSuccess } = useQuery({
    queryKey: ['repository', projectId],
    queryFn: () => getRepository(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const { data: planoEstado } = useQuery({
    queryKey: ['bootstrap-plan', projectId],
    queryFn: () => getBootstrapPlan(projectId),
    enabled: repository?.origin === 'adopted',
  });

  // v9: a seção abre a página sempre; sem repositório ela diz "não provisionado" na mesma moldura.
  if (!repository && !isSuccess) return null;

  const avisos = planoEstado?.plan ? divergencias(planoEstado.plan) : [];

  return (
    <SecaoDeConfiguracoes chave="repository">
      <CabecalhoDaSecao
        titulo={t('repository.title')}
        subtitulo={
          !repository
            ? t('repository.none.subtitle')
            : repository.origin === 'adopted'
              ? t('repository.adopted')
              : t('repository.created')
        }
      />

      {/* O selo "sincronizado" do desenho NÃO entra: não existe fato de
          sincronismo no `repository`, e um selo fixo afirmaria algo que
          ninguém mediu. */}
      <Item variant="outline" className={styles.moldura}>
        {repository ? (
          <>
            <code className={styles.caminho}>{repository.externalId}</code>
            <span className={styles.chip}>{repository.provider}</span>
            <span className={styles.chip}>
              <BranchIcon size={12} /> {repository.defaultBranch}
            </span>
          </>
        ) : (
          <span className={`${styles.caminho} ${styles.nao}`}>{t('repository.none.title')}</span>
        )}
      </Item>

      {planoEstado?.decision === 'as_is' && (
        <Alert tone="accent">
          {t('repository.dismissed.before')}
          <strong>{t('repository.dismissed.strong')}</strong>
          {t('repository.dismissed.after')}
        </Alert>
      )}

      {avisos.length > 0 && (
        <Alert tone="accent">
          <div>{t('repository.divergesTitle')}</div>
          <ul>
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Alert>
      )}
    </SecaoDeConfiguracoes>
  );
}
