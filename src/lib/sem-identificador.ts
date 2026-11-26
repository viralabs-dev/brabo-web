// AT-1026 (RN-1535): texto mostrado à pessoa nunca leva identificador interno.
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const EH_UUID = new RegExp(`^${UUID}$`);
const CODIGO = /(```[\s\S]*?```|`[^`\n]*`)/;
const REGRAS: RegExp[] = [
  new RegExp(`\\s*\\(\\s*${UUID}\\s*\\)`, 'g'),
  /\s*\([0-9a-fA-F]{8}-[^)\s]*\)/g,
  new RegExp(`\\b(?:questionId|taskId)=${UUID}:?[ \\t]*`, 'g'),
  new RegExp(`[ \\t]*\\b${UUID}\\b`, 'g'),
];

/** O id com cara de UUID (o que a tela nunca mostra como nome). */
export const pareceUuid = (id: string) => EH_UUID.test(id);

/**
 * Apaga UUID, `questionId=`/`taskId=` e o prefixo hex entre parênteses do texto,
 * fora de crase e de bloco de código (ali o id pode ser o assunto). O id segue no log.
 */
export function semIdentificadorInterno(texto: string): string {
  return texto
    .split(CODIGO)
    .map((trecho, i) => (i % 2 === 1 ? trecho : REGRAS.reduce((t, r) => t.replace(r, ''), trecho)))
    .join('');
}
