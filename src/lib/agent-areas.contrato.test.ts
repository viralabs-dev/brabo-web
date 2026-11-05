import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AREAS, SOLO_CONVERSATIONAL_AGENTS } from './agent-areas.generated';

// `areas.json` é do brabo-contracts (`pnpm areas:baixar`, mesma tag do @brabo/shared).
// Sem o arquivo (máquina local que não baixou) o teste PULA; no CI ele é obrigatório.
const arquivo = resolve(process.cwd(), '.contracts/areas.json');
const baixado = existsSync(arquivo);

describe('agent-areas.generated acompanha o areas.json do brabo-contracts', () => {
  it.skipIf(!baixado && !process.env.CI)('áreas e agentes solo iguais ao contrato', () => {
    const j = JSON.parse(readFileSync(arquivo, 'utf8')) as {
      areas: { key: string; label: string; lead: string; members: string[] }[];
      solo: string[];
    };
    expect(Object.keys(AREAS).sort()).toEqual(j.areas.map((a) => a.key).sort());
    for (const a of j.areas) {
      const { key, label, lead, members } = AREAS[a.key]!;
      expect({ key, label, lead, members }).toEqual({ key: a.key, label: a.label, lead: a.lead, members: a.members });
    }
    expect([...SOLO_CONVERSATIONAL_AGENTS]).toEqual(j.solo);
  });
});
