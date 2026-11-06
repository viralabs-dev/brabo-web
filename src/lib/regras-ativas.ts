import type { SessionEvent } from './api-types';

/**
 * RN-1018: as regras de negócio da janela SEM as retiradas. A regra retirada
 * segue no log (`artifact.business_rule`); o evento `artifact.business_rule_retired`
 * cita o id dela em `payload.ruleId`.
 */
export function regrasAtivas(events: SessionEvent[]): SessionEvent[] {
  const retiradas = new Set(
    events
      .filter((e) => e.type === 'artifact.business_rule_retired')
      .map((e) => (e.payload as { ruleId?: unknown } | null)?.ruleId),
  );
  return events.filter((e) => e.type === 'artifact.business_rule' && !retiradas.has(e.id));
}
