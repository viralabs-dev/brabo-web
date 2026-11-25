import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { approveAction, denyAction, listSessions } from '../lib/api-client';
import type { DecisionInbox, ProposedAction } from '../lib/api-types';
import { fraseDaAcao } from '../lib/aprovacoes';
import { useProjects, usePsychologistStatus } from '../lib/hooks';
import { FILAS_DA_CAIXA, totalDaFila, cortar, diasDesde, tituloDoTerminal, tituloDoPlano, detalheDoPlano, DIAS_DE_APROVACAO_VELHA, type ChaveDaCaixa } from '../lib/caixa-de-decisoes';
import { gateEsperandoClique } from '../lib/precisa-de-voce';
import { formatRelativeTime } from '../lib/time';
import { AvatarDoAgente } from './ui/AvatarDoAgente';
import { Button } from './ui/Button';
import { buttonVariants } from './shadcn/button-variants';
import { ChevronRightIcon } from './ui/icons';
import { AGENTS } from '../lib/agents';
import { Modal } from './ui/Modal';
import { Textarea } from './ui/Textarea';
import { Checkbox } from './shadcn/checkbox';
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

  // As aprovações, as mais antigas primeiro (AT-968, RN-1464).
  const aprovacoes = [...inbox.filas.aprovacoes.itens].sort((a, b) => a.acao.createdAt.localeCompare(b.acao.createdAt));
  const projetosDasAprovacoes = [...new Set(aprovacoes.map((i) => i.projectId))];
  // Sessão encerrada vem da API; sem a leitura, a tela não afirma nada (EP-020).
  const sessoes = useQueries({
    queries: projetosDasAprovacoes.map((id) => ({ queryKey: ['sessions', id], queryFn: () => listSessions(id), enabled: modo === 'pending' })),
  });
  const encerramento = (item: ItemDeAcao): number | null => {
    const lista = sessoes[projetosDasAprovacoes.indexOf(item.projectId)]?.data;
    const sessao = lista?.find((s) => s.id === item.acao.sessionId);
    return sessao && (sessao.status === 'closed' || sessao.status === 'closed_abnormally') ? diasDesde(sessao.closedAt ?? sessao.updatedAt) : null;
  };
  const aviso = (dias: number) => (dias === 0 ? t('sessaoEncerradaHoje') : t('sessaoEncerrada', { dias }));
  const decidivel = (item: ItemDeAcao) => modo === 'pending' && item.acao.actionType !== 'propose_execution_plan';
  const velha = (item: ItemDeAcao) => diasDesde(item.acao.createdAt) > DIAS_DE_APROVACAO_VELHA;
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [lote, setLote] = useState(false);
  const marcaveis = aprovacoes.filter(decidivel);
  const antigas = marcaveis.filter(velha);
  const esperamHa = modo === 'pending' ? aprovacoes.filter(velha).length : 0;
  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const selecionadas = marcaveis.filter((i) => marcadas.has(i.acao.id));

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
              <span className={styles.cartaoLegenda}>
                {k === 'aprovacoes' && esperamHa > 0
                  ? inbox.filas.aprovacoes.truncada ? t('esperamHaMais', { count: esperamHa }) : t('esperamHa', { count: esperamHa })
                  : t(`legenda.${k}`)}
              </span>
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
              <span className={styles.secaoTotal}>
                {k === 'aprovacoes' && <><span>{t('maisAntigasPrimeiro')}</span> · </>}
                <span>{t('projetos', { count: new Set(fila.itens.map((i) => i.projectId)).size })}</span>
              </span>
            </h2>
            {k === 'aprovacoes' && modo === 'pending' && marcaveis.length > 0 && (
              <div className={styles.lote}>
                {selecionadas.length > 0 && (
                  <>
                    <span className={styles.nota} role="status">{t('selecionadas', { count: selecionadas.length })}</span>
                    <Button size="sm" variant="danger" onClick={() => setLote(true)}>{t('negarSelecionadas')}</Button>
                  </>
                )}
                {antigas.length > 0 && (
                  <Button size="sm" variant="secondary" onClick={() => setMarcadas(new Set(antigas.map((i) => i.acao.id)))}>
                    {t('selecionarAntigas')}
                  </Button>
                )}
              </div>
            )}
            {fila.truncada && (
              <p className={styles.nota}>{t('truncada', { mostrados: fila.itens.length, total: fila.total })}</p>
            )}
            {fila.itens.length === 0 && (
              <EmptyState titulo={vazioComTitulo(k, modo, psicologoPausado) ? tituloDoVazio(k, t) : undefined}>
                {textoDoVazio(k, modo, psicologoPausado, t)}
              </EmptyState>
            )}
            {k === 'aprovacoes' &&
              projetosDasAprovacoes.map((pid) => {
                const itens = aprovacoes.filter((i) => i.projectId === pid);
                const dias = itens.map(encerramento);
                // O aviso sobe ao cabeçalho só quando TODAS as sessões do grupo estão encerradas; senão cada linha diz a sua.
                const todasEncerradas = modo === 'pending' && dias.every((d) => d !== null);
                const recente = todasEncerradas ? Math.min(...(dias as number[])) : null;
                return (
                  <div key={pid} className={styles.grupo} role="group" aria-label={itens[0].projectName}>
                    <div className={styles.grupoCabecalho}>
                      <span>{t('grupo', { projeto: itens[0].projectName, count: itens.length })}</span>
                      {recente !== null && <span>{aviso(recente)}</span>}
                    </div>
                    {itens.map((item) => (
                      <LinhaDeAprovacao
                        key={item.acao.id}
                        item={item}
                        modo={modo}
                        encerrada={encerramento(item) !== null}
                        aviso={encerramento(item) !== null && !todasEncerradas ? aviso(encerramento(item)!) : undefined}
                        marcada={marcadas.has(item.acao.id)}
                        onMarcar={decidivel(item) ? () => alternar(item.acao.id) : undefined}
                        onDecidir={decidir}
                        agrupada
                      />
                    ))}
                  </div>
                );
              })}
            {k === 'prs' &&
              (inbox.filas.prs.itens as ItemDeAcao[]).map((item) => (
                <LinhaDeAprovacao key={item.acao.id} item={item} modo={modo} encerrada={false} marcada={false} onDecidir={decidir} />
              ))}
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
      {lote && (
        <NegarEmLote
          itens={selecionadas}
          onClose={() => setLote(false)}
          onFeito={(ids) => {
            setMarcadas((m) => { const n = new Set(m); ids.forEach((id) => n.delete(id)); return n; });
            void queryClient.invalidateQueries({ queryKey: ['decision-inbox', workspaceId] });
            selecionadas.forEach((i) => void queryClient.invalidateQueries({ queryKey: ['project-pending-actions', i.projectId] }));
          }}
        />
      )}
    </div>
  );
}

