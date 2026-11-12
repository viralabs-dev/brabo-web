import { SECOES_DO_PROJETO, type ContagensDeAba } from './project-tabs';

import type { FolhaDaLista, ItemDaLista } from './AbasDoProjeto';

/**
 * Os oito itens da sidebar (ADR 0294). O contador do item é de UMA fila só
 * (Trabalho, Código, Arquitetura); Decisões junta duas filas e mostra só o
 * PONTO de presença, com os números nas sub-abas (RN-467). Sem `contagens`
 * (projeto que NÃO é o aberto) nada ganha selo: seria o N+1 da RN-090/091.
 */
export function itensDasAbas(contagens: ContagensDeAba | undefined): ItemDaLista[] {
  const c = contagens;
  const unico: Record<string, number | undefined> = {
    trabalho: c?.promocoesPendentes,
    codigo: c?.prsPendentes,
    arquitetura: c?.arquiteturaPendente,
  };
  return SECOES_DO_PROJETO.map(
    (s): FolhaDaLista => ({
      key: s.subs[0],
      secao: s.chave,
      label: s.label,
      chaves: [...s.subs],
      count: unico[s.chave] || undefined,
      presenca: s.chave === 'decisoes' && !!c && (c.aprovacoesPendentes > 0 || c.hipotesesPendentes > 0),
    }),
  );
}
