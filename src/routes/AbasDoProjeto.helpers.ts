import { GRUPOS_DO_PROJETO, type AbaDoProjeto, type ContagensDeAba } from './project-tabs';

import type { FolhaDaLista, ItemDaLista } from './AbasDoProjeto';

/**
 * A estrutura sai de `GRUPOS_DO_PROJETO`; o `count` é resolvido contra as
 * cinco contagens. Sem `contagens` (um projeto que NÃO é o aberto), nenhuma
 * aba ganha selo — buscar as cinco filas de cada projeto da lista seria o
 * N+1 que a RN-090/091 fechou.
 */
export function itensDasAbas(contagens: ContagensDeAba | undefined): ItemDaLista[] {
  const folha = (aba: AbaDoProjeto): FolhaDaLista => ({
    key: aba.key,
    label: aba.label,
    count: contagens ? aba.count?.(contagens) : undefined,
  });
  return GRUPOS_DO_PROJETO.map((item) =>
    item.tipo === 'grupo'
      ? { tipo: 'grupo' as const, chave: item.chave, label: item.label, abas: item.abas.map(folha) }
      : { tipo: 'aba' as const, aba: folha(item.aba) },
  );
}
