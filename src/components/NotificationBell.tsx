import { useTranslation } from 'react-i18next';
import type { SessionEvent } from '../lib/api-types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shadcn/popover';
import { Badge } from './ui/Badge';
import { formatRelativeTime } from '../lib/time';
import { agruparAtividade, type ItemQuePrecisaDeVoce } from '../lib/notificacoes';
import { Button } from './ui/Button';
import { BellIcon } from './ui/icons';
import styles from './NotificationBell.module.css';

export interface NotificationGroup {
  projectId: string;
  projectName: string;
  /**
   * Já ORDENADOS pela api, do mais recente para o mais antigo (RN-100) — e
   * renderizados nessa ordem, sem `.sort()` aqui.
   *
   * Não é preciosismo: a consulta corta em 50 por projeto escolhendo os mais
   * NOVOS, então a lista que chega é uma janela, não uma amostra reordenável.
   * Ordenar de novo aqui só teria efeito se a api tivesse escolhido errado —
   * e aí o erro estaria escondido, não corrigido.
   */
  events: SessionEvent[];
  /** Total de não lidos do projeto, inclusive o que não coube na janela. */
  unreadCount: number;
  /** Quantos ficaram fora da janela — sempre os mais antigos. */
  olderCount: number;
}

interface NotificationBellProps {
  /** Só o que precisa de você (RN-1469); `undefined` = ainda não lido. */
  precisam: ItemQuePrecisaDeVoce[] | undefined;
  /** Total REAL das filas: é o número do selo. */
  precisamTotal: number;
  precisamErro?: boolean;
  /** A atividade por projeto (os eventos não lidos, agrupados); NÃO entra no selo. */
  groups: NotificationGroup[];
  /**
   * CONTROLADO por quem monta o sino, e não estado interno: abrir a gaveta é
   * o que dispara a busca dos eventos não lidos (uma consulta por projeto com
   * pendência).
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Avança o corte de leitura por `seq` (RN-091); só mexe na atividade. */
  onMarkRead: () => void;
  onAbrirItem: (item: ItemQuePrecisaDeVoce) => void;
  onAbrirProjeto: (projectId: string) => void;
}

export function NotificationBell({
  precisam,
  precisamTotal,
  precisamErro,
  groups,
  open,
  onOpenChange,
  onMarkRead,
  onAbrirItem,
  onAbrirProjeto,
}: NotificationBellProps) {
  const { t } = useTranslation('shell');
  const { recentes, parados } = agruparAtividade(groups);
  const eventos = (n: number) => t('notificationBell.atividade.eventos', { count: n });

  return (
    <div className={styles.wrapper}>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          render={<Button variant="secondary" className={styles.button} aria-label={t('notificationBell.label')} />}
        >
          <BellIcon size={17} />
          {precisamTotal > 0 && (
            <Badge tone="accent" className={styles.badge}>
              {precisamTotal > 99 ? '99+' : precisamTotal}
            </Badge>
          )}
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8} className={styles.dropdown}>
          <div className={styles.header}>
            <span className={styles.headerTitle}>{t('notificationBell.label')}</span>
          </div>

          <section aria-label={t('notificationBell.precisam.titulo')}>
            <div className={styles.secao}>{t('notificationBell.precisam.titulo')}</div>
            {precisamErro ? (
              <div className={styles.aviso}>{t('notificationBell.precisam.erro')}</div>
            ) : precisam === undefined ? (
              <div className={styles.aviso}>{t('notificationBell.precisam.carregando')}</div>
            ) : precisam.length === 0 ? (
              <div className={styles.aviso}>{t('notificationBell.precisam.vazio')}</div>
            ) : (
              precisam.map((item) => (
                <div key={item.id} className={styles.linha}>
                  <span className={styles.texto}>
                    <span className={styles.sujeito}>{item.sujeito}</span>
                    <span className={styles.motivo}>{item.motivo ?? t(`notificationBell.tipo.${item.fila}`)}</span>
                    <span className={styles.meta}>
                      {item.projectName}
                      {item.desde ? ` · ${formatRelativeTime(item.desde)}` : ''}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => onAbrirItem(item)}>
                    {t('notificationBell.abrir')}
                  </Button>
                </div>
              ))
            )}
          </section>

          <section aria-label={t('notificationBell.atividade.titulo')}>
            <div className={styles.secao}>
              {t('notificationBell.atividade.titulo')}
              {groups.length > 0 && (
                <Button variant="ghost" size="sm" className={styles.markRead} onClick={onMarkRead}>
                  {t('notificationBell.markRead')}
                </Button>
              )}
            </div>
            {groups.length === 0 && <div className={styles.aviso}>{t('notificationBell.atividade.vazio')}</div>}
            {recentes.map((g) => (
              <button key={g.projectId} type="button" className={styles.linhaProjeto} onClick={() => onAbrirProjeto(g.projectId)}>
                <span className={styles.sujeito}>{g.projectName}</span>
                <span className={styles.meta}>
                  {eventos(g.eventos)}
                  {g.ultimoEm ? ` · ${formatRelativeTime(g.ultimoEm)}` : ''}
                </span>
              </button>
            ))}
            {parados.projetos > 0 && (
              <div className={styles.aviso}>
                {t('notificationBell.atividade.parados', { count: parados.projetos, eventos: eventos(parados.eventos) })}
              </div>
            )}
          </section>
        </PopoverContent>
      </Popover>
    </div>
  );
}