function LinhaDeAprovacao({ item, modo, encerrada, aviso, marcada, onMarcar, onDecidir, agrupada }: {
  item: ItemDeAcao; modo: Modo; encerrada: boolean; aviso?: string; marcada: boolean; onMarcar?: () => void;
  onDecidir: (item: ItemDeAcao, fazer: () => Promise<unknown>) => Promise<void>; agrupada?: boolean;
}) {
  const { t } = useTranslation('decisions');
  const [aberta, setAberta] = useState(false);
  const acao = item.acao as unknown as ProposedAction; // o DTO gerado afrouxa `decidedBy`
  const gate = gateEsperandoClique(acao);
  const frase = fraseDaAcao(acao.actionType, acao.payload) ?? acao.actionType;
  const plano = acao.actionType === 'propose_execution_plan';
  const lead = AGENTS[acao.actor.id as keyof typeof AGENTS]?.name ?? 'Dev Lead';
  const tituloDoPlanoPronto = tituloDoPlano(acao.actionType, acao.payload, lead);
  const titulo = tituloDoTerminal(acao.actionType, acao.payload, t('terminal')) ?? tituloDoPlanoPronto ?? cortar(frase);
  const comando =
    acao.actionType === 'terminal' && typeof acao.payload.command === 'string'
      ? acao.payload.command
      : tituloDoPlanoPronto
        ? detalheDoPlano(frase)
        : frase;
  const destino = { to: '/projects/$projectId', params: { projectId: item.projectId }, search: { tab: acao.actionType === 'git_merge' ? 'prs' : 'approvals' } } as const;
  const podeDecidir = modo === 'pending' && acao.actionType !== 'propose_execution_plan';
  const ator = acao.actor.id;
  const quando = acao.decidedAt ?? acao.createdAt;
  return (
    <div className={styles.linhaDeAcao} data-agrupada={agrupada || undefined}>
      {onMarcar && <Checkbox checked={marcada} onCheckedChange={onMarcar} aria-label={t('selecionar', { titulo })} />}
      <AvatarDoAgente id={ator} />
      <span className={styles.linhaTexto}>
        <span className={styles.frase}>
          {titulo} <span className={styles.chip}>{acao.actionType}</span>
        </span>
        {comando !== titulo && (
          <button type="button" className={styles.comando} data-aberto={aberta || undefined} aria-expanded={aberta} title={t(aberta ? 'recolherComando' : 'verComando')} onClick={() => setAberta(!aberta)}>
            {comando}
          </button>
        )}
        <span className={styles.nota}>
          {!agrupada && <><span className={styles.projeto}>{item.projectName}</span> · </>}{ator}
        </span>
        {modo === 'pending' && gate && (
          <span className={styles.nota} role="status">
            {t('gateParado', { gate: gate === 'qa' ? 'QA' : 'SecOps' })}
          </span>
        )}
        {aviso && <span className={styles.nota}>{aviso}</span>}
        {modo === 'pending' && !podeDecidir && <span className={styles.nota}>{t('decidirNoCard')}</span>}
      </span>
      <span className={styles.acoes}>
        <span className={styles.idade} data-velha={(diasDesde(acao.createdAt) > DIAS_DE_APROVACAO_VELHA) || undefined}>{formatRelativeTime(quando)}</span>
        {podeDecidir && (
          <>
            {!encerrada && (
              <Button size="sm" variant="success" onClick={() => onDecidir(item, () => approveAction(item.projectId, item.acao.sessionId, item.acao.id))}>
                {t('aprovar')}
              </Button>
            )}
            <Button size="sm" variant="danger" onClick={() => onDecidir(item, () => denyAction(item.projectId, item.acao.sessionId, item.acao.id))}>
              {t('negar')}
            </Button>
          </>
        )}
        {modo === 'decided' && <span className={styles.nota}>{acao.status}</span>}
        {plano && modo === 'pending' && (
          <Link {...destino} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>{t('abrirPlano')}</Link>
        )}
        <Link {...destino} aria-label={t('abrirTitulo', { titulo })} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
          <ChevronRightIcon size={14} />
        </Link>
      </span>
    </div>
  );
}

