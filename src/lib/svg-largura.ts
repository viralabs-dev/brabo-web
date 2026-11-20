/* Largura natural do SVG (viewBox do Mermaid): o zoom inicial é 1, que mantém o texto em 12,5 px ou mais (AT-972, RN-1475). */
export function larguraNatural(svg: string): number | null {
  const m = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/.exec(svg);
  return m ? Math.round(Number(m[1])) : null;
}
