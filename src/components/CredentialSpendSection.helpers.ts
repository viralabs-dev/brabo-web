import i18n from '../lib/i18n';

export function formatadorUsd(): Intl.NumberFormat {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'USD',
  });
}

/**
 * Abaixo de um centavo NÃO vira `US$ 0,00`: a diferença entre "não gastou" e
 * "gastou pouco" é justamente o que este relatório existe para mostrar.
 *
 * O formatador é resolvido a cada CHAMADA (`i18n.language` lido dentro da
 * função, não em constante de módulo) para reagir ao idioma vigente, mesmo
 * sendo função não-React — mesmo padrão de `session-falha.ts`.
 */
export function formatarUsd(micros: number): string {
  if (micros === 0) return formatadorUsd().format(0);
  const usd = micros / 1_000_000;
  if (usd < 0.01) {
    return i18n.t('spend.currency.belowCent', {
      ns: 'models',
      value: formatadorUsd().format(0.01),
    });
  }
  return formatadorUsd().format(usd);
}

export function formatarMes(iso: string): string {
  // `timeZone: 'UTC'` não é detalhe: o bucket vem de `date_trunc('month', …)`
  // em UTC, e renderizar em America/Sao_Paulo (UTC-3) joga 1º de agosto às
  // 00:00Z para 31 de julho — o relatório mostrava o mês ERRADO, sempre o
  // anterior, para todo mundo a oeste de Greenwich.
  return new Date(iso).toLocaleDateString(i18n.language, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