/** Negar em lote: um motivo único, e a negação existente chamada uma vez por item (AT-968, RN-1465). */
function NegarEmLote({ itens, onClose, onFeito }: { itens: ItemDeAcao[]; onClose: () => void; onFeito: (ids: string[]) => void }) {
  const { t } = useTranslation('decisions');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const titulos = itens.map((i) => {
    const a = i.acao as unknown as ProposedAction;
    return tituloDoTerminal(a.actionType, a.payload, t('terminal')) ?? cortar(fraseDaAcao(a.actionType, a.payload) ?? a.actionType);
  });
  async function confirmar() {
    if (!motivo.trim()) return setErro(t('lote.motivoVazio'));
    setEnviando(true);
    setErro(null);
    const r = await Promise.allSettled(itens.map((i) => denyAction(i.projectId, i.acao.sessionId, i.acao.id, motivo.trim())));
    onFeito(itens.filter((_, n) => r[n].status === 'fulfilled').map((i) => i.acao.id));
    const falhas = r.filter((x) => x.status === 'rejected').length;
    setEnviando(false);
    if (falhas === 0) onClose();
    else setErro(t('lote.falhou', { count: falhas }));
  }
  return (
    <Modal title={t('lote.titulo', { count: itens.length })} onClose={onClose}>
      <ul className={styles.listaDoLote}>
        {titulos.map((x, n) => <li key={itens[n].acao.id}>{x}</li>)}
      </ul>
      <Textarea label={t('lote.motivo')} value={motivo} onChange={(e) => setMotivo(e.target.value)} error={erro} />
      <div className={styles.acoes}>
        <Button size="sm" variant="ghost" onClick={onClose}>{t('lote.cancelar')}</Button>
        <Button size="sm" variant="danger" disabled={enviando} onClick={confirmar}>{t('lote.confirmar', { count: itens.length })}</Button>
      </div>
    </Modal>
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
      <Link to="/projects/$projectId" params={{ projectId }} search={{ tab }} aria-label={t('abrirTitulo', { titulo })} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
        <ChevronRightIcon size={14} />
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
