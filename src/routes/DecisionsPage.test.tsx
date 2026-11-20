import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DecisionsPage } from './DecisionsPage';
import { caixaTemAlgo } from '../lib/caixa-de-decisoes';
import type { DecisionInbox } from '../lib/api-types';
import i18n from '../lib/i18n';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const getDecisionInbox = vi.fn();
const getPsychologistStatus = vi.fn();
const listSessions = vi.fn();
const denyAction = vi.fn();
vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  getDecisionInbox: (...a: unknown[]) => getDecisionInbox(...a),
  listProjects: () => Promise.resolve([{ id: 'p1' }]),
  getPsychologistStatus: (...a: unknown[]) => getPsychologistStatus(...a),
  listSessions: (...a: unknown[]) => listSessions(...a),
  denyAction: (...a: unknown[]) => denyAction(...a),
}));
vi.mock('../lib/hooks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/hooks')>()),
  useCurrentWorkspace: () => ({ data: { id: 'ws-1' } }),
}));
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#x">{children}</a>,
}));

const fila = (itens: unknown[] = [], over = {}) => ({ total: itens.length, truncada: false, itens, ...over });
const acao = (id: string) => ({
  id, sessionId: `s-${id}`, status: 'pending', actionType: 'terminal', payload: { command: 'ls' },
  actor: { type: 'agent', id: 'dev-api' }, createdAt: new Date().toISOString(),
});
const inbox = (filas: Record<string, unknown>) =>
  ({ geradoEm: '', status: 'pending', desde: null, tetoPorFila: 50, projetos: [],
    filas: { aprovacoes: fila(), prs: fila(), promocoes: fila(), arquitetura: fila(), hipoteses: fila(), ...filas } }) as unknown as DecisionInbox;

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><DecisionsPage /></QueryClientProvider>);
}

beforeEach(() => {
  getDecisionInbox.mockReset();
  getPsychologistStatus.mockReset().mockResolvedValue({ enabled: true });
  listSessions.mockReset().mockResolvedValue([]);
  denyAction.mockReset().mockResolvedValue({});
});

