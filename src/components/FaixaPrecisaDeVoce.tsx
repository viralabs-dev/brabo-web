import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, approveAlwaysAction, denyAction } from '../lib/api-client';
import { useContagensDoProjeto } from '../lib/contagens-do-projeto';
import { FILAS_ACIONAVEIS, gateEsperandoClique, montarFilas } from '../lib/precisa-de-voce';
import { ApprovalCard } from './ApprovalCard';
import { Badge } from './ui/Badge';
import styles from './FaixaPrecisaDeVoce.module.css';

/**
 * AT-890: a Visão geral abre com o que precisa de você. O item mais urgente
 * (primeira fila com itens, `montarFilas`) leva o MESMO `ApprovalCard` e os
 * mesmos endpoints do painel; as cinco filas seguem SEPARADAS (RN-467) e lidas
 * pela fila do PROJETO (RN-638, `useContagensDoProjeto`). Sem requisição nova.
 */
export function FaixaPrecisaDeVoce({ projectId }: { projectId: string }) {
  const { t } = useTranslation('overview');
  const { t: tp } = useTranslation('projectPage');
  const queryClient = useQueryClient();
  const f = useContagensDoProjeto(projectId);
  const filas = montarFilas({
    acoesPendentes: f.pendentesDoProjeto,
    merges: f.merges,
    epicos: f.epicos,
    pendenciasDeArquitetura: f.pendenciasDeArquitetura,
    hipoteses: f.hipoteses,
  });
  const primeira = filas.find((x) => x.itens.length > 0);
  const item = primeira?.itens[0];
  const acao = item?.acao;
  const gate = acao ? gateEsperandoClique(acao) : null;

  async function decidir(fazer: () => Promise<unknown>) {
    try {
      await fazer();
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['project-pending-actions', projectId] });
      if (acao) void queryClient.invalidateQueries({ queryKey: ['session-actions', projectId, acao.sessionId] });
    }
  }

  return (
    <section className={styles.faixa} aria-label={t('faixa.titulo')} data-testid="faixa-precisa-de-voce">
      <div className={styles.topo}>
        <h2 className={styles.titulo}>{t('faixa.titulo')}</h2>
        <Link to="/decisions" className={styles.verTodas}>{t('faixa.verTodas')}</Link>
      </div>
      <div className={styles.chips}>
        {filas.map((fila) => (
          <Badge key={fila.chave} tone={fila.itens.length > 0 ? 'warning' : 'muted'}>
            {tp(`precisaDeVoce.filas.${fila.chave}`)} {fila.itens.length}
          </Badge>
        ))}
      </div>
      {!item && <p className={styles.vazio}>{t('faixa.vazio')}</p>}
      {item && primeira && FILAS_ACIONAVEIS.has(primeira.chave) && acao && (
        <div className={styles.item}>
          {gate && (
            <p role="status" className={styles.nota}>
              {tp('precisaDeVoce.gateParado', { gate: gate === 'qa' ? 'QA' : 'SecOps' })}
            </p>
          )}
          <ApprovalCard
            action={acao}
            detalheRecolhido
            onApprove={() => decidir(() => approveAction(projectId, acao.sessionId, acao.id))}
            onDeny={(motivo) => decidir(() => denyAction(projectId, acao.sessionId, acao.id, motivo))}
            onAlwaysAllow={() => decidir(() => approveAlwaysAction(projectId, acao.sessionId, acao.id))}
          />
        </div>
      )}
      {item && primeira && !FILAS_ACIONAVEIS.has(primeira.chave) && item.aba && (
        <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: item.aba }} className={styles.item}>
          {item.titulo}
        </Link>
      )}
    </section>
  );
}
