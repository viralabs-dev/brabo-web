import { useQuery } from '@tanstack/react-query';
import { listSessions } from './api-client';
import { FRESCOR_DA_CONFIGURACAO_MS } from './query-policy';
import { hashtagDaSessao, rotuloDaSessao } from './session-label';
import { TIPOS_DE_SESSAO } from './session-kind';

/**
 * Como cada sessão se chama nos rankings (AT-973): nome + hashtag, ou o tipo + hashtag
 * quando não há nome. O relatório só traz o id; o nome vem da lista de sessões do projeto
 * e, sem ela (carga ou erro), a linha cai na hashtag sozinha, sem inventar nome.
 */
export function useRotuloDaSessao(projectId?: string) {
  const sessoes = useQuery({
    queryKey: ['sessions', projectId],
    queryFn: () => listSessions(projectId!),
    enabled: Boolean(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const porId = new Map((sessoes.data ?? []).map((x) => [x.id, x] as const));
  return (chave: string) => {
    const x = porId.get(chave);
    return x ? rotuloDaSessao(chave, x.name?.trim() || TIPOS_DE_SESSAO[x.kind].rotulo) : hashtagDaSessao(chave);
  };
}
