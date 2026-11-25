import type { DecisionInbox, ProposedAction } from './api-types';
import { fraseDaAcao } from './aprovacoes';
import { FILAS_DA_CAIXA, cortar, tituloDoTerminal, type ChaveDaCaixa } from './caixa-de-decisoes';

/** Acima disto um projeto sem evento some da lista e entra na linha "N projetos parados" (AT-966, RN-1470). */
export const DIAS_DE_PROJETO_PARADO = 30;

export interface ItemQuePrecisaDeVoce {
  id: string;
  fila: ChaveDaCaixa;
  /** Quem pede (agente) ou o que espera (história). */
  sujeito: string;
  /** O motivo já em frase; `null` quando quem renderiza usa o rótulo da fila. */
  motivo: string | null;
  projectId: string;
  projectName: string;
  desde: string | null;
  /** Aba do projeto onde a decisão mora. */
  tab: 'approvals' | 'prs' | 'backlog' | 'arquitetura' | 'insights';
}

/**
 * O que "precisa de você" no sino: as MESMAS cinco filas da Caixa de decisões
 * (RN-467), lidas do mesmo cache (`useDecisionInbox`), sem endpoint novo (RN-1469).
 */
export function itensQuePrecisamDeVoce(inbox: DecisionInbox | undefined, rotuloTerminal: string): ItemQuePrecisaDeVoce[] {
  if (!inbox) return [];
  const f = inbox.filas;
  const acoes = (fila: 'aprovacoes' | 'prs'): ItemQuePrecisaDeVoce[] =>
    f[fila].itens.map((i) => {
      const a = i.acao as unknown as ProposedAction; // o DTO gerado afrouxa `decidedBy`
      return {
        id: a.id, fila, sujeito: a.actor.id, projectId: i.projectId, projectName: i.projectName, desde: a.createdAt,
        motivo: tituloDoTerminal(a.actionType, a.payload, rotuloTerminal) ?? cortar(fraseDaAcao(a.actionType, a.payload) ?? a.actionType),
        tab: fila === 'prs' ? 'prs' : 'approvals',
      };
    });
  return [
    ...acoes('aprovacoes'),
    ...acoes('prs'),
    ...f.promocoes.itens.map((i): ItemQuePrecisaDeVoce => ({ id: `promocao-${i.storyId}`, fila: 'promocoes', sujeito: cortar(i.titulo), motivo: null, projectId: i.projectId, projectName: i.projectName, desde: i.desde, tab: 'backlog' })),
    ...f.arquitetura.itens.map((i): ItemQuePrecisaDeVoce => ({ id: `arquitetura-${i.storyId}`, fila: 'arquitetura', sujeito: cortar(i.titulo), motivo: null, projectId: i.projectId, projectName: i.projectName, desde: i.dataEmprestada ? null : i.desde, tab: 'arquitetura' })),
    ...f.hipoteses.itens.map((i): ItemQuePrecisaDeVoce => ({ id: `hipotese-${i.hipoteseId}`, fila: 'hipoteses', sujeito: i.agenteAlvo, motivo: null, projectId: i.projectId, projectName: i.projectName, desde: i.desde, tab: 'insights' })),
  ];
}

/** O número do selo: o total REAL das cinco filas (inclui o que o teto cortou da lista). Sem leitura, 0. */
export function totalQuePrecisaDeVoce(inbox: DecisionInbox | undefined): number {
  return inbox ? FILAS_DA_CAIXA.reduce((n, k) => n + inbox.filas[k].total, 0) : 0;
}

export interface AtividadeDoProjeto {
  projectId: string;
  projectName: string;
  eventos: number;
  /** O evento mais recente da gaveta; `null` enquanto os eventos não chegaram (a tela não afirma idade). */
  ultimoEm: string | null;
}

/**
 * Uma linha por projeto com atividade; os sem evento há mais de 30 dias somam
 * numa linha só (RN-1470). Projeto cujos eventos ainda não chegaram nunca é
 * dado como parado.
 */
export function agruparAtividade(
  groups: { projectId: string; projectName: string; unreadCount: number; events: { createdAt: string }[] }[],
  agora = Date.now(),
): { recentes: AtividadeDoProjeto[]; parados: { projetos: number; eventos: number } } {
  const limite = DIAS_DE_PROJETO_PARADO * 86_400_000;
  const recentes: AtividadeDoProjeto[] = [];
  const parados = { projetos: 0, eventos: 0 };
  for (const g of groups) {
    const ultimoEm = g.events[0]?.createdAt ?? null; // a api manda o mais recente primeiro (RN-100)
    if (ultimoEm && agora - new Date(ultimoEm).getTime() > limite) {
      parados.projetos += 1;
      parados.eventos += g.unreadCount;
    } else {
      recentes.push({ projectId: g.projectId, projectName: g.projectName, eventos: g.unreadCount, ultimoEm });
    }
  }
  return { recentes, parados };
}
