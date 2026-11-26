import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Reply, ThumbsUp, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { acceptOpenQuestionSuggestions, answerOpenQuestion, mensagemDaApi } from '../lib/api-client';
import type { OpenQuestion, Story, Task } from '../lib/api-types';
import { motivoDeCorrecaoInerte } from '../lib/correcao-de-historia';
import { nomeDoAgente } from '../lib/agents';
import { userIdDaSessao } from '../lib/auth';
import { semIdentificadorInterno } from '../lib/sem-identificador';
import {
  ID_DA_FILA_DE_PERGUNTAS,
  rolarAteAsPerguntas,
  usePerguntasEmAberto,
} from '../lib/perguntas-em-aberto';
import { formatRelativeTime } from '../lib/time';
import { Button } from './ui/Button';
import { Disclosure } from './ui/Disclosure';
import { PaginadorDaFila } from './PaginadorDaFila';
import { paginar } from '../lib/paginacao-de-fila';
import styles from './PendenciasDeOutrasSessoes.module.css';

const TETO_DA_RESPOSTA = 2000;

interface PerguntasEmAbertoProps {
  projectId: string;
  perguntas: readonly OpenQuestion[];
  /** Total da api (a lista vem com teto de 50, RN-180). */
  total: number;
  /** As tarefas do backlog, para nomear a tarefa que espera a resposta. */
  tarefas?: readonly Task[];
  /**
   * RN-884 (AT-538): as perguntas que ESTA tela respondeu, guardadas por quem
   * monta a fila (a releitura as tira da lista da api), e as histórias do
   * backlog, para saber se a afetada ainda é corrigível.
   */
  respondidas?: readonly OpenQuestion[];
  aoResponder?: (pergunta: OpenQuestion) => void;
  aoDispensar?: (questionId: string) => void;
  historias?: readonly Story[];
  /** `developer` no endpoint de correção (RN-727, RN-102). */
  podeCorrigir?: boolean;
  /**
   * AT-950 (RN-861): no Sheet de pendências, UMA pergunta por vez; "Aceitar sugestão" é o botão
   * principal e o campo de texto só abre em "Responder com texto".
   */
  compacto?: boolean;
}

/**
 * RN-861 (AT-521): a fila "Perguntas em aberto" — título e contagem PRÓPRIOS
 * (RN-467). Só o AUTOR da sessão de origem responde (RN-858); os outros veem o
 * cartão com o controle inerte e o motivo em TEXTO (ADR 0064). A tarefa que
 * o gate de QA estacionou por esta pergunta aparece aqui como "esperando sua
 * resposta" (RN-860).
 */
