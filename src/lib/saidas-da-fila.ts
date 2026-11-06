/** As filas do bloco de pendências do chat. */
export type FilaDePendencia = 'perguntas' | 'aprovacoes' | 'merges' | 'prontas' | 'bloqueadas';

export type IdsPorFila = Record<FilaDePendencia, readonly string[]>;

/**
 * AT-753 (UX-7): o que SAIU de cada fila entre duas leituras — está na anterior
 * e não na atual. O que o dono decidiu NESTA tela (`descontar`) já tem o
 * retorno dele e não é anunciado de novo. Devolve só as filas com saída.
 */
export function saidasDaFila(
  anterior: IdsPorFila,
  atual: IdsPorFila,
  descontar: ReadonlySet<string> = new Set(),
): Partial<Record<FilaDePendencia, number>> {
  const saidas: Partial<Record<FilaDePendencia, number>> = {};
  for (const fila of Object.keys(anterior) as FilaDePendencia[]) {
    const ainda = new Set(atual[fila]);
    const n = anterior[fila].filter((id) => !ainda.has(id) && !descontar.has(id)).length;
    if (n > 0) saidas[fila] = n;
  }
  return saidas;
}

const TITULO_MAX = 120;
const SEPARADOR = ' — ';

/**
 * AT-753 (UX-9, P4): a api grava `blockedReason = "${motivo} — ${diagnóstico}"`.
 * O título é o que vem antes do primeiro " — "; o resto é o diagnóstico. Sem o
 * separador, o texto inteiro é o título se for curto; se for longo, o título é
 * o começo cortado e o texto inteiro vira o diagnóstico.
 */
export function tituloEDiagnostico(motivo: string): { titulo: string; diagnostico: string | null } {
  const texto = motivo.trim();
  const i = texto.indexOf(SEPARADOR);
  const titulo = i >= 0 ? texto.slice(0, i).trim() : texto;
  const resto = i >= 0 ? texto.slice(i + SEPARADOR.length).trim() : '';
  if (titulo.length > TITULO_MAX)
    return { titulo: `${titulo.slice(0, TITULO_MAX - 1).trimEnd()}…`, diagnostico: texto };
  return { titulo, diagnostico: resto === '' ? null : resto };
}
