import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/shadcn/card';
import type { Architecture } from '../lib/api-types';
import { useBacklog } from '../lib/hooks';
import { DESTINO_DO_PASSO } from '../lib/primeiros-passos';
import { DESTINO, derivarProximoPasso, fatosDoBacklog } from '../lib/proximo-passo';
import { usePrimeirosPassos } from './PrimeirosPassos.helpers';
import styles from './ProximoPasso.module.css';

/**
 * O próximo passo do projeto na Visão geral (RN-1162, AT-936): um cartão, uma
 * frase, UM link. A regra mora em `lib/proximo-passo.ts`; aqui só se lê o que
 * a aba já lê (backlog, arquitetura, roster, execução vigente, sessões) — as
 * mesmas chaves de cache, nenhuma leitura nova. Insumo ainda não lido é "não
 * sei" (RN-470): o cartão espera, e sem situação verdadeira ele some.
 */
export function ProximoPasso({
  projectId,
  temSessao,
  agenteTrabalhando,
  execucaoAtiva,
  architecture,
}: {
  projectId: string;
  /** `undefined` enquanto a lista de sessões não chegou. */
  temSessao: boolean | undefined;
  /** Nome do agente conversacional trabalhando agora, se houver. */
  agenteTrabalhando: string | null;
  /** `undefined` enquanto a execução vigente não foi lida. */
  execucaoAtiva: boolean | undefined;
  architecture: Architecture | undefined;
}) {
  const { t } = useTranslation('overview');
  const { data: epics } = useBacklog(projectId);
  const primeirosPassos = usePrimeirosPassos(projectId, temSessao);
  if (!epics || temSessao === undefined || execucaoAtiva === undefined) return null;

  const fatosDosItens = fatosDoBacklog(epics, architecture);
  const primeiroPasso = primeirosPassos?.find((p) => !p.feito)?.chave ?? null;
  const tipo = derivarProximoPasso({ ...fatosDosItens, primeiroPasso, agenteTrabalhando, temSessao, execucaoAtiva });
  if (!tipo) return null;

  const count = {
    ligar_modulo: fatosDosItens.semModulo,
    desbloquear: fatosDosItens.bloqueadas,
    ativar_execucao: fatosDosItens.prontas,
    acompanhar_execucao: fatosDosItens.emAndamento,
  }[tipo as string];

  // O passo 1 reusa os textos e o destino da RN-708, sem duplicar a regra.
  const chave = tipo === 'primeiro_passo' ? primeiroPasso : null;
  const alvo = chave ? DESTINO_DO_PASSO[chave] : tipo === 'primeiro_passo' ? null : DESTINO[tipo];
  if (!alvo) return null;
  const titulo = chave
    ? t(`primeirosPassos.${chave}.titulo`)
    : tipo === 'agente_trabalhando'
      ? t('proximoPasso.agente', { agente: agenteTrabalhando })
      : t(`proximoPasso.${tipo}.titulo`, { count });
  const texto = chave ? t(`primeirosPassos.${chave}.pendente`) : t(`proximoPasso.${tipo}.texto`, { count });
  const rotulo = chave ? t(`primeirosPassos.${chave}.link`) : t(`proximoPasso.${tipo}.link`);

  return (
    <Card role="region" className={styles.cartao} data-testid="proximo-passo" data-passo={tipo} aria-label={t('proximoPasso.titulo')}>
      <span className={styles.rotulo}>{t('proximoPasso.titulo')}</span>
      <h2 className={styles.titulo}>{titulo}</h2>
      <p className={styles.texto}>{texto}</p>
      {alvo === 'providers' ? (
        <Link to="/providers" className={styles.link}>
          {rotulo}
        </Link>
      ) : (
        <Link to="/projects/$projectId" params={{ projectId }} search={alvo} className={styles.link}>
          {rotulo}
        </Link>
      )}
    </Card>
  );
}
