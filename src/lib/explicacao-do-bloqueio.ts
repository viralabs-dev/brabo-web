import type { TFunction } from 'i18next';
import type { ExplicacaoDoBloqueio } from './api-types';

/** A ação do teto de custo: o clique grava o teto e só então retoma (AT-1021, RN-1531). */
export const ACAO_AUMENTAR_O_TETO = 'aumentar_o_teto';

export interface AcaoProntaDoBloqueio {
  id?: string;
  rotulo: string;
  /** Vai ao dev como veio (instrução para o agente): nunca é traduzida. */
  orientacao: string;
}

interface ComExplicacao {
  blockedExplicacao?: ExplicacaoDoBloqueio | null;
}

/**
 * AT-1021 (RN-1531): a frase de causa do bloqueio. O bloqueio do sistema (`codigo` do catálogo) é
 * traduzido por `pendencias.bloqueadas.causas.<codigo>`, com o texto da api como `defaultValue`; o
 * texto do agente (sem `codigo`) é exibido como veio. Sem explicação (dado antigo), a frase genérica
 * — o relato cru nunca é a frase principal.
 */
export function causaDoBloqueio(task: ComExplicacao, t: TFunction): string {
  const e = task.blockedExplicacao;
  if (!e) return t('pendencias.bloqueadas.causaGenerica');
  return e.codigo ? t(`pendencias.bloqueadas.causas.${e.codigo}`, { defaultValue: e.causa }) : e.causa;
}

/** As 1..2 ações prontas; sem explicação (ou sem ação), "Tentar de novo" com orientação vazia. */
export function acoesDoBloqueio(task: ComExplicacao, t: TFunction): AcaoProntaDoBloqueio[] {
  const e = task.blockedExplicacao;
  if (!e || e.acoes.length === 0) return [{ rotulo: t('pendencias.bloqueadas.tentarDeNovo'), orientacao: '' }];
  const codigo = e.codigo;
  return e.acoes.slice(0, 2).map((a) => ({
    id: a.id,
    orientacao: a.orientacao,
    rotulo:
      codigo && a.id
        ? t(`pendencias.bloqueadas.acoes.${a.id}`, { defaultValue: a.rotulo })
        : a.rotulo,
  }));
}
