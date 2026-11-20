import { describe, expect, it } from 'vitest';
import i18n from '../lib/i18n';
import { formatarCustoMedio } from './CredentialSpendSection.helpers';

describe('formatarCustoMedio (AT-1005)', () => {
  it('abaixo de 1 centavo mostra 4 casas, nunca "< US$ 0,01"', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(formatarCustoMedio(1_200).replace(/\s/g, ' ')).toBe('US$ 0,0012');
  });

  it('a partir de 1 centavo volta ao formato de 2 casas', async () => {
    await i18n.changeLanguage('pt-BR');
    expect(formatarCustoMedio(30_000).replace(/\s/g, ' ')).toBe('US$ 0,03');
  });
});
