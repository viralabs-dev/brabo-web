import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, denyAction } from '../lib/api-client';
import type { DecisionInbox, ProposedAction } from '../lib/api-types';
import { fraseDaAcao } from '../lib/aprovacoes';
import { useProjects, usePsychologistStatus } from '../lib/hooks';
import { FILAS_DA_CAIXA, totalDaFila, type ChaveDaCaixa } from '../lib/caixa-de-decisoes';
import { gateEsperandoClique } from '../lib/precisa-de-voce';
import { formatRelativeTime } from '../lib/time';
import { AvatarDoAgente } from './ui/AvatarDoAgente';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import styles from './CaixaDeDecisoes.module.css';

type Modo = 'pending' | 'decided';
type ItemDeAcao = DecisionInbox['filas']['aprovacoes']['itens'][number];

/**
 * A Caixa de decisões (S07): os cinco cartões, um por fila, SEPARADOS (RN-467),
 * e uma seção por fila com os itens de todos os projetos. As filas de ação
 * são linhas compactas (Aprovar / Negar / Abrir) sobre os MESMOS endpoints; o
 * merge em branch protegida segue manual (RN-418): a linha só propõe a decisão.
 * Cada linha decide pelo `sessionId` da PRÓPRIA ação (RN-638). Plano de
 * execução exige custo e motivo: decide no card, a linha só abre.
 */
export function CaixaDeDecisoes({ workspaceId, inbox, modo }: { workspaceId: string; inbox: DecisionInbox; modo: Modo }) {
  const { t } = useTranslation('decisions');
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState<ChaveDaCaixa | null>(null);
  // A flag é global (RN-454) mas só há leitura por projeto: usa o primeiro (sem projeto não há hipótese possível).
  const { data: projetos } = useProjects(workspaceId);
  const psicologo = usePsychologistStatus(projetos?.[0]?.id);
  const psicologoPausado = psicologo.data?.enabled === false;

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
        {FILAS_DA_CAIXA.map((k) => {
          const comAlgo = inbox.filas[k].total > 0;
          return (
            <button
              key={k}
              type="button"
              className={styles.cartao}
              data-com-algo={comAlgo || undefined}
              aria-pressed={aberto === k}
              onClick={() => setAberto(aberto === k ? null : k)}
            >
              <span className={styles.cartaoRotulo}>{t(`filas.${k}`)}</span>
              <span className={styles.cartaoNumero}>{totalDaFila(inbox.filas[k])}</span>
              <span className={styles.cartaoLegenda}>{t(`legenda.${k}`)}</span>
            </button>
          );
        })}
      </div>

      {visiveis.map((k) => {
        const fila = inbox.filas[k];
        return (
          <section key={k} className={styles.secao} aria-label={t(`filas.${k}`)}>
            <h2 className={styles.secaoTitulo}>
              {t(`filas.${k}`)}
              <span className={styles.secaoTotal}>{t('projetos', { count: new Set(fila.itens.map((i) => i.projectId)).size })}</span>
            </h2>
            {fila.truncada && (
              <p className={styles.nota}>{t('truncada', { mostrados: fila.itens.length, total: fila.total })}</p>
            )}
            {fila.itens.length === 0 && (
              <EmptyState titulo={vazioComTitulo(k, modo, psicologoPausado) ? tituloDoVazio(k, t) : undefined}>
                {textoDoVazio(k, modo, psicologoPausado, t)}
              </EmptyState>
            )}
            {(k === 'aprovacoes' || k === 'prs') &&
              (inbox.filas[k].itens as ItemDeAcao[]).map((item) => {
                const acao = item.acao as unknown as ProposedAction; // o DTO gerado afrouxa `decidedBy`
                const gate = gateEsperandoClique(acao);
                const frase = fraseDaAcao(acao.actionType, acao.payload) ?? acao.actionType;
                const podeDecidir = modo === 'pending' && acao.actionType !== 'propose_execution_plan';
                const ator = acao.actor.id;
                return (
                  <div key={item.acao.id} className={styles.linhaDeAcao}>
                    <AvatarDoAgente id={ator} />
                    <span className={styles.linhaTexto}>
                      <span className={styles.frase}>
                        {frase} <span className={styles.chip}>{acao.actionType}</span>
                      </span>
                      <span className={styles.nota}>
                        <span className={styles.projeto}>{item.projectName}</span> · {ator} · {formatRelativeTime(acao.decidedAt ?? acao.createdAt)}
                      </span>
                      {modo === 'pending' && gate && (
                        <span className={styles.nota} role="status">
                          {t('gateParado', { gate: gate === 'qa' ? 'QA' : 'SecOps' })}
                        </span>
                      )}
                      {modo === 'pending' && !podeDecidir && <span className={styles.nota}>{t('decidirNoCard')}</span>}
                    </span>
                    <span className={styles.acoes}>
                      {podeDecidir && (
                        <>
                          <Button size="sm" variant="success" onClick={() => decidir(item, () => approveAction(item.projectId, item.acao.sessionId, item.acao.id))}>
                            {t('aprovar')}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => decidir(item, () => denyAction(item.projectId, item.acao.sessionId, item.acao.id))}>
                            {t('negar')}
                          </Button>
                        </>
                      )}
                      {modo === 'decided' && <span className={styles.nota}>{acao.status}</span>}
                      <Link to="/projects/$projectId" params={{ projectId: item.projectId }} search={{ tab: k === 'prs' ? 'prs' : 'approvals' }} className={styles.nota}>
                        {t('abrir')}
                      </Link>
                    </span>
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

type T = (k: string) => string;
const vazioComTitulo = (k: ChaveDaCaixa, modo: Modo, pausado: boolean) => (k === 'prs' && modo === 'pending') || (k === 'hipoteses' && pausado);
const tituloDoVazio = (k: ChaveDaCaixa, t: T) => (k === 'prs' ? t('vazio.prs') : t('psicologoPausado'));
function textoDoVazio(k: ChaveDaCaixa, modo: Modo, pausado: boolean, t: T) {
  if (k === 'arquitetura' && modo === 'decided') return t('vazioArquiteturaDecididas');
  if (k === 'prs' && modo === 'pending') return t('vazioPrs');
  if (k === 'hipoteses' && pausado) return t('psicologoPausadoDetalhe');
  return t(`vazio.${k}`);
}
