import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { OpenQuestion } from '../lib/api-types';
import i18n from '../lib/i18n';

const getOpenQuestions = vi.fn();
const answerOpenQuestion = vi.fn();
const acceptOpenQuestionSuggestions = vi.fn();
const getProjectPendingActions = vi.fn();
const listSessionEvents = vi.fn();
const getOpenPullRequestsDoChat = vi.fn();
const listBacklog = vi.fn();
let usuario: string | null = 'user-autor';

vi.mock('../lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/api-client')>();
  return {
    ...original,
    getOpenQuestions: (...a: unknown[]) => getOpenQuestions(...a),
    answerOpenQuestion: (...a: unknown[]) => answerOpenQuestion(...a),
    acceptOpenQuestionSuggestions: (...a: unknown[]) => acceptOpenQuestionSuggestions(...a),
    getProjectPendingActions: (...a: unknown[]) => getProjectPendingActions(...a),
    listSessionEvents: (...a: unknown[]) => listSessionEvents(...a),
    getOpenPullRequestsDoChat: (...a: unknown[]) => getOpenPullRequestsDoChat(...a),
    listBacklog: (...a: unknown[]) => listBacklog(...a),
  };
});
vi.mock('../lib/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/auth')>();
  return { ...original, userIdDaSessao: () => usuario };
});

import { ToastProvider } from './ui/ToastProvider';
const { PendenciasDeOutrasSessoes } = await import('./PendenciasDeOutrasSessoes');
const { AvisoDePerguntasEmAberto } = await import('./PerguntasEmAberto');
const { ApiError } = await import('../lib/api-client');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});

function pergunta(id: string, over: Partial<OpenQuestion> = {}): OpenQuestion {
  return {
    questionId: id,
    eventId: `ev-${id}`,
    sessionId: 'sess-1',
    pergunta: `Pergunta ${id}?`,
    sugestao: `Sugestão ${id}`,
    opcoes: [],
    detalhe: null,
    afeta: { regras: ['r1'], historias: [], tarefas: [] },
    autor: 'criativo',
    criadaEm: new Date().toISOString(),
    status: 'open',
    autorDaSessao: 'user-autor',
    resposta: null,
    ...over,
  };
}

function montar(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ToastProvider>{ui}</ToastProvider></QueryClientProvider>);
}
const pendencias = () => (
  <PendenciasDeOutrasSessoes projectId="proj-1" sessionId="sess-1" podeDecidir />
);

