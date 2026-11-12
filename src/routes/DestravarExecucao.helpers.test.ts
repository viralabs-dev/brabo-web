import { describe, expect, it } from 'vitest';
import { textoDaExecucaoParada } from './DestravarExecucao.helpers';

const t = (chave: string, o?: Record<string, unknown>) => `${chave}:${JSON.stringify(o ?? {})}`;
const base = { agentesOciosos: [], agentesTravados: [], tarefasBloqueadas: [], tarefasPendentes: 2 };

describe('textoDaExecucaoParada (AT-913)', () => {
  it('nomeia o ciclo depois do aviso', () => {
    const txt = textoDaExecucaoParada(t, { ...base, ciclosDeDependencia: [{ taskId: 'x', modulo: 'agendamento', esperaPor: 'api-http' }] });
    expect(txt).toContain('execucaoParada.aviso');
    expect(txt).toContain('execucaoParada.ciclo:{"modulo":"agendamento","esperaPor":"api-http"}');
  });

  it('sem ciclo, só o aviso', () => {
    expect(textoDaExecucaoParada(t, base)).not.toContain('execucaoParada.ciclo');
  });
});
