import { describe, expect, it } from 'vitest';
import { pareceUuid, semIdentificadorInterno } from './sem-identificador';

const ID = '3bee9c2f-1a2b-4c3d-8e9f-0123456789ab';

describe('semIdentificadorInterno (RN-1535)', () => {
  it('apaga o UUID entre parênteses com o espaço antes', () => {
    expect(semIdentificadorInterno(`Prazo de cancelamento (${ID})`)).toBe('Prazo de cancelamento');
  });
  it('apaga o prefixo hex de 8 caracteres entre parênteses', () => {
    expect(semIdentificadorInterno('Prazo (3bee9c2f-…) vale')).toBe('Prazo vale');
  });
  it('apaga o par questionId= e taskId=', () => {
    expect(semIdentificadorInterno(`- questionId=${ID}: qual prazo?`)).toBe('- qual prazo?');
    expect(semIdentificadorInterno(`taskId=${ID} parou`)).toBe('parou');
  });
  it('apaga UUID solto sem deixar espaço duplo', () => {
    expect(semIdentificadorInterno(`a tarefa ${ID} parou`)).toBe('a tarefa parou');
  });
  it('mantém o id em crase e em bloco de código', () => {
    expect(semIdentificadorInterno(`use \`${ID}\` aqui`)).toBe(`use \`${ID}\` aqui`);
    const bloco = `\`\`\`\n${ID}\n\`\`\``;
    expect(semIdentificadorInterno(`${bloco}\nfora ${ID}`)).toBe(`${bloco}\nfora`);
  });
  it('pareceUuid só aceita o UUID inteiro', () => {
    expect(pareceUuid(ID)).toBe(true);
    expect(pareceUuid('criativo')).toBe(false);
  });
});
