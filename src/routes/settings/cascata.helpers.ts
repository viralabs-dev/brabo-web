import type {
  ModelBindingScope,
  ResolvedBinding,
} from '../../lib/api-types';

import type { EntradaDaCadeia, NivelDaCadeia } from './cascata';

/** Espelha `AGENTE_DE_START` de `apps/api/src/domain/llm/binding-resolver.ts`. */
export const AGENTE_DE_START = 'criativo';

/**
 * Monta a cadeia. Pura — quem chama já tem os níveis em mãos.
 */
export function montarCadeia({
  resolvido,
  niveis,
  proprios,
  herdadoDoStart,
}: EntradaDaCadeia): NivelDaCadeia[] {
  const pulados = resolvido?.skipped ?? [];
  // Quando o Criativo entra, o nível que a CASCATA alcançou foi `workspace` —
  // `origin: 'agent'` ali é o passo de depois, não um degrau da descida.
  const vencedor = !resolvido
    ? undefined
    : herdadoDoStart
      ? 'workspace'
      : resolvido.origin;
  const iVencedor = vencedor ? niveis.indexOf(vencedor) : -1;

  const cadeia: NivelDaCadeia[] = niveis.map((escopo, i) => {
    const pulado = pulados.find((p) => p.scope === escopo);
    if (pulado) {
      return {
        escopo,
        estado: 'pulado',
        modelId: pulado.modelId,
        motivo: pulado.reason,
      };
    }
    if (i === iVencedor) {
      return {
        escopo,
        // Vencedor da cascata, mas NÃO o valor vigente: o modelo que vale é o
        // do Criativo. Marcá-lo `vigente` aqui afirmaria o modelo errado.
        estado: herdadoDoStart ? 'definido' : 'vigente',
        modelId: herdadoDoStart ? proprios[escopo] : resolvido?.modelId,
      };
    }
    // Mais específico que o vencedor: a cascata provou que está vazio.
    if (iVencedor >= 0 && i > iVencedor) return { escopo, estado: 'vazio' };
    const proprio = proprios[escopo];
    return proprio
      ? { escopo, estado: 'definido', modelId: proprio }
      : { escopo, estado: 'vazio' };
  });

  if (herdadoDoStart && resolvido) {
    cadeia.push({ escopo: 'start', estado: 'vigente', modelId: resolvido.modelId });
  }
  return cadeia;
}

/**
 * Herança do Criativo na cadeia de um AGENTE.
 *
 * A api não devolve essa informação (e não precisa: ver o comentário do topo),
 * então ela é DEDUZIDA do que já está em mãos. `origin: 'agent'` só pode ser
 * herança quando NENHUM nível acima do workspace tinha valor utilizável — se a
 * área ou o projeto tivessem, a cascata teria pousado neles e nunca chegaria a
 * `herdarModeloDeStart`. "Utilizável" exclui o que foi PULADO: um padrão de
 * área descartado por indisponibilidade não segura a descida.
 */
export function herdouDoCriativo(entrada: {
  agentKey: string;
  resolvido: ResolvedBinding | null | undefined;
  /** Binding RESOLVIDO da área do agente, se ele tiver área. */
  daArea: ResolvedBinding | null | undefined;
  /** Binding CRU do projeto (`null` quando o projeto só herda). */
  doProjeto: { modelId: string } | null | undefined;
  /** Binding RESOLVIDO do Criativo DESTE projeto. */
  doCriativo: ResolvedBinding | null | undefined;
}): boolean {
  const { agentKey, resolvido, daArea, doProjeto, doCriativo } = entrada;
  // Quem já É o Criativo não herda de si mesmo (mesma guarda do use case).
  if (agentKey === AGENTE_DE_START) return false;
  if (resolvido?.origin !== 'agent') return false;

  const pulou = (escopo: ModelBindingScope) =>
    (resolvido.skipped ?? []).some((p) => p.scope === escopo);
  if (daArea?.origin === 'area' && !pulou('area')) return false;
  if (doProjeto?.modelId && !pulou('project')) return false;

  // O passo do Criativo exige uma linha de agente DELE, utilizável — e é
  // exatamente isso que `origin: 'agent'` na resolução dele significa.
  return (
    doCriativo?.origin === 'agent' && doCriativo.modelId === resolvido.modelId
  );
}
