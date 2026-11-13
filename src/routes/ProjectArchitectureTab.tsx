import { useTranslation } from 'react-i18next';
import { useArchitecture } from '../lib/hooks';
import { GrafoDeModulos } from '../components/GrafoDeModulos';
import { C4DiagramView } from '../components/C4DiagramView';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import type { Architecture, Epic } from '../lib/api-types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { Network } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { listBacklog } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { pedirAba } from '../lib/contagens-do-projeto';
import styles from './ProjectArchitectureTab.module.css';

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
  // Histórias por módulo: lidas só do cache do backlog (RN-1220, RN-632), sem requisição nova.
  const { data: backlog } = useQuery({
    queryKey: ['backlog', projectId],
    queryFn: () => listBacklog(projectId),
    enabled: false,
  });
  return <ArchitectureContent architecture={architecture} projectId={projectId} backlog={backlog} />;
}

const ADR_TONE: Record<string, BadgeTone> = {
  pending: 'warning',
  approved: 'accent',
  executed: 'success',
  failed: 'danger',
  denied: 'muted',
};

function ArchitectureContent({
  architecture,
  projectId,
  backlog,
}: {
  architecture?: Architecture;
  projectId: string;
  backlog?: Epic[];
}) {
  const { t } = useTranslation('overview');
  const moduleMap = architecture?.moduleMap;
  const adrs = architecture?.adrs ?? [];
  const pendencies = architecture?.pendencies ?? [];
  const c4Diagram = architecture?.c4Diagram;

  const pendente = adrs.find((a) => a.status === 'pending');
  // Quantas histórias citam o módulo em `moduleIds`; sem cache do backlog, nulo ("—").
  const historias = (nome: string) =>
    backlog ? backlog.flatMap((e) => e.stories).filter((st) => (st.moduleIds ?? []).includes(nome)).length : null;

  const isEmpty = !moduleMap && adrs.length === 0 && pendencies.length === 0;

  return (
    // AT-327: a aba começa no topo como as outras — `.arch` (margem de 28px)
    // é de SEÇÃO que vem depois de outra, e deixava o título 29px abaixo.
    <div>
      {pendente && (
        <div className={styles.faixa}>
          <span className={styles.faixaTag}>{t('architectureTab.proposalTag')}</span>
          <span className={styles.faixaTexto}>{t('architectureTab.adrProposal', { titulo: pendente.title })}</span>
          <Button variant="secondary" size="sm" onClick={() => pedirAba({ projectId, tab: 'approvals' })}>
            {t('architectureTab.decide')}
          </Button>
        </div>
      )}
      {isEmpty ? (
        <EmptyState icone={<Network />} titulo={t('architectureTab.emptyTitle')}>
          {t('architectureTab.emptyState')}
        </EmptyState>
      ) : (
        <>
          {!moduleMap || moduleMap.modules.length === 0 ? (
            <div className={styles.sectionSub}>{t('architectureTab.noModules')}</div>
          ) : (
            <>
            {/* Grafo derivado do mesmo module_map (RN-149), acima dos cartões. */}
            <GrafoDeModulos modulos={moduleMap.modules} />
            <h2 className={styles.titulo}>{t('architectureTab.modulesLabel')}</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('architectureTab.cols.module')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.stack')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.responsibility')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.dependsOn')}</TableHead>
                  <TableHead scope="col">{t('architectureTab.cols.stories')}</TableHead>
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
                        : (
                          <span className={styles.deps}>
                            {m.dependsOn.map((d) => (
                              <Badge key={d} tone="neutral">
                                {d}
                              </Badge>
                            ))}
                          </span>
                        )}
                    </TableCell>
                    <TableCell>{historias(m.name) ?? '—'}</TableCell>
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
