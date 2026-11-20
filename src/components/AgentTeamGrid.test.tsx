import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgentTeamGrid } from './AgentTeamGrid';
import { AGENTS } from '../lib/agents';
import type { AgentAutonomyRule } from '../lib/api-types';
import type { RosterEntry } from '../lib/agent-status';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

afterAll(() => {
  void i18n.changeLanguage('en');
});

const DEV: RosterEntry = { id: 'dev-api', def: AGENTS.criativo, status: 'ocioso' };

function renderGrid(autonomyRules: AgentAutonomyRule[], onWake = vi.fn()) {
  return render(
    <AgentTeamGrid
      roster={[DEV]}
      groups={[{ kind: 'solo', entry: DEV }]}
      events={[]}
      bindingDoAgente={() => undefined}
      allModels={[]}
      autonomyRules={autonomyRules}
      progressByAgent={new Map()}
      collapsedAreas={new Set()}
      onToggleArea={vi.fn()}
      onAutonomyChange={vi.fn()}
      onRearm={vi.fn()}
      onWake={onWake}
    />,
  );
}

/**
 * RN-603: a frase do modo automático só aparece quando a CURINGA `"*"` está
 * ligada — é ela, e só ela, que dispensa o escopo de caminho. A regra do tipo
 * representativo é específica e não libera o escopo; dizer que libera seria a
 * tela mentindo.
 */
describe('AgentTeamGrid — frase do modo automático (RN-603)', () => {
  it('curinga ligada: diz o que libera e o que continua pedindo', () => {
    renderGrid([{ agentId: 'dev-api', actionType: '*', mode: 'auto_approve' }]);
    expect(screen.getByText(/inclusive fora da pasta do projeto/)).toBeInTheDocument();
    expect(screen.getByText(/sudo\/doas/)).toBeInTheDocument();
  });

  it('curinga desligada (manual): nenhuma frase', () => {
    renderGrid([{ agentId: 'dev-api', actionType: '*', mode: 'require_approval' }]);
    expect(screen.queryByText(/inclusive fora da pasta do projeto/)).toBeNull();
  });

  it('auto por regra ESPECÍFICA (sem curinga): nenhuma frase', () => {
    renderGrid([{ agentId: 'dev-api', actionType: 'terminal', mode: 'auto_approve' }]);
    expect(screen.getByRole('button', { name: 'Piloto automático' })).toBeInTheDocument();
    expect(screen.queryByText(/inclusive fora da pasta do projeto/)).toBeNull();
  });
});

describe('AgentTeamGrid — procurar tarefa de novo (AT-906)', () => {
  it('o cartão ocioso chama onWake com o id do agente, pelo menu "Mais ações"', async () => {
    const onWake = vi.fn();
    renderGrid([], onWake);
    await userEvent.click(screen.getByRole('button', { name: `Mais ações de ${AGENTS.criativo.name}` }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Procurar tarefa de novo' }));
    expect(onWake).toHaveBeenCalledWith('dev-api');
  });
});

describe('AgentTeamGrid — chip "local" (RN-1492)', () => {
  const modelo = (provider: string) =>
    [{ id: 'm1', provider, name: 'qwen', displayName: 'Qwen 7B' }] as unknown as Parameters<typeof AgentTeamGrid>[0]['allModels'];
  const montar = (allModels: Parameters<typeof AgentTeamGrid>[0]['allModels']) =>
    render(
      <AgentTeamGrid
        roster={[DEV]}
        groups={[{ kind: 'solo', entry: DEV }]}
        events={[]}
        bindingDoAgente={() => ({ modelId: 'm1' }) as never}
        allModels={allModels}
        autonomyRules={[]}
        progressByAgent={new Map()}
        collapsedAreas={new Set()}
        onToggleArea={vi.fn()}
        onAutonomyChange={vi.fn()}
        onRearm={vi.fn()}
        onWake={vi.fn()}
      />,
    );

  it('modelo local (ollama): o chip aparece e o nome do modelo continua', () => {
    montar(modelo('ollama'));
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText(/Qwen 7B · ollama/)).toBeInTheDocument();
  });

  it('modelo de nuvem ou sem a categoria (catálogo vazio): nenhum chip', () => {
    const r = montar(modelo('anthropic'));
    expect(screen.queryByText('local')).not.toBeInTheDocument();
    r.unmount();
    montar([]);
    expect(screen.queryByText('local')).not.toBeInTheDocument();
  });
});
