import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProjectPermissions, setProjectPermissions } from '../lib/api-client';
import type { PermissionListName } from '../lib/api-types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, type TableColumn } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Item } from '../components/shadcn/item';
import { Shimmer } from '../components/ui/Shimmer';
import { AlertCircleIcon, SearchIcon, TrashIcon } from '../components/ui/icons';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import styles from './ProjectApprovalsTab.module.css';

interface PermissionRow {
  pattern: string;
  list: PermissionListName;
}

/**
 * A tabela de regras do `permissions.json` (AT-895). Morava dentro da aba
 * Aprovações; agora é a sub-aba Permissões da seção Decisões, sem mudança de
 * comportamento (mesma query, mesma revogação por linha).
 */
export function PermissoesDoProjeto({ projectId }: { projectId: string }) {
  const { t } = useTranslation('approvals');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const permissionsQuery = useQuery({
    queryKey: ['permissions', projectId],
    queryFn: () => getProjectPermissions(projectId),
  });

  async function revokeRule(row: PermissionRow) {
    if (!permissionsQuery.data) return;
    const updated = {
      ...permissionsQuery.data,
      [row.list]: permissionsQuery.data[row.list].filter((p) => p !== row.pattern),
    };
    await setProjectPermissions(projectId, updated);
    queryClient.invalidateQueries({ queryKey: ['permissions', projectId] });
  }

  const rows: PermissionRow[] = permissionsQuery.data
    ? (['allow', 'deny', 'ask'] as PermissionListName[]).flatMap((list) =>
        permissionsQuery.data![list].map((pattern) => ({ pattern, list })),
      )
    : [];
  const filteredRows = rows.filter(
    (r) => r.pattern.toLowerCase().includes(search.toLowerCase()) || r.list.includes(search.toLowerCase()),
  );

  const columns: TableColumn<PermissionRow>[] = [
    {
      key: 'pattern',
      label: t('approvalsTab.permissions.columnPattern'),
      width: '2.4fr',
      render: (r) => <span className={styles.pattern}>{r.pattern}</span>,
    },
    {
      key: 'type',
      label: t('approvalsTab.permissions.columnType'),
      width: '0.9fr',
      render: (r) => (
        <Badge square tone={r.list === 'deny' ? 'danger' : r.list === 'allow' ? 'success' : 'warning'}>
          {r.list}
        </Badge>
      ),
    },
    {
      key: 'action',
      label: t('approvalsTab.permissions.columnAction'),
      width: '64px',
      // Botão QUADRADO só de ícone; o nome acessível carrega o padrão porque
      // "Revogar" sozinho, repetido por linha, não diz revogar o quê.
      render: (r) => (
        <Button
          type="button"
          icon
          size="sm"
          variant="secondary"
          className={styles.revoke}
          title={t('approvalsTab.permissions.revoke')}
          aria-label={t('approvalsTab.permissions.revokeAriaLabel', { pattern: r.pattern })}
          onClick={() => revokeRule(r)}
        >
          <TrashIcon size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>{t('approvalsTab.permissions.title')}</h2>
        <span className={styles.eyebrow}>.brabo/permissions.json</span>
      </div>
      <p className={styles.subtitle}>{t('approvalsTab.permissions.subtitle')}</p>
      <div className={styles.banner}>
        <AlertCircleIcon size={15} className={styles.bannerIcone} />
        <span>
          {t('approvalsTab.permissions.bannerPrefix')} <b className={styles.deny}>deny</b>{' '}
          {t('approvalsTab.permissions.bannerMiddle')} <b className={styles.allow}>allow</b>
          {t('approvalsTab.permissions.bannerSuffix')}
        </span>
      </div>
      <div className={styles.searchRow}>
        <Input
          mono
          placeholder={t('approvalsTab.permissions.searchPlaceholder')}
          icon={<SearchIcon size={15} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {permissionsQuery.isError ? (
        <ErroDeCarregamento
          titulo={t('approvalsTab.permissions.error')}
          erro={permissionsQuery.error}
          onTentarDeNovo={() => void permissionsQuery.refetch()}
        />
      ) : permissionsQuery.data === undefined ? (
        <Item variant="outline" className={styles.clean}>
          <Shimmer>{t('approvalsTab.permissions.loading')}</Shimmer>
        </Item>
      ) : (
        <Table
          columns={columns}
          rows={filteredRows}
          rowKey={(r) => `${r.list}:${r.pattern}`}
          emptyMessage={
            rows.length === 0
              ? t('approvalsTab.permissions.emptyNoRules')
              : t('approvalsTab.permissions.emptyNoMatch')
          }
        />
      )}
    </div>
  );
}
