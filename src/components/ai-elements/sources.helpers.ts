import type { FonteDoTurno } from '../../lib/fontes-do-turno';

export function hrefDaFonte(f: FonteDoTurno, projectId: string): string | undefined {
  if (!f.ref) return undefined;
  if (f.tipo === 'historia')
    return `/projects/${projectId}?tab=backlog&historia=${encodeURIComponent(f.ref)}`;
  return /^https:\/\/\S+\/pull\/\d+/.test(f.ref) ? f.ref : undefined;
}
