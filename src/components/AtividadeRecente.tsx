import { useTranslation } from 'react-i18next';
import { classifyEvent } from '../lib/activity';
import { AGENTS, corDoAgente } from '../lib/agents';
import { formatRelativeTime } from '../lib/time';
import type { Project, ProjectCardSummary } from '../lib/api-types';
import styles from './AtividadeRecente.module.css';

const LIMITE = 5;

/**
 * "Atividade recente" do Início (AT-941): o ÚLTIMO evento de cada projeto, já
 * lido no resumo da grade — nenhuma requisição nova (RN-632). Mesma sessão e
 * mesmo `classifyEvent` do card (RN-648). Não é um feed: um evento por projeto.
 */
export function AtividadeRecente({
  projects,
  cards,
  erro,
  onAbrir,
}: {
  projects: Project[];
  cards: ProjectCardSummary[] | undefined;
  /** O resumo falhou: a seção diz, não some calada (RN-088). */
  erro: boolean;
  onAbrir: (projectId: string) => void;
}) {
  const { t } = useTranslation('dashboard');
  const nomes = new Map(projects.map((p) => [p.id, p.name]));
  const linhas = (cards ?? [])
    .filter((c) => c.lastEvent && nomes.has(c.projectId))
    .sort((a, b) => b.lastEvent!.createdAt.localeCompare(a.lastEvent!.createdAt))
    .slice(0, LIMITE);

  if (!erro && linhas.length === 0) return null;
  return (
    <section data-testid="atividade-recente">
      <h2 className={styles.titulo}>{t('atividadeRecente.titulo')}</h2>
      {erro && !cards ? (
        <p className={styles.indisponivel}>{t('atividadeRecente.indisponivel')}</p>
      ) : (
        <ul className={styles.lista}>
          {linhas.map(({ projectId, lastEvent }) => {
            const ev = lastEvent!;
            const agente = ev.actor.kind === 'agent' ? ev.actor.id : undefined;
            const nome = AGENTS[agente as keyof typeof AGENTS]?.name;
            return (
              <li key={projectId}>
                <button type="button" className={styles.linha} onClick={() => onAbrir(projectId)}>
                  <span className={styles.avatar} style={corDoAgente(agente)} aria-hidden="true">
                    {(nome ?? '·').charAt(0)}
                  </span>
                  <span className={styles.frase}>{classifyEvent(ev).text}</span>
                  <span className={styles.projeto}>{nomes.get(projectId)}</span>
                  <time className={styles.quando} dateTime={ev.createdAt}>
                    {formatRelativeTime(ev.createdAt)}
                  </time>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
