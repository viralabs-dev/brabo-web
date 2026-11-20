import type { Project, ProjectCardSummary } from './api-types';

/** AT-967 / RN-1460: parado = sem evento há mais de 30 dias. Fixo, não configurável. */
export const DIAS_PARADO = 30;
const DIA_MS = 86_400_000;

export type FiltroDoInicio = 'ativos' | 'parados' | 'todos';
const CHAVE_DO_FILTRO = 'brabo.inicio.filtro';

/**
 * Sem o resumo (carregando ou com erro) o projeto NÃO é dado como parado: a tela
 * não afirma o que não leu (EP-020). Sem evento nenhum, vale a data de criação —
 * projeto novo e ainda quieto não nasce "parado".
 */
export function estaParado(
  project: Pick<Project, 'createdAt'>,
  card: Pick<ProjectCardSummary, 'lastEvent'> | undefined,
  agora = Date.now(),
): boolean {
  if (!card) return false;
  const ultima = card.lastEvent?.createdAt ?? project.createdAt;
  return agora - new Date(ultima).getTime() > DIAS_PARADO * DIA_MS;
}

export function lerFiltroDoInicio(): FiltroDoInicio {
  try {
    const v = localStorage.getItem(CHAVE_DO_FILTRO);
    if (v === 'parados' || v === 'todos') return v;
  } catch {
    /* armazenamento bloqueado: cai no padrão */
  }
  return 'ativos';
}

export function guardarFiltroDoInicio(f: FiltroDoInicio): void {
  try {
    localStorage.setItem(CHAVE_DO_FILTRO, f);
  } catch {
    /* sem armazenamento a escolha só vale nesta visita */
  }
}
