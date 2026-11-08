/** "há 12 minutos" no idioma da tela, de um instante ISO até agora (RN-1063). */
export function esperaRelativa(iso: string, idioma: string, agora = Date.now()): string {
  const minutos = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(idioma, { numeric: 'auto' });
  if (minutos < 60) return rtf.format(-minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (horas < 24) return rtf.format(-horas, 'hour');
  return rtf.format(-Math.round(horas / 24), 'day');
}

/** O título da aba com o contador de PRs prontas: "(1) Brabo"; sem PR, o título puro. */
export function tituloComContador(base: string, prontas: number): string {
  return prontas > 0 ? `(${prontas}) ${base}` : base;
}
