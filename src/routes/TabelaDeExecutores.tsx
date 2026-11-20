import { Fragment } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Ellipsis, RotateCcw, Search } from 'lucide-react';
import type { AgentStatus, AutonomyMode } from '../components/AgentCard';
import type { RosterEntry } from '../lib/agent-status';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { AvatarDoAgente } from '../components/ui/AvatarDoAgente';
import { formatMicros } from '../lib/execution';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import styles from './TabelaDeExecutores.module.css';

const TOM: Record<AgentStatus, BadgeTone> = {
  trabalhando: 'success',
  aguardando: 'warning',
  ocioso: 'muted',
  falhou: 'danger',
  travado: 'danger',
};

/** Tudo que a linha precisa já resolvido por quem monta (a aba): a tabela não lê a api. */
export interface LinhaDeExecutor {
  entry: RosterEntry;
  /** Selo "Lead" (lead de área). */
  lead: boolean;
  /** Tarefa atual ou última; o motivo quando travado. */
  tarefa?: { label: string; branch?: string };
  modelId?: string;
  custoMicros?: number;
  /** Só lead e agente solo têm autonomia (subagente não propõe ação). */
  autonomia?: AutonomyMode;
  autonomiaHint?: string;
}

interface Props {
  projectId: string;
  /** A sessão de execução: o "Ver no fio" vai para ela. */
  sessionId: string;
  linhas: LinhaDeExecutor[];
  modelos: { id: string; name: string }[];
  modelDisabledReason?: string;
  onModelChange: (agentId: string, modelId: string) => void;
  onAutonomyChange: (agentId: string, mode: AutonomyMode) => void;
  onRearm: (agentId: string) => void;
  onWake: (agentId: string) => void;
}

/**
 * AT-970 (RN-1466): os executores numa tabela, uma linha por agente. Texto na ação só quando há
 * o que fazer ("Retomar", "Procurar tarefa", "Ver no fio"); o resto mora no menu "…". Toda ação do
 * antigo cartão continua aqui: modelo, autonomia, rearmar e acordar.
 */
export function TabelaDeExecutores({
  projectId,
  sessionId,
  linhas,
  modelos,
  modelDisabledReason,
  onModelChange,
  onAutonomyChange,
  onRearm,
  onWake,
}: Props) {
  const { t } = useTranslation('executors');
  return (
    <Table className={styles.tabela} data-testid="tabela-de-executores">
      <TableHeader>
        <TableRow>
          <TableHead>{t('tabela.agente')}</TableHead>
          <TableHead>{t('tabela.estado')}</TableHead>
          <TableHead>{t('tabela.tarefa')}</TableHead>
          <TableHead>{t('tabela.modelo')}</TableHead>
          <TableHead className={styles.direita}>{t('tabela.gasto')}</TableHead>
          <TableHead>
            <span className={styles.somenteLeitor}>{t('tabela.acoes')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map(({ entry, lead, tarefa, modelId, custoMicros, autonomia, autonomiaHint }) => {
          const { id, def, status } = entry;
          const verNoFio = (
            <Link to="/projects/$projectId/sessions/$sessionId" params={{ projectId, sessionId }} className={styles.link}>
              {t('tabela.verNoFio')}
            </Link>
          );
          return (
            <TableRow key={id} data-testid={`executor-${id}`} className={styles.linha}>
              <TableCell>
                <span className={styles.agente} style={{ ['--msg-color' as string]: def.color }}>
                  <AvatarDoAgente id={id} />
                  <span className={styles.nome}>{def.name}</span>
                  {lead && <Badge tone="agent">{t('teamGrid.leadBadge')}</Badge>}
                </span>
              </TableCell>
              <TableCell>
                <Badge tone={TOM[status]} dot pulse={status === 'trabalhando'}>
                  {t(`agentCard.status.${status}`)}
                </Badge>
              </TableCell>
              <TableCell className={styles.tarefa}>
                {tarefa ? (
                  <span title={tarefa.label}>
                    {tarefa.label}
                    {tarefa.branch && <span className={styles.branch}> · {tarefa.branch}</span>}
                  </span>
                ) : (
                  <span className={styles.vazio}>{t('tabela.semTarefa')}</span>
                )}
              </TableCell>
              <TableCell>
                {modelos.length > 0 ? (
                  <Select
                    className={styles.modelo}
                    aria-label={t('agentCard.model.label', { agente: def.name })}
                    title={modelDisabledReason}
                    value={modelId ?? ''}
                    disabled={!!modelDisabledReason}
                    onChange={(e) => e.target.value && onModelChange(id, e.target.value)}
                  >
                    {!modelId && <option value="">{t('agentCard.model.escolher')}</option>}
                    {modelos.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className={styles.vazio}>{t('tabela.semTarefa')}</span>
                )}
              </TableCell>
              <TableCell className={`${styles.direita} ${styles.mono}`}>
                {custoMicros !== undefined ? formatMicros(custoMicros) : <span className={styles.vazio}>—</span>}
              </TableCell>
              <TableCell>
                <span className={styles.acoes}>
                  {status === 'travado' && (
                    <Button variant="secondary" size="sm" onClick={() => onRearm(id)}>
                      <RotateCcw size={14} aria-hidden="true" />
                      {t('tabela.retomar')}
                    </Button>
                  )}
                  {status === 'ocioso' && (
                    <Button variant="secondary" size="sm" onClick={() => onWake(id)}>
                      <Search size={14} aria-hidden="true" />
                      {t('agentCard.wake')}
                    </Button>
                  )}
                  {status === 'trabalhando' && verNoFio}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="sm" legenda={t('tabela.maisAcoes', { agente: def.name })} />}
                    >
                      <Ellipsis aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={styles.menu}>
                      <DropdownMenuItem render={<Link to="/projects/$projectId/sessions/$sessionId" params={{ projectId, sessionId }} />}>
                        {t('tabela.verNoFio')}
                      </DropdownMenuItem>
                      {autonomia && (
                        <Fragment>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup value={autonomia} onValueChange={(v) => onAutonomyChange(id, v as AutonomyMode)}>
                            <DropdownMenuLabel>{t('tabela.autonomia')}</DropdownMenuLabel>
                            <DropdownMenuRadioItem value="manual">{t('agentCard.autonomy.manual')}</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="auto">{t('agentCard.autonomy.auto')}</DropdownMenuRadioItem>
                          </DropdownMenuRadioGroup>
                          {autonomiaHint && <span className={styles.dica}>{autonomiaHint}</span>}
                        </Fragment>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
