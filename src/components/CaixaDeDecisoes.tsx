import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, approveAlwaysAction, denyAction } from '../lib/api-client';
import type { DecisionInbox, ProposedAction } from '../lib/api-types';
import { FILAS_DA_CAIXA, totalDaFila, type ChaveDaCaixa } from '../lib/caixa-de-decisoes';
import { gateEsperandoClique } from '../lib/precisa-de-voce';
import { formatRelativeTime } from '../lib/time';
import { ApprovalCard } from './ApprovalCard';
import { EmptyState } from './ui/EmptyState';
import styles from './CaixaDeDecisoes.module.css';

type Modo = 'pending' | 'decided';
type ItemDeAcao = DecisionInbox['filas']['aprovacoes']['itens'][number];

/**
 * A Caixa de decisões (S07): os cinco cartões, um por fila, SEPARADOS (RN-467),
 * e uma seção por fila com os itens de todos os projetos. As filas de ação
 * renderizam o MESMO `ApprovalCard` e chamam os mesmos endpoints; o merge em
 * branch protegida segue manual (RN-418): o card só propõe a decisão. Cada
 * card decide pelo `sessionId` da PRÓPRIA ação (RN-638).
 */
export function CaixaDeDecisoes({ workspaceId, inbox, modo }: { workspaceId: string; inbox: DecisionInbox; modo: Modo }) {
  const { t } = useTranslation('decisions');
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState<ChaveDaCaixa | null>(null);

  async function decidir(item: ItemDeAcao, fazer: () => Promise<unknown>) {
    try {
      await fazer();
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['decision-inbox', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['project-pending-actions', item.projectId] });
    }
  }

  const visiveis = aberto ? [aberto] : FILAS_DA_CAIXA;

  return (
    <div className={styles.caixa}>
      <div className={styles.cartoes}>
        {FILAS_DA_CAIXA.map((k) => (
          <button
            key={k}
            type="button"
            className={styles.cartao}
            aria-pressed={aberto === k}
            onClick={() => setAberto(aberto === k ? null : k)}
          >
            <span className={styles.cartaoRotulo}>{t(`filas.${k}`)}</span>
            <span className={styles.cartaoNumero}>{totalDaFila(inbox.filas[k])}</span>
          </button>
        ))}
      </div>

      {visiveis.map((k) => {
        const fila = inbox.filas[k];
        return (
          <section key={k} className={styles.secao} aria-label={t(`filas.${k}`)}>
            <h2 className={styles.secaoTitulo}>
              {t(`filas.${k}`)} <span className={styles.secaoTotal}>{totalDaFila(fila)}</span>
            </h2>
            {fila.truncada && (
              <p className={styles.nota}>{t('truncada', { mostrados: fila.itens.length, total: fila.total })}</p>
            )}
            {fila.itens.length === 0 && (
              <EmptyState>
                {k === 'arquitetura' && modo === 'decided' ? t('vazioArquiteturaDecididas') : t(`vazio.${k}`)}
              </EmptyState>
            )}
            {(k === 'aprovacoes' || k === 'prs') &&
              (inbox.filas[k].itens as ItemDeAcao[]).map((item) => {
                const acao = item.acao as unknown as ProposedAction; // o DTO gerado afrouxa `decidedBy`
                const gate = gateEsperandoClique(acao);
                return (
                  <div key={item.acao.id} className={styles.linhaDeCard}>
                    <p className={styles.projeto}>{item.projectName}</p>
                    {modo === 'pending' && gate && (
                      <p className={styles.nota} role="status">
                        {t('gateParado', { gate: gate === 'qa' ? 'QA' : 'SecOps' })}
                      </p>
                    )}
                    <ApprovalCard
                      action={acao}
                      detalheRecolhido
                      onApprove={() => decidir(item, () => approveAction(item.projectId, item.acao.sessionId, item.acao.id))}
                      onDeny={(motivo) =>
                        decidir(item, () => denyAction(item.projectId, item.acao.sessionId, item.acao.id, motivo))
                      }
                      onAlwaysAllow={() =>
                        decidir(item, () => approveAlwaysAction(item.projectId, item.acao.sessionId, item.acao.id))
                      }
                    />
                  </div>
                );
              })}
            {k === 'promocoes' &&
              inbox.filas.promocoes.itens.map((i) => (
                <Linha key={i.storyId} projeto={i.projectName} projectId={i.projectId} titulo={i.titulo} tempo={formatRelativeTime(i.decididaEm ?? i.desde)} tab="backlog" />
              ))}
            {k === 'arquitetura' &&
              inbox.filas.arquitetura.itens.map((i) => (
                <Linha
                  key={i.storyId}
                  projeto={i.projectName}
                  projectId={i.projectId}
                  titulo={i.titulo}
                  detalhe={t(`motivo.${i.motivo}`, { modulos: i.faltando.join(', ') })}
                  tempo={t('dataEmprestada', { tempo: formatRelativeTime(i.desde) })}
                  tab="arquitetura"
                />
              ))}
            {k === 'hipoteses' &&
              inbox.filas.hipoteses.itens.map((i) => (
                <Linha
                  key={i.hipoteseId}
                  projeto={i.projectName}
                  projectId={i.projectId}
                  titulo={i.hipotese}
                  detalhe={modo === 'decided' ? i.situacao : undefined}
                  tempo={formatRelativeTime(i.decididaEm ?? i.desde)}
                  tab="insights"
                />
              ))}
          </section>
        );
      })}
    </div>
  );
}

function Linha({ projeto, projectId, titulo, detalhe, tempo, tab }: { projeto: string; projectId: string; titulo: string; detalhe?: string; tempo: string; tab: 'backlog' | 'arquitetura' | 'insights' }) {
  const { t } = useTranslation('decisions');
  return (
    <div className={styles.linha}>
      <span className={styles.linhaTexto}>
        <span className={styles.projeto}>{projeto}</span>
        <span>{titulo}</span>
        {detalhe && <span className={styles.nota}>{detalhe}</span>}
      </span>
      <span className={styles.nota}>{tempo}</span>
      <Link to="/projects/$projectId" params={{ projectId }} search={{ tab }} className={styles.nota}>
        {t('abrir')}
      </Link>
    </div>
  );
}
