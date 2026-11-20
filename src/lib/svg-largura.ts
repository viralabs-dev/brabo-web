/* Largura natural do SVG (viewBox do Mermaid): o zoom inicial é 1, que mantém o texto em 12,5 px ou mais (AT-972, RN-1475). */
export function larguraNatural(svg: string): number | null {
  const m = /viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"/.exec(svg);
  return m ? Math.round(Number(m[1])) : null;
}

/** Ajusta o viewBox do SVG do Mermaid ao conteúdo real (getBBox, com folga) e devolve a largura natural (AT-972, RN-1475). */
export function ajustarAoConteudo(svg: SVGSVGElement, folga = 16): number | null {
  if (typeof svg.getBBox !== 'function') return null;
  // O título do Mermaid (texto filho direto) repete o cabeçalho do cartão e fica longe dos nós: sai da conta e da vista.
  svg.querySelectorAll(':scope > text').forEach((t) => t.setAttribute('display', 'none'));
  const b = svg.getBBox();
  if (!b.width || !b.height) return null;
  const w = Math.round(b.width + folga * 2);
  svg.setAttribute('viewBox', `${Math.round(b.x - folga)} ${Math.round(b.y - folga)} ${w} ${Math.round(b.height + folga * 2)}`);
  svg.style.maxWidth = 'none';
  svg.removeAttribute('height');
  return w;
}