async function abrir() {
  fireEvent.click(await screen.findByRole('button', { name: /^Perguntas em aberto \d/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  usuario = 'user-autor';
  getProjectPendingActions.mockResolvedValue([]);
  listSessionEvents.mockResolvedValue({ items: [], nextCursor: null });
  getOpenPullRequestsDoChat.mockResolvedValue({ items: [] });
  listBacklog.mockResolvedValue([]);
  getOpenQuestions.mockResolvedValue({ itens: [pergunta('a'), pergunta('b')], total: 2 });
  answerOpenQuestion.mockResolvedValue({});
});

describe('Perguntas em aberto no chat (RN-861)', () => {
  it('fila própria com contagem própria; o autor responde e aceita a sugestão', async () => {
    montar(pendencias());
    await abrir();
    const fila = await screen.findByTestId('fila-perguntas-em-aberto');
    expect(within(fila).getByRole('heading').textContent).toContain('Perguntas em aberto');
    expect(within(fila).getByRole('heading').textContent).toContain('2');
    expect(screen.getAllByText(/Perguntas em aberto 2/).length).toBeGreaterThan(0);
    expect(getOpenQuestions).toHaveBeenCalledWith('proj-1', 'open');

    const [primeira, segunda] = screen.getAllByTestId('pergunta-em-aberto');
    expect(within(primeira!).getByText(/Criativo perguntou/)).toBeTruthy();
    fireEvent.change(within(primeira!).getByLabelText('Sua resposta'), {
      target: { value: 'Use Postgres' },
    });
    fireEvent.click(within(primeira!).getByRole('button', { name: 'Responder' }));
    await waitFor(() =>
      expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'a', { resposta: 'Use Postgres' }),
    );

    fireEvent.click(within(segunda!).getByRole('button', { name: 'Aceitar sugestão' }));
    await waitFor(() =>
      expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'b', { aceitarSugestao: true }),
    );
  });

  it('RN-1536: Enter envia uma vez; vazio e composição de IME não enviam', async () => {
    montar(pendencias());
    await abrir();
    const [primeira] = await screen.findAllByTestId('pergunta-em-aberto');
    const campo = within(primeira!).getByLabelText('Sua resposta');
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(answerOpenQuestion).not.toHaveBeenCalled();
    fireEvent.change(campo, { target: { value: 'Use Postgres' } });
    fireEvent.keyDown(campo, { key: 'Enter', isComposing: true });
    expect(answerOpenQuestion).not.toHaveBeenCalled();
    fireEvent.keyDown(campo, { key: 'Enter' });
    await waitFor(() => expect(answerOpenQuestion).toHaveBeenCalledTimes(1));
    expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'a', { resposta: 'Use Postgres' });
  });

  it('RN-1535: a pergunta não mostra UUID', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: [pergunta('a', { pergunta: 'Qual prazo (3bee9c2f-1a2b-4c3d-8e9f-0123456789ab)?' })],
      total: 1,
    });
    montar(pendencias());
    await abrir();
    expect(await screen.findByText('Qual prazo?')).toBeTruthy();
  });

  it('AT-713: Aceitar, Responder e Dispensar são só ícone, com nome e ícone aria-hidden', async () => {
    montar(pendencias());
    await abrir();
    const [primeira, segunda] = await screen.findAllByTestId('pergunta-em-aberto');
    for (const [linha, nome] of [[primeira!, 'Responder'], [segunda!, 'Aceitar sugestão']] as const) {
      const b = within(linha).getByRole('button', { name: nome });
      expect(b.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(b.textContent).toBe('');
    }
  });

  it('quem não é o autor da sessão vê o cartão com o controle inerte e o motivo em texto', async () => {
    usuario = 'outra-pessoa';
    montar(pendencias());
    await abrir();
    const [primeira] = await screen.findAllByTestId('pergunta-em-aberto');
    expect(within(primeira!).getByText('Pergunta a?')).toBeTruthy();
    expect(
      (within(primeira!).getByRole('button', { name: 'Aceitar sugestão' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect((within(primeira!).getByLabelText('Sua resposta') as HTMLInputElement).disabled).toBe(
      true,
    );
    expect(within(primeira!).getByText(/Só quem criou a sessão/)).toBeTruthy();
  });

  it('a recusa 409 mostra a frase da api', async () => {
    answerOpenQuestion.mockRejectedValue(
      new ApiError(409, { reason: 'pergunta_ja_respondida', message: 'A pergunta já foi respondida.' }),
    );
    montar(pendencias());
    await abrir();
    const [primeira] = await screen.findAllByTestId('pergunta-em-aberto');
    fireEvent.click(within(primeira!).getByRole('button', { name: 'Aceitar sugestão' }));
    expect((await within(primeira!).findByRole('alert')).textContent).toBe(
      'A pergunta já foi respondida.',
    );
  });

  it('a tarefa que o gate estacionou aparece como esperando a resposta', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: [pergunta('q', { autor: 'qa-agent', afeta: { regras: [], historias: [], tarefas: ['t1'] } })],
      total: 1,
    });
    listBacklog.mockResolvedValue([
      { id: 'e1', stories: [{ id: 's1', tasks: [{ id: 't1', title: 'Tela de login' }] }] },
    ]);
    montar(pendencias());
    expect((await screen.findByTestId('tarefa-esperando-resposta')).textContent).toContain(
      'Tela de login',
    );
  });

  it('o aviso do composer diz N e não bloqueia nada; some sem perguntas', async () => {
    montar(<AvisoDePerguntasEmAberto projectId="proj-1" />);
    const aviso = await screen.findByTestId('aviso-perguntas-em-aberto');
    expect(aviso.textContent).toContain('2 perguntas em aberto');
    expect((within(aviso).getByRole('button') as HTMLButtonElement).disabled).toBe(false);

    getOpenQuestions.mockResolvedValue({ itens: [], total: 0 });
    montar(<AvisoDePerguntasEmAberto projectId="proj-2" />);
    await waitFor(() => expect(getOpenQuestions).toHaveBeenCalledWith('proj-2', 'open'));
    expect(screen.getAllByTestId('aviso-perguntas-em-aberto')).toHaveLength(1);
  });
});

