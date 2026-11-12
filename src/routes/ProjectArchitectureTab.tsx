import { useTranslation } from 'react-i18next';
import { useArchitecture } from '../lib/hooks';
import { GrafoDeModulos } from '../components/GrafoDeModulos';
import { C4DiagramView } from '../components/C4DiagramView';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import type { Architecture } from '../lib/api-types';
// Mesmo módulo de estilo da Visão geral, de propósito (mesmo padrão de
// `ProjectInsightsTab.tsx`, achado #15): a seção saiu de lá inteira e
// precisa continuar IDÊNTICA visualmente. Duplicar as classes só para ter
// arquivo de CSS próprio abriria a porta para as duas versões divergirem.
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { Network } from 'lucide-react';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import styles from './ProjectOverviewTab.module.css';

/**
 * Aba Arquitetura (PROGRAMA de abas agrupadas — Onda 3): module_map, o
 * diagrama C4 (Context + Container) e os ADRs do Arquiteto, com as
 * pendências de validação cruzada entre história e módulo.
 *
 * Morava dentro da Visão geral (`ArchitectureSection`, achado real: não
 * havia lugar próprio para gerir arquitetura visualmente nem forma de
 * ampliar o diagrama). A extração é 1:1 — mesmo hook (`useArchitecture`),
 * mesmo `C4DiagramView`, nenhuma lógica de dado nova. O que ganhou aqui foi
 * lugar próprio (a Visão geral passou a mostrar um resumo condensado com
 * link "Ver arquitetura completa") e o lightbox de ampliar diagrama
 * (`C4DiagramView.tsx`/`Modal.tsx`).
 */
export function ProjectArchitectureTab({ projectId }: { projectId: string }) {
  const { data: architecture } = useArchitecture(projectId);
  return <ArchitectureContent architecture={architecture} />;
}

const ADR_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'accent',
  executed: 'success',
  failed: 'danger',
  denied: 'muted',
};

function ArchitectureContent({ architecture }: { architecture?: Architecture }) {
  const { t } = useTranslation('overview');
  const moduleMap = architecture?.moduleMap;
  const adrs = architecture?.adrs ?? [];
  const pendencies = architecture?.pendencies ?? [];
  const c4Diagram = architecture?.c4Diagram;

  const isEmpty = !moduleMap && adrs.length === 0 && pendencies.length === 0;

  return (
    // AT-327: a aba começa no topo como as outras — `.arch` (margem de 28px)
    // é de SEÇÃO que vem depois de outra, e deixava o título 29px abaixo.
    <div>
      <div className={styles.sectionHeader}>{t('architectureTab.title')}</div>
      {adrs.some((a) => a.status === 'pending') && (
        <Alert tone="warning">
          {t('architectureTab.adrWaiting', { count: adrs.filter((a) => a.status === 'pending').length })}
        </Alert>
      )}
      {isEmpty ? (
        <EmptyState icone={<Network />} titulo={t('architectureTab.emptyTitle')}>
          {t('architectureTab.emptyState')}
        </EmptyState>
      ) : (
        <>
          <div className={styles.archLabel}>
            {moduleMap
              ? t('architectureTab.modulesLabelVersioned', { version: moduleMap.version })
              : t('architectureTab.modulesLabel')}
          </div>
          {!moduleMap || moduleMap.modules.length === 0 ? (
            <div className={styles.sectionSub}>{t('architectureTab.noModules')}</div>
          ) : (
            <>
            {/* Grafo derivado do mesmo module_map (RN-149), acima dos cartões. */}
            <GrafoDeModulos modulos={moduleMap.modules} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('architectureTab.cols.module')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.stack')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.responsibility')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.dependsOn')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleMap.modules.map((m) => (
                  <TableRow key={m.name}>
                    <TableHead scope="row">{m.name}</TableHead>
                    <TableCell>{m.stack}</TableCell>
                    <TableCell>{m.responsibility}</TableCell>
                    <TableCell>
                      {m.dependsOn.length === 0
                        ? '—'
                        : m.dependsOn.map((d) => (
                            <Badge key={d} tone="neutral">
                              {d}
                            </Badge>
                          ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}

          <div className={styles.archLabel}>
            {c4Diagram?.status === 'gerado'
              ? t('architectureTab.c4LabelVersioned', { version: c4Diagram.version })
              : t('architectureTab.c4Label')}
          </div>
          {c4Diagram?.status === 'gerado' && c4Diagram.diagrama ? (
            <C4DiagramView diagrama={c4Diagram.diagrama} />
          ) : (
            <div className={styles.sectionSub}>{t('architectureTab.c4Empty')}</div>
          )}

          <div className={styles.archLabel}>{t('architectureTab.adrsLabel')}</div>
          {adrs.length === 0 ? (
            <div className={styles.sectionSub}>{t('architectureTab.noAdrs')}</div>
          ) : (
            <ul className={styles.adrList}>
              {adrs.map((adr) => (
                <li key={adr.actionId} className={styles.adrItem}>
                  <Badge tone={ADR_TONE[adr.status] ?? 'muted'}>{adr.status}</Badge>
                  {adr.pullRequestUrl ? (
                    <a
                      href={adr.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.adrLink}
                    >
                      {adr.title}
                    </a>
                  ) : (
                    <span>{adr.title}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {pendencies.length > 0 && (
            <>
              <div className={styles.archLabel}>
                {t('architectureTab.pendenciesLabel')}
                <Badge tone="danger">{pendencies.length}</Badge>
              </div>
              <ul className={styles.pendList}>
                {pendencies.map((p) => (
                  <li key={p.storyId} className={styles.pendItem}>
                    <span className={styles.pendTitle}>{p.title}</span>
                    <span className={styles.pendReason}>
                      {p.reason === 'no_module'
                        ? t('architectureTab.reasonNoModule')
                        : t('architectureTab.reasonMissingModule', { missing: p.missing.join(', ') })}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
