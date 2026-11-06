import { describe, expect, it } from 'vitest';
import { regrasAtivas } from './regras-ativas';
import type { SessionEvent } from './api-types';

const ev = (id: string, type: string, payload: unknown = {}): SessionEvent =>
  ({
    id,
    sessionId: 's',
    seq: 1,
    type,
    actor: { kind: 'agent', id: 'criativo' },
    payload,
    createdAt: '2026-11-06T00:00:00.000Z',
  }) as SessionEvent;

describe('regrasAtivas (RN-1018)', () => {
  it('tira a regra citada por um artifact.business_rule_retired e mantém as outras', () => {
    const r = regrasAtivas([
      ev('a', 'artifact.business_rule'),
      ev('b', 'artifact.business_rule'),
      ev('r1', 'artifact.business_rule_retired', { ruleId: 'a' }),
      ev('x', 'agent.status'),
    ]);
    expect(r.map((e) => e.id)).toEqual(['b']);
  });
});