describe('Perguntas em aberto — paginação (AT-680, RN-975)', () => {
  it('5 perguntas mostram 3 cartões e o paginador; o total da fila segue 5', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: ['a', 'b', 'c', 'd', 'e'].map((i) => pergunta(i)),
      total: 5,
    });
    montar(pendencias());
    await abrir();
    const fila = await screen.findByTestId('fila-perguntas-em-aberto');
    expect(within(fila).getAllByText(/^Pergunta [a-e]\?$/)).toHaveLength(3);
    expect(within(fila).getByRole('status')).toHaveTextContent('1–3 de 5');
    expect(within(fila).getByRole('heading', { level: 4 })).toHaveTextContent('5');
    fireEvent.click(within(fila).getByRole('button', { name: 'Próxima página de Perguntas em aberto' }));
    expect(within(fila).getByRole('status')).toHaveTextContent('4–5 de 5');
    expect(within(fila).getAllByText(/^Pergunta [a-e]\?$/)).toHaveLength(2);
  });

  it('CASO DE FALHA: com 3 perguntas não há paginador', async () => {
    getOpenQuestions.mockResolvedValue({ itens: ['a', 'b', 'c'].map((i) => pergunta(i)), total: 3 });
    montar(pendencias());
    await abrir();
    const fila = await screen.findByTestId('fila-perguntas-em-aberto');
    expect(within(fila).queryByRole('status')).toBeNull();
  });
});

describe('AT-997: aceitar as sugestões do mesmo agente em lote', () => {
  it('o botão só aparece com ≥ 2 do mesmo agente; a confirmação lista as N e marca a de regra', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: [pergunta('a'), pergunta('b', { afeta: { regras: [], historias: [], tarefas: [] } }), pergunta('c', { autor: 'arquiteto' })],
      total: 3,
    });
    acceptOpenQuestionSuggestions.mockResolvedValue({
      resultados: [
        { questionId: 'a', status: 'answered' },
        { questionId: 'b', status: 'answered' },
      ],
    });
    montar(pendencias());
    await abrir();
    const botoes = await screen.findAllByTestId('aceitar-lote');
    expect(botoes).toHaveLength(1);
    expect(botoes[0]!.textContent).toContain('Aceitar as 2 sugestões de Criativo');
    fireEvent.click(botoes[0]!);
    const conf = await screen.findByTestId('confirmacao-do-lote');
    expect(within(conf).getAllByRole('listitem')).toHaveLength(2);
    expect(within(conf).getAllByTestId('lote-toca-regra')).toHaveLength(1);
    expect(acceptOpenQuestionSuggestions).not.toHaveBeenCalled();
    fireEvent.click(within(conf).getByRole('button', { name: /Confirmar as 2 sugestões/ }));
    await waitFor(() =>
      expect(acceptOpenQuestionSuggestions).toHaveBeenCalledWith('proj-1', ['a', 'b']),
    );
  });

  it('com uma só sugestão do agente, não há botão de lote', async () => {
    getOpenQuestions.mockResolvedValue({ itens: [pergunta('a'), pergunta('c', { autor: 'arquiteto' })], total: 2 });
    montar(pendencias());
    await abrir();
    await screen.findAllByTestId('pergunta-em-aberto');
    expect(screen.queryByTestId('aceitar-lote')).toBeNull();
  });
});

