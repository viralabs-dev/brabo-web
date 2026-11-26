import { useQuery } from '@tanstack/react-query';
import { getOpenQuestions } from './api-client';
import { INTERVALO_DO_PROJETO_MS } from './canal-vivo';
import { pollQueParaNoErro } from './query-policy';

/**
 * RN-861 (AT-521): a fila "Perguntas em aberto" do projeto. UMA chave, lida
 * pelo bloco de pendências do chat e pelo aviso do composer. O canal da sessão
 * a relê (`artifact.open_question`, `open_question.answered`,
 * `pr.gate_changed` — alvo `perguntas`) e a resposta dada aqui também; mas o QA
 * grava a pergunta na sessão de EXECUÇÃO, cujo canal esta tela não ouve. Por
 * isso ela polla no ritmo de projeto, 15 s (RN-632, RN-1510).
 */
export const CHAVE_DAS_PERGUNTAS_EM_ABERTO = (projectId: string) =>
  ['open-questions', projectId, 'open'] as const;

/** Âncora da fila, alvo do atalho do composer. */
export const ID_DA_FILA_DE_PERGUNTAS = 'fila-perguntas-em-aberto';

export function usePerguntasEmAberto(projectId: string | undefined) {
  return useQuery({
    queryKey: CHAVE_DAS_PERGUNTAS_EM_ABERTO(projectId ?? ''),
    queryFn: () => getOpenQuestions(projectId!, 'open'),
    enabled: !!projectId,
    refetchInterval: pollQueParaNoErro(INTERVALO_DO_PROJETO_MS),
  });
}

/** O painel ouve este evento e abre a aba Perguntas (a aba fechada está `hidden`). */
export const EVENTO_ABRIR_PERGUNTAS = 'brabo:abrir-perguntas';

/** Generaliza o evento acima: abre uma aba do bloco de pendências (`detail` = a fila). */
export const EVENTO_ABRIR_FILA = 'brabo:abrir-fila';

export function abrirFilaDePendencias(fila: string) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_FILA, { detail: fila }));
  setTimeout(() => {
    document.querySelector('[data-testid="pendencias-de-outras-sessoes"]')?.scrollIntoView?.({ block: 'nearest' });
  }, 0);
}

export function rolarAteAsPerguntas() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PERGUNTAS));
  // Depois do render que revela a aba: scrollIntoView em `hidden` não faz nada.
  setTimeout(() => {
    document.getElementById(ID_DA_FILA_DE_PERGUNTAS)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, 0);
}
