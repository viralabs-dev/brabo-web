/** Modelo de embedding pelo nome (`nomic-embed-text`, `mxbai-embed-large`…). */
export function ehModeloDeEmbedding(nome: string): boolean {
  return /embed/i.test(nome);
}
