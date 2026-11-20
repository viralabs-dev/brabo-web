// Formatadores de moeda compartilhados — existiam duplicados dentro de
// TokenMeter.tsx; agora todo consumidor USD (dashboard incluso, ADR
// 0040) usa o MESMO formatter.
import i18n from './i18n';

export const numberFmt = new Intl.NumberFormat('pt-BR');
export const brlFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
export const usdFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'USD',
});

/** USD no idioma vigente da interface (lido a cada chamada), com o número de casas da tela. */
export function formatarUsdCasas(usd: number, casas: number): string {
  return new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(usd);
}

/** Converte micro-USD (unidade que a api usa em toda parte) pra USD exibível. */
export function microsParaUsd(micros: number): number {
  return micros / 1_000_000;
}
