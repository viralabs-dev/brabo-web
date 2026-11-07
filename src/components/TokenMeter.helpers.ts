import type { TokenThreshold } from './TokenMeter';

export function tokenThreshold(pct: number): TokenThreshold {
  if (pct >= 90) return 'danger';
  if (pct >= 70) return 'warning';
  return 'ok';
}
