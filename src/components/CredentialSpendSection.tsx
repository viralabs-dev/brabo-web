import { Shimmer } from './ui/Shimmer';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCredentialSpend } from '../lib/api-client';
import { ROTULO_DO_PROVIDER } from '../lib/models';
import type { LLMProviderName } from '../lib/api-types';
import { Badge } from './ui/Badge';
import { EmptyState } from './ui/EmptyState';
import { Table } from './ui/Table';

import styles from './CredentialSpendSection.module.css';

import { formatarUsd, formatarMes } from './CredentialSpendSection.helpers';
/**
 * Quanto as chaves do OWNER gastaram (RN-060).
 *
 * Existe porque a RN-058 mudou de quem é a conta: os agentes de todos os
 * projetos gastam a credencial do dono do workspace. Quem paga precisa ver o
 * que saiu — por provider, que é a unidade da chave, e separando AGENTE de
 * pessoa, porque as duas coisas saem da mesma credencial e respondem perguntas
 * diferentes.
 *
 * Só o owner monta este componente: a rota exige `owner` e pedir um 403 de
 * propósito seria ruído no log de segurança.
 */
export function CredentialSpendSection({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('models');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['credential-spend', workspaceId],
    queryFn: () => getCredentialSpend(workspaceId),
  });

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.tituloLinha}>
          <h2 className={styles.title}>{t('spend.title')}</h2>
          <span className={styles.eyebrow}>{t('spend.eyebrow')}</span>
        </div>
        <div className={styles.subtitle}>
          {t('spend.subtitlePrefix')}
          <strong>{t('spend.subtitleYours')}</strong>
          {t('spend.subtitleSuffix')}
        </div>
      </div>

      {isLoading && <EmptyState><Shimmer>{t('spend.loading')}</Shimmer></EmptyState>}

      {isError && <EmptyState>{t('spend.error')}</EmptyState>}

      {data && data.porProvider.length === 0 && (
        <EmptyState>{t('spend.empty', { months: data.meses })}</EmptyState>
      )}

      {data && data.porProvider.length > 0 && (
        <>
          <div className={styles.total}>
            <span className={styles.totalRotulo}>
              {t('spend.totalLabel', { months: data.meses })}
            </span>
            <span className={styles.totalValor}>
              {formatarUsd(data.totalMicros)}
            </span>
          </div>

          <Table
            rows={data.porProvider}
            rowKey={(p) => p.provider}
            columns={[
              {
                key: 'provider',
                label: t('spend.headers.provider'),
                render: (p) => (
                  <>
                    {ROTULO_DO_PROVIDER[p.provider as LLMProviderName] ?? p.provider}
                    {/* Chave removida cujo gasto continua no histórico: o
                        consumo aconteceu, e some-lo daria um total que não bate
                        com fatura nenhuma. */}
                    {!p.temCredencial && (
                      <Badge tone="muted">{t('spend.credentialNotRegistered')}</Badge>
                    )}
                  </>
                ),
              },
              { key: 'agents', label: t('spend.headers.agents'), render: (p) => formatarUsd(p.costMicrosAgentes) },
              { key: 'you', label: t('spend.headers.youInChat'), render: (p) => formatarUsd(p.costMicrosPessoas) },
              { key: 'calls', label: t('spend.headers.calls'), render: (p) => p.chamadas },
              { key: 'total', label: t('spend.headers.total'), render: (p) => formatarUsd(p.costMicros) },
            ]}
          />

          <div className={styles.meses}>
            {data.porProvider.map((p) =>
              p.porMes.map((m) => (
                <div key={`${p.provider}-${m.mes}`} className={styles.mesLinha}>
                  <span className={styles.mesRotulo}>
                    {formatarMes(m.mes)} ·{' '}
                    {ROTULO_DO_PROVIDER[p.provider as LLMProviderName] ??
                      p.provider}
                  </span>
                  <span className={styles.mesValor}>
                    {formatarUsd(m.costMicros)}{' '}
                    <span className={styles.mesChamadas}>
                      {t('spend.callsCount', { count: m.chamadas })}
                    </span>
                  </span>
                </div>
              )),
            )}
          </div>
        </>
      )}
    </div>
  );
}