export function PerguntasEmAberto({
  projectId,
  perguntas,
  total,
  tarefas,
  respondidas = [],
  aoResponder,
  aoDispensar,
  historias,
  podeCorrigir = false,
  compacto = false,
}: PerguntasEmAbertoProps) {
  const { t } = useTranslation('sessionPage');
  // AT-680 (RN-975): 3 por página; as respondidas ficam fora da paginação.
  const [paginaPedida, setPaginaPedida] = useState(0);
  const pagina = paginar(perguntas, paginaPedida, compacto ? 1 : undefined);
  const abertas = new Set(perguntas.map((p) => p.questionId));
  const queryClient = useQueryClient();
  const [lote, setLote] = useState<{ autor: string; enviando: boolean; erro: string | null } | null>(
    null,
  );
  // AT-997: ≥ 2 perguntas abertas do mesmo agente, com sugestão, da própria pessoa.
  const doLote = lote ? sugestoesDoAgente(perguntas, lote.autor) : [];
  const agentesEmLote = [
    ...new Set(
      perguntas.filter((p) => sugestoesDoAgente(perguntas, p.autor).length >= 2).map((p) => p.autor),
    ),
  ];
  async function aceitarLote() {
    if (!lote) return;
    setLote({ ...lote, enviando: true, erro: null });
    try {
      const r = await acceptOpenQuestionSuggestions(
        projectId,
        doLote.map((p) => p.questionId),
      );
      for (const p of doLote) {
        if (r.resultados.find((x) => x.questionId === p.questionId)?.status === 'answered') {
          aoResponder?.(p);
        }
      }
      const puladas = r.resultados.filter((x) => x.status !== 'answered').length;
      setLote(puladas > 0 ? { ...lote, enviando: false, erro: t('pendencias.perguntas.loteParcial', { n: puladas }) } : null);
    } catch (e) {
      setLote({ ...lote, enviando: false, erro: mensagemDaApi(e, t('pendencias.perguntas.loteErro')) });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ['open-questions', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
    }
  }
  const jaRespondidas = respondidas.filter((p) => !abertas.has(p.questionId));
  if (perguntas.length === 0 && jaRespondidas.length === 0) return null;
  return (
    <section
      id={ID_DA_FILA_DE_PERGUNTAS}
      className={styles.fila}
      aria-label={t('pendencias.filas.perguntas')}
      data-testid="fila-perguntas-em-aberto"
    >
      <h4 className={styles.filaTitulo}>
        {t('pendencias.filas.perguntas')}
        <span className={styles.contagem}>{total}</span>
      </h4>
      {agentesEmLote.map((autor) => (
        <div key={autor} className={styles.acoesDaLinha}>
          <Button
            variant="secondary"
            disabled={lote?.enviando}
            onClick={() => setLote({ autor, enviando: false, erro: null })}
            data-testid="aceitar-lote"
          >
            <ThumbsUp aria-hidden="true" />
            {t('pendencias.perguntas.loteAceitar', {
              n: sugestoesDoAgente(perguntas, autor).length,
              agente: nomeDoAgente(autor),
            })}
          </Button>
        </div>
      ))}
      {lote && doLote.length > 0 && (
        <div className={styles.grupo} data-testid="confirmacao-do-lote">
          <p>
            {t('pendencias.perguntas.loteTitulo', {
              n: doLote.length,
              agente: nomeDoAgente(lote.autor),
            })}
          </p>
          <ul>
            {doLote.map((p) => (
              <li key={p.questionId}>
                {p.pergunta} — {p.sugestao}
                {p.afeta.regras.length > 0 && (
                  <strong data-testid="lote-toca-regra"> ({t('pendencias.perguntas.loteRegra')})</strong>
                )}
              </li>
            ))}
          </ul>
          <div className={styles.acoesDaLinha}>
            <Button variant="primary" loading={lote.enviando} onClick={() => void aceitarLote()}>
              {t('pendencias.perguntas.loteConfirmar', { n: doLote.length })}
            </Button>
            <Button variant="ghost" disabled={lote.enviando} onClick={() => setLote(null)}>
              {t('pendencias.perguntas.loteCancelar')}
            </Button>
          </div>
          {lote.erro && (
            <p className={styles.erro} role="alert">
              {lote.erro}
            </p>
          )}
        </div>
      )}
      {pagina.itens.map((p) => (
        <CartaoDaPergunta
          key={p.questionId}
          projectId={projectId}
          pergunta={p}
          tarefas={tarefas}
          aoResponder={aoResponder}
          compacto={compacto}
        />
      ))}
      {jaRespondidas.map((p) => (
        <CartaoRespondido
          key={p.questionId}
          projectId={projectId}
          pergunta={p}
          historias={historias}
          podeCorrigir={podeCorrigir}
          aoDispensar={aoDispensar}
        />
      ))}
      <PaginadorDaFila
        fila={t('pendencias.filas.perguntas')}
        pagina={pagina}
        aoMudar={setPaginaPedida}
      />
      {total > perguntas.length && (
        <p className={styles.recorte}>
          {t('pendencias.perguntas.recorte', { mostradas: perguntas.length, total })}
        </p>
      )}
    </section>
  );
}

function sugestoesDoAgente(perguntas: readonly OpenQuestion[], autor: string) {
  const eu = userIdDaSessao();
  return perguntas.filter(
    (p) => p.autor === autor && !!p.sugestao && eu !== null && p.autorDaSessao === eu,
  );
}

function CartaoDaPergunta({
  projectId,
  pergunta,
  tarefas,
  aoResponder,
  compacto,
}: {
  projectId: string;
  pergunta: OpenQuestion;
  tarefas?: readonly Task[];
  aoResponder?: (pergunta: OpenQuestion) => void;
  compacto?: boolean;
}) {
  const { t } = useTranslation('sessionPage');
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState<'resposta' | 'sugestao' | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Compacto: com sugestão, o campo só aparece quando pedido; sem ela, é o único caminho.
  const [escrevendo, setEscrevendo] = useState(false);
  // AT-1021 (RN-1531): com opções prontas, o campo livre fica recolhido (e disponível) no
  // "Responder com texto"; sem elas (dado antigo), vale o comportamento de antes.
  const opcoes = pergunta.opcoes ?? [];
  const campoVisivel = opcoes.length > 0 ? false : !compacto || !pergunta.sugestao || escrevendo;
  const eAutor = pergunta.autorDaSessao !== null && pergunta.autorDaSessao === userIdDaSessao();

  const afeta = [
    pergunta.afeta.regras.length > 0 &&
      t('pendencias.perguntas.afetaRegras', { count: pergunta.afeta.regras.length }),
    pergunta.afeta.historias.length > 0 &&
      t('pendencias.perguntas.afetaHistorias', { count: pergunta.afeta.historias.length }),
    pergunta.afeta.tarefas.length > 0 &&
      t('pendencias.perguntas.afetaTarefas', { count: pergunta.afeta.tarefas.length }),
  ].filter(Boolean);
  const esperando = pergunta.afeta.tarefas
    .map((id) => tarefas?.find((task) => task.id === id))
    .filter((task): task is Task => !!task);

  // RN-1536: Enter envia a resposta curta, com as mesmas travas do clique; IME em composição não conta.
  function enviarComEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing || !eAutor || enviando !== null) return;
    if (texto.trim() === '') return;
    e.preventDefault();
    void responder({ resposta: texto.trim() });
  }

  async function responder(corpo: { resposta: string } | { aceitarSugestao: true }) {
    setEnviando('resposta' in corpo ? 'resposta' : 'sugestao');
    setErro(null);
    try {
      await answerOpenQuestion(projectId, pergunta.questionId, corpo);
      aoResponder?.(pergunta);
      // Sucesso: a releitura tira a pergunta da fila.
      void queryClient.invalidateQueries({ queryKey: ['open-questions', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['backlog', projectId] });
    } catch (e) {
      setErro(mensagemDaApi(e, t('pendencias.perguntas.erro')));
      // 409 (já respondida): a fila se refaz e diz a verdade.
      void queryClient.invalidateQueries({ queryKey: ['open-questions', projectId] });
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className={styles.grupo} data-testid="pergunta-em-aberto">
      <div className={styles.origem}>
        {t('pendencias.perguntas.origem', {
          agente: nomeDoAgente(pergunta.autor),
          tempo: formatRelativeTime(pergunta.criadaEm),
        })}
      </div>
      <p>{semIdentificadorInterno(pergunta.pergunta)}</p>
      {afeta.length > 0 && (
        <p className={styles.nota}>
          {t('pendencias.perguntas.afeta')} {afeta.join(' · ')}
        </p>
      )}
      {esperando.map((task) => (
        <p key={task.id} className={styles.nota} data-testid="tarefa-esperando-resposta">
          {t('pendencias.perguntas.esperando', { tarefa: task.title })}
        </p>
      ))}
      {pergunta.sugestao && (
        <p className={styles.nota}>
          {t('pendencias.perguntas.sugestao')} {pergunta.sugestao}
        </p>
      )}
      <div className={styles.acoesDaLinha}>
        {opcoes.map((o, i) => (
          <Button
            key={o.rotulo}
            variant={i === 0 ? 'primary' : 'secondary'}
            disabled={!eAutor || enviando !== null}
            onClick={() => void responder({ resposta: o.resposta })}
            data-testid="opcao-da-pergunta"
          >
            {o.rotulo}
          </Button>
        ))}
        {pergunta.sugestao && (
          <Button
            variant="secondary"
            disabled={!eAutor || enviando !== null}
            loading={enviando === 'sugestao'}
            onClick={() => void responder({ aceitarSugestao: true })}
            legenda={compacto ? undefined : t('pendencias.perguntas.aceitar')}
          >
            <ThumbsUp aria-hidden="true" />
            {compacto && t('pendencias.perguntas.aceitar')}
          </Button>
        )}
        {opcoes.length === 0 && compacto && pergunta.sugestao && !escrevendo && (
          <Button variant="ghost" onClick={() => setEscrevendo(true)}>
            {t('pendencias.perguntas.responderComTexto')}
          </Button>
        )}
        {campoVisivel && (<>
        <input
          type="text"
          className={styles.campo}
          value={texto}
          maxLength={TETO_DA_RESPOSTA}
          disabled={!eAutor || enviando !== null}
          aria-label={t('pendencias.perguntas.campo')}
          placeholder={t('pendencias.perguntas.campo')}
          autoComplete="off"
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={enviarComEnter}
        />
        <Button
          variant="primary"
          disabled={!eAutor || enviando !== null || texto.trim() === ''}
          loading={enviando === 'resposta'}
          onClick={() => void responder({ resposta: texto.trim() })}
          legenda={t('pendencias.perguntas.responder')}
        >
          <Reply aria-hidden="true" />
        </Button>
        </>)}
      </div>
      {pergunta.detalhe && (
        <Disclosure titulo={t('pendencias.perguntas.detalheTecnico')}>
          <p className={styles.nota} data-testid="detalhe-tecnico">
            {pergunta.detalhe}
          </p>
        </Disclosure>
      )}
      {opcoes.length > 0 && (
        <Disclosure titulo={t('pendencias.perguntas.responderComTexto')}>
          <div className={styles.acoesDaLinha}>
            <input
              type="text"
              className={styles.campo}
              value={texto}
              maxLength={TETO_DA_RESPOSTA}
              disabled={!eAutor || enviando !== null}
              aria-label={t('pendencias.perguntas.campo')}
              placeholder={t('pendencias.perguntas.campo')}
              autoComplete="off"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={enviarComEnter}
            />
            <Button
              variant="primary"
              disabled={!eAutor || enviando !== null || texto.trim() === ''}
              loading={enviando === 'resposta'}
              onClick={() => void responder({ resposta: texto.trim() })}
              legenda={t('pendencias.perguntas.responder')}
            >
              <Reply aria-hidden="true" />
            </Button>
          </div>
        </Disclosure>
      )}
      {!eAutor && <p className={styles.nota}>{t('pendencias.perguntas.soOAutor')}</p>}
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

/**
 * RN-884 (AT-538, decisão do dono de 14/10): a pergunta respondida AQUI fica
 * na fila como cartão respondido, e cada história afetada que ainda é
 * corrigível (`draft`, sem tarefa em execução — a régua da RN-727) ganha
 * "Corrigir a história", que leva à aba Histórias com ela aberta. NÃO aciona
 * o PO. Não corrigível: o botão não existe e o motivo é dito em TEXTO
 * (RN-102). História que o backlog não traz não é nomeada nem oferecida.
 */
export function CartaoRespondido({
  projectId,
  pergunta,
  historias,
  podeCorrigir,
  aoDispensar,
}: {
  projectId: string;
  pergunta: OpenQuestion;
  historias?: readonly Story[];
  podeCorrigir: boolean;
  aoDispensar?: (questionId: string) => void;
}) {
  const { t } = useTranslation('sessionPage');
  const { t: tBacklog } = useTranslation('backlog');
  const afetadas = pergunta.afeta.historias
    .map((id) => historias?.find((s) => s.id === id))
    .filter((s): s is Story => !!s);
  return (
    <div className={styles.grupo} data-testid="pergunta-respondida">
      <p>{semIdentificadorInterno(pergunta.pergunta)}</p>
      <p className={styles.nota}>{t('pendencias.perguntas.respondida')}</p>
      {afetadas.map((story) => {
        const inerte = motivoDeCorrecaoInerte(story, podeCorrigir);
        return (
          <div key={story.id} className={styles.acoesDaLinha}>
            <span className={styles.nota}>
              {t('pendencias.perguntas.corrigirHistoria', { titulo: story.title })}
            </span>
            {inerte ? (
              <span className={styles.nota} data-testid="corrigir-historia-inerte">
                {tBacklog(inerte.chave, { count: inerte.count })}
              </span>
            ) : (
              <a
                href={`/projects/${projectId}?tab=backlog&historia=${encodeURIComponent(story.id)}`}
                data-testid="corrigir-historia"
              >
                {t('pendencias.perguntas.corrigir')}
              </a>
            )}
          </div>
        );
      })}
      {aoDispensar && (
        <div className={styles.acoesDaLinha}>
          <Button variant="ghost" onClick={() => aoDispensar(pergunta.questionId)}
            legenda={t('pendencias.perguntas.dispensar')}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * RN-861: o aviso junto de "Estou pronto" e "Confirmar arquitetura pronta".
 * Lê a MESMA query da fila (cache compartilhado, sem poll) e só AVISA — os
 * botões de prontidão seguem habilitados (decisão do dono, ADR 0214).
 */
export function AvisoDePerguntasEmAberto({
  projectId,
  classeDaLinha,
  classeDoTexto,
}: {
  projectId: string | undefined;
  classeDaLinha?: string;
  classeDoTexto?: string;
}) {
  const { t } = useTranslation('sessionPage');
  const n = usePerguntasEmAberto(projectId).data?.total ?? 0;
  if (n === 0) return null;
  return (
    <div className={classeDaLinha} data-testid="aviso-perguntas-em-aberto">
      <span className={classeDoTexto}>{t('composer.perguntasEmAberto', { count: n })}</span>
      <Button
        variant="secondary"
        onClick={rolarAteAsPerguntas}
        legenda={t('composer.responderPerguntas')}
      >
        <Reply aria-hidden="true" />
      </Button>
    </div>
  );
}
