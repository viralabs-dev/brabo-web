import { describe, expect, it } from 'vitest';
import { AGENTS } from './agents';
import { agentesAgora } from './agentes-agora';
import type { RosterEntry } from './agent-status';

const e = (id: string, status: RosterEntry['status']): RosterEntry => ({
  id,
  def: { ...AGENTS.criativo, name: id },
  status,
});

describe('agentesAgora (RN-1205)', () => {
  it('ordena por urgência, limita a 5 e vira travado em falhou', () => {
    const r = agentesAgora([
      e('a', 'ocioso'),
      e('b', 'trabalhando'),
      e('c', 'travado'),
      e('d', 'aguardando'),
      e('f', 'ocioso'),
      e('g', 'ocioso'),
    ]);
    expect(r.map((x) => x.id)).toEqual(['d', 'c', 'b', 'a', 'f']);
    expect(r[1]?.ponto).toBe('falhou');
  });

  it('roster vazio dá lista vazia', () => {
    expect(agentesAgora([])).toEqual([]);
  });
});