describe('DecisionsPage (AT-889, S07)', () => {
  it('mostra os itens de dois projetos, cinco cartões e nenhum total somado', async () => {
    getDecisionInbox.mockResolvedValue(
      inbox({ aprovacoes: fila([{ projectId: 'p1', projectName: 'Alfa', acao: acao('a1') }, { projectId: 'p2', projectName: 'Beta', acao: acao('a2') }], { truncada: true, total: 60 }) }),
    );
    montar();
    await screen.findAllByText(/Alfa/);
    expect(screen.getAllByText(/Beta/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { pressed: false }).filter((b) => b.className.includes('cartao'))).toHaveLength(5);
    expect(screen.getAllByText('60+').length).toBeGreaterThan(0);
    expect(screen.queryByText('62')).toBeNull();
  });

  it('arquitetura em Decididas tem texto próprio e a leitura pede decided', async () => {
    getDecisionInbox.mockResolvedValue(inbox({}));
    montar();
    await screen.findByText('Nenhuma pendência de arquitetura.');
    fireEvent.click(screen.getByRole('button', { name: 'Decididas' }));
    await waitFor(() => expect(getDecisionInbox).toHaveBeenLastCalledWith('ws-1', 'decided'));
    const secao = await screen.findByRole('region', { name: 'Pendências de arquitetura' });
    expect(within(secao).getByText(/não há decisão humana/)).toBeTruthy();
  });

  it('linha compacta: Aprovar, Negar e Abrir; plano só abre', async () => {
    const plano = { ...acao('a2'), actionType: 'propose_execution_plan', payload: { modulos: [] } };
    getDecisionInbox.mockResolvedValue(
      inbox({ aprovacoes: fila([{ projectId: 'p1', projectName: 'Alfa', acao: acao('a1') }, { projectId: 'p1', projectName: 'Alfa', acao: plano }]) }),
    );
    montar();
    await screen.findAllByText(/Alfa/);
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Negar' })).toHaveLength(1);
    expect(screen.getAllByText('Abrir')).toHaveLength(2);
    expect(screen.getByText('1 projeto')).toBeTruthy();
  });

  it('Hipóteses vazia diz que o Psicólogo está pausado', async () => {
    getPsychologistStatus.mockResolvedValue({ enabled: false });
    getDecisionInbox.mockResolvedValue(inbox({}));
    montar();
    expect(await screen.findByText('O Psicólogo está pausado')).toBeTruthy();
    expect(screen.getByText('Nenhuma PR esperando merge')).toBeTruthy();
  });

  it('falha de leitura diz que falhou', async () => {
    getDecisionInbox.mockImplementation(() => Promise.reject(new Error('x')));
    montar();
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('o ponto é presença: some com tudo zerado', () => {
    expect(caixaTemAlgo(inbox({}))).toBe(false);
    expect(caixaTemAlgo(inbox({ prs: fila([{}]) }))).toBe(true);
  });
});

describe('Caixa de decisões na v11 (AT-968)', () => {
  const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
  const terminal = (id: string, command: string, idade = 1, extra = {}) =>
    ({ ...acao(id), payload: { command, ...extra }, createdAt: dias(idade) });
  const item = (a: unknown, projectId = 'p1', projectName = 'Alfa') => ({ projectId, projectName, acao: a });
  const longo = 'cd /tmp/gs && npx tsc -p tsconfig.json --noEmit 2>&1 | tail -20; echo ' + 'x'.repeat(200);

  it('o título do terminal é "Terminal · primeiro comando" (depois do cd), ou a justificativa, e nunca passa de 80', async () => {
    getDecisionInbox.mockResolvedValue(
      inbox({ aprovacoes: fila([item(terminal('a1', longo)), item(terminal('a2', 'ls', 1, { justificativa: 'J'.repeat(150) }))]) }),
    );
    montar();
    await screen.findByText('Terminal · npx');
    expect(screen.getByText('J'.repeat(79) + '…')).toBeTruthy();
    expect(screen.queryByText(/Executa/)).toBeNull();
  });

  it('o comando inteiro fica recolhido e abre ao clicar na linha', async () => {
    getDecisionInbox.mockResolvedValue(inbox({ aprovacoes: fila([item(terminal('a1', longo))]) }));
    montar();
    const cmd = await screen.findByText(longo);
    expect(cmd.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(cmd);
    expect(cmd.getAttribute('aria-expanded')).toBe('true');
  });

  it('agrupa por projeto, ordena a mais antiga primeiro e pinta de âmbar a de mais de 30 dias', async () => {
    getDecisionInbox.mockResolvedValue(
      inbox({ aprovacoes: fila([item(terminal('a1', 'ls', 2), 'p2', 'Beta'), item(terminal('a2', 'pwd', 46)), item(terminal('a3', 'id', 3))]) }),
    );
    montar();
    await screen.findByText('Alfa · 2 aprovações');
    expect(screen.getByText('Beta · 1 aprovação')).toBeTruthy();
    const grupos = screen.getAllByRole('group').filter((g) => g.className.includes('grupo'));
    expect(grupos[0].getAttribute('aria-label')).toBe('Alfa');
    expect(screen.getByText('há 46 d').getAttribute('data-velha')).toBe('true');
    expect(screen.getByText('há 2 d').getAttribute('data-velha')).toBeNull();
    expect(screen.getByText('1 espera há mais de 30 dias')).toBeTruthy();
  });

  it('sessão encerrada diz há quantos dias e tira o Aprovar; a sessão aberta mantém', async () => {
    listSessions.mockResolvedValue([{ id: 's-a1', status: 'closed', closedAt: dias(46), updatedAt: dias(46) }, { id: 's-a2', status: 'active', closedAt: null, updatedAt: dias(1) }]);
    getDecisionInbox.mockResolvedValue(inbox({ aprovacoes: fila([item(terminal('a1', 'ls', 46)), item(terminal('a2', 'pwd', 1))]) }));
    montar();
    await screen.findByText('sessão encerrada há 46 dias: aprovar não executa mais nada');
    expect(screen.getAllByRole('button', { name: 'Aprovar' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Negar' })).toHaveLength(2);
  });

  it('grupo com uma sessão encerrada e outra aberta avisa na linha, não no cabeçalho', async () => {
    listSessions.mockResolvedValue([{ id: 's-a1', status: 'closed', closedAt: dias(40), updatedAt: dias(40) }, { id: 's-a2', status: 'active', closedAt: null, updatedAt: dias(1) }]);
    getDecisionInbox.mockResolvedValue(inbox({ aprovacoes: fila([item(terminal('a1', 'ls', 40)), item(terminal('a2', 'pwd', 1))]) }));
    montar();
    const aviso = await screen.findByText('sessão encerrada há 40 dias: aprovar não executa mais nada');
    expect(aviso.className).toContain('nota');
    expect(screen.getAllByText(/sessão encerrada há/)).toHaveLength(1);
  });

  it('negar 2 selecionadas chama a API 2 vezes com o mesmo motivo, e só então as linhas saem', async () => {
    const dados = [item(terminal('a1', 'ls', 46)), item(terminal('a2', 'pwd', 45)), item(terminal('a3', 'id', 1))];
    getDecisionInbox.mockResolvedValueOnce(inbox({ aprovacoes: fila(dados) })).mockResolvedValue(inbox({ aprovacoes: fila([dados[2]]) }));
    montar();
    await screen.findByText('Terminal · ls');
    expect(screen.queryByRole('button', { name: 'Negar selecionadas…' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar as de mais de 30 dias' }));
    expect(screen.getByText('2 selecionadas')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Negar selecionadas…' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('Terminal · ls')).toBeTruthy();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Negar 2' }));
    expect(denyAction).not.toHaveBeenCalled(); // sem motivo, nada é negado
    fireEvent.change(within(dialogo).getByLabelText('Motivo (vale para todas)'), { target: { value: 'sessão velha' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Negar 2' }));
    await waitFor(() => expect(denyAction).toHaveBeenCalledTimes(2));
    expect(denyAction).toHaveBeenCalledWith('p1', 's-a1', 'a1', 'sessão velha');
    expect(denyAction).toHaveBeenCalledWith('p1', 's-a2', 'a2', 'sessão velha');
    await waitFor(() => expect(screen.queryByText('Terminal · ls')).toBeNull());
    expect(screen.getByText('Terminal · id')).toBeTruthy();
  });

  it('não existe Aprovar em lote', async () => {
    getDecisionInbox.mockResolvedValue(inbox({ aprovacoes: fila([item(terminal('a1', 'ls', 46))]) }));
    montar();
    await screen.findByText('Terminal · ls');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.queryByRole('button', { name: /Aprovar selecionadas/ })).toBeNull();
  });
});