// AT-1021 (RN-1531): as perguntas do TP-01 30ª (L1, L4, L6, L9): um botão por opção que responde
// com `{ resposta }` em um clique; detalhe técnico e campo livre recolhidos.
const PERGUNTAS_COM_OPCOES = [
  { l: 'L1', pergunta: 'A execução já está rodando. Posso seguir?', opcoes: [{ rotulo: 'Seguir: a execução já está rodando', resposta: 'Siga: a execução já está rodando.' }] },
  { l: 'L4', pergunta: 'O Arquiteto sugeriu outra estrutura. Qual seguir?', opcoes: [{ rotulo: 'Seguir a sugestão do Arquiteto', resposta: 'Siga a sugestão do Arquiteto.' }] },
  { l: 'L6', pergunta: 'Qual nome usar para o módulo?', opcoes: [{ rotulo: 'Usar o nome sugerido', resposta: 'Use o nome sugerido.' }] },
  {
    l: 'L9',
    pergunta: 'Quer que eu teste também com um banco de dados de verdade? Demora mais.',
    opcoes: [
      { rotulo: 'Testar com banco (demora mais)', resposta: 'Teste com banco.' },
      { rotulo: 'Seguir sem esse teste', resposta: 'Siga sem esse teste.' },
    ],
  },
];

describe('Perguntas com opções prontas (AT-1021, RN-1531)', () => {
  it.each(PERGUNTAS_COM_OPCOES)('$l: um botão por opção; o clique responde em um clique', async ({ pergunta: texto, opcoes }) => {
    getOpenQuestions.mockResolvedValue({
      itens: [pergunta('q', { pergunta: texto, opcoes, detalhe: 'Posso declarar run.qa.services com postgres:16@sha256:3f9a' })],
      total: 1,
    });
    montar(pendencias());
    await abrir();
    const cartao = await screen.findByTestId('pergunta-em-aberto');
    const botoes = within(cartao).getAllByTestId('opcao-da-pergunta');
    expect(botoes.map((b) => b.textContent)).toEqual(opcoes.map((o) => o.rotulo));
    expect(within(cartao).queryByText(/sha256/)).toBeNull();
    expect(within(cartao).queryByLabelText('Sua resposta')).toBeNull();
    fireEvent.click(botoes[botoes.length - 1]!);
    await waitFor(() =>
      expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'q', { resposta: opcoes[opcoes.length - 1]!.resposta }),
    );
    expect(answerOpenQuestion).toHaveBeenCalledTimes(1);
  });

  it('o detalhe técnico abre sob demanda e a resposta por texto continua disponível', async () => {
    getOpenQuestions.mockResolvedValue({
      itens: [pergunta('q', { opcoes: [{ rotulo: 'Sim', resposta: 'Sim.' }], detalhe: 'run.qa.services' })],
      total: 1,
    });
    montar(pendencias());
    await abrir();
    const cartao = await screen.findByTestId('pergunta-em-aberto');
    fireEvent.click(within(cartao).getByRole('button', { name: 'Ver detalhes técnicos' }));
    expect(within(cartao).getByTestId('detalhe-tecnico')).toHaveTextContent('run.qa.services');
    fireEvent.click(within(cartao).getByRole('button', { name: 'Responder com texto' }));
    fireEvent.change(within(cartao).getByLabelText('Sua resposta'), { target: { value: 'Outra coisa' } });
    fireEvent.click(within(cartao).getByRole('button', { name: 'Responder' }));
    await waitFor(() => expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'q', { resposta: 'Outra coisa' }));
  });

  it('"Aceitar sugestão" continua ao lado das opções', async () => {
    getOpenQuestions.mockResolvedValue({ itens: [pergunta('q', { opcoes: [{ rotulo: 'Sim', resposta: 'Sim.' }] })], total: 1 });
    montar(pendencias());
    await abrir();
    const cartao = await screen.findByTestId('pergunta-em-aberto');
    fireEvent.click(within(cartao).getByRole('button', { name: 'Aceitar sugestão' }));
    await waitFor(() => expect(answerOpenQuestion).toHaveBeenCalledWith('proj-1', 'q', { aceitarSugestao: true }));
  });

  it('quem não é o autor da sessão vê as opções inertes', async () => {
    usuario = 'outro';
    getOpenQuestions.mockResolvedValue({ itens: [pergunta('q', { opcoes: [{ rotulo: 'Sim', resposta: 'Sim.' }] })], total: 1 });
    montar(pendencias());
    await abrir();
    expect(within(await screen.findByTestId('pergunta-em-aberto')).getByTestId('opcao-da-pergunta')).toBeDisabled();
  });
});
