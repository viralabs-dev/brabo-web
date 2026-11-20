import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../lib/i18n';
import { ProjectSpendTab } from './ProjectSpendTab';
import type { MySpend, WorkspaceSpendReport } from '../lib/spend';

/**
 * A instância REAL do i18next, não uma isolada como em `AccountPage.test.tsx`
 * — `lib/spend.ts` (`rotuloDoAtor`/`tituloDoDia`/`alertaDeOrcamento`) é módulo
 * NÃO-React e resolve texto direto no singleton de `../lib/i18n` (mesmo
 * padrão de `session-kind.ts`), fora do contexto de qualquer
 * `I18nextProvider` local. Uma instância isolada aqui divergiria da língua
 * usada por essas funções, e o texto renderizado ficaria metade num idioma,
 * metade noutro. `changeLanguage('pt-BR')` mantém as asserções abaixo
 * idênticas ao texto que já existia antes da extração.
 */
beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const getMySpend = vi.fn();
const getWorkspaceSpendReport = vi.fn();
const getProject = vi.fn();
const getProjectBudget = vi.fn();
const getCredentialSpend = vi.fn();
const listWorkspaces = vi.fn();
const getProjectSpendTeam = vi.fn();
const setProjectBudget = vi.fn();
const listModelCatalog = vi.fn();
const listSessions = vi.fn();

vi.mock('../lib/api-client', () => ({
  getMySpend: (...a: unknown[]) => getMySpend(...a),
  getWorkspaceSpendReport: (...a: unknown[]) => getWorkspaceSpendReport(...a),
  getProject: (...a: unknown[]) => getProject(...a),
  getProjectBudget: (...a: unknown[]) => getProjectBudget(...a),
  getCredentialSpend: (...a: unknown[]) => getCredentialSpend(...a),
  listWorkspaces: (...a: unknown[]) => listWorkspaces(...a),
  getProjectSpendTeam: (...a: unknown[]) => getProjectSpendTeam(...a),
  setProjectBudget: (...a: unknown[]) => setProjectBudget(...a),
  listModelCatalog: (...a: unknown[]) => listModelCatalog(...a),
  listSessions: (...a: unknown[]) => listSessions(...a),
}));

function serie(dias: number) {
  return Array.from({ length: dias }, (_, i) => ({
    dia: `2026-08-${String(i + 1).padStart(2, '0')}`,
    costMicros: i * 1_000,
    chamadas: i,
  }));
}

const doWorkspace: WorkspaceSpendReport = {
  workspaceId: 'ws-1',
  ownerId: 'u-dono',
  dias: 30,
  totalMicros: 2_500_000,
  inputTokens: 1_000,
  outputTokens: 400,
  chamadas: 42,
  porModelo: [
    {
      chave: 'caro/modelo',
      rotulo: null,
      actorKind: null,
      costMicros: 2_000_000,
      inputTokens: 800,
      outputTokens: 300,
      chamadas: 30,
    },
  ],
  porProjeto: [
    {
      chave: 'p-1',
      rotulo: 'Loja',
      actorKind: null,
      costMicros: 2_500_000,
      inputTokens: 1_000,
      outputTokens: 400,
      chamadas: 42,
    },
  ],
  porProvider: [
    {
      chave: 'anthropic',
      rotulo: null,
      actorKind: null,
      costMicros: 2_500_000,
      inputTokens: 1_000,
      outputTokens: 400,
      chamadas: 42,
    },
  ],
  porAtor: [
    {
      chave: 'criativo',
      rotulo: null,
      actorKind: 'agent',
      costMicros: 2_000_000,
      inputTokens: 800,
      outputTokens: 300,
      chamadas: 30,
    },
    {
      chave: 'a1b2c3d4-0000-0000-0000-000000000000',
      rotulo: null,
      actorKind: 'user',
      costMicros: 500_000,
      inputTokens: 200,
      outputTokens: 100,
      chamadas: 12,
    },
  ],
  porOwner: [
    {
      chave: 'a1b2c3d4-0000-0000-0000-000000000000',
      rotulo: null,
      actorKind: 'user',
      costMicros: 500_000,
      inputTokens: 200,
      outputTokens: 100,
      chamadas: 12,
    },
  ],
  porAgente: [
    {
      chave: 'criativo',
      rotulo: null,
      actorKind: 'agent',
      costMicros: 2_000_000,
      inputTokens: 800,
      outputTokens: 300,
      chamadas: 30,
    },
  ],
  porDia: serie(5),
  porDiaEAgente: [{ dia: '2026-11-11', agente: 'po', costMicros: 5, chamadas: 1 }],
};

const meu: MySpend = {
  projectId: 'p-1',
  dias: 30,
  actorId: 'u-membro',
  totalMicros: 700,
  inputTokens: 10,
  outputTokens: 5,
  chamadas: 1,
  porSessao: [
    {
      chave: 'a1b2c3d4-1111-2222-3333-444455556666',
      rotulo: null,
      actorKind: null,
      costMicros: 700,
      inputTokens: 10,
      outputTokens: 5,
      chamadas: 1,
    },
  ],
  porDia: serie(5),
};

function montar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <ProjectSpendTab projectId="p-1" />
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getProject.mockResolvedValue({ id: 'p-1', workspaceId: 'ws-1' });
  getWorkspaceSpendReport.mockResolvedValue(doWorkspace);
  getMySpend.mockResolvedValue(meu);
  listModelCatalog.mockResolvedValue({});
  listSessions.mockResolvedValue([]);
  getProjectSpendTeam.mockResolvedValue({
    projectId: 'p-1',
    dias: 30,
    totalMicros: 3_000_000,
    inputTokens: 100,
    outputTokens: 50,
    chamadas: 9,
    porAgente: [
      { chave: 'criativo', rotulo: null, actorKind: 'agent', costMicros: 3_000_000, inputTokens: 100, outputTokens: 50, chamadas: 9 },
    ],
    porArea: [
      { chave: 'produto', rotulo: null, actorKind: null, costMicros: 3_000_000, inputTokens: 100, outputTokens: 50, chamadas: 9 },
    ],
  });
  // Sem orçamento por padrão: a maioria dos testes não é sobre o bloco
  // "por projeto" — cada teste dele sobrescreve.
  getProjectBudget.mockResolvedValue(null);
  getCredentialSpend.mockResolvedValue({
    workspaceId: 'ws-1',
    ownerId: 'u-dono',
    meses: 6,
    totalMicros: 0,
    porProvider: [],
  });
});

describe('ProjectSpendTab — enquanto o papel é desconhecido', () => {
  /**
   * Ramificar antes de saber o papel cairia na visão do MEMBRO e dispararia a
   * requisição dela, para depois trocar tudo — um pedido inútil por montagem e
   * um piscar de conteúdo errado.
   */
  it('não escolhe audiência nenhuma, e não pede nada', async () => {
    let liberar: (v: unknown) => void = () => {};
    listWorkspaces.mockReturnValue(
      new Promise((resolve) => {
        liberar = resolve;
      }),
    );

    montar();

    expect(await screen.findByText('Carregando…')).toBeInTheDocument();
    expect(getMySpend).not.toHaveBeenCalled();
    expect(getWorkspaceSpendReport).not.toHaveBeenCalled();
    // O orçamento é de PROJETO, mas só entra depois do papel resolver — senão
    // pediria antes de saber se há algo mais pra mostrar ao lado dele.
    expect(getProjectBudget).not.toHaveBeenCalled();

    liberar([{ id: 'ws-1', role: 'developer' }]);
    expect(await screen.findByText('O meu consumo')).toBeInTheDocument();
  });

  it('papel indisponível vira erro com botão, não a visão errada', async () => {
    listWorkspaces.mockRejectedValue(new Error('429'));

    montar();

    expect(
      await screen.findByText(/Não consegui descobrir o seu papel/i),
    ).toBeInTheDocument();
    expect(getMySpend).not.toHaveBeenCalled();
    expect(getWorkspaceSpendReport).not.toHaveBeenCalled();
  });
});

describe('ProjectSpendTab — a audiência do owner', () => {
  beforeEach(() => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
  });

  it('mostra os cinco recortes do workspace, incluindo provider', async () => {
    montar();

    expect(await screen.findByText('Gastos do projeto')).toBeInTheDocument();
    expect(await screen.findByText('Por modelo')).toBeInTheDocument();
    expect(screen.getByText('Por provider')).toBeInTheDocument();
    // SÓ o projeto (RN-952): recorte por sessão no lugar do por projeto.
    expect(screen.getByText('Por sessão')).toBeInTheDocument();
    expect(screen.queryByText('Por projeto')).not.toBeInTheDocument();
    expect(getWorkspaceSpendReport).toHaveBeenCalledWith('ws-1', 30, 'p-1');
    expect(screen.getByText('Por agente e pessoa')).toBeInTheDocument();
    expect(await screen.findByText(/Gasto por dia/)).toBeInTheDocument();

    expect(screen.getAllByText('caro/modelo')[0]).toBeInTheDocument();
    // RN-211: o rótulo humano do provider, não o slug cru.
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('criativo')).toBeInTheDocument();
    expect(screen.getByText('a1b2c3d4 (pessoa)')).toBeInTheDocument();
  });

  /** A fatura por chave é GLOBAL (página Gastos): a aba do projeto não a traz. */
  it('não traz a seção de credencial, e nunca chama a rota do membro', async () => {
    montar();

    await screen.findByText('Gastos do projeto');
    expect(screen.queryByText('Gasto das suas chaves')).not.toBeInTheDocument();
    expect(getCredentialSpend).not.toHaveBeenCalled();
    expect(getMySpend).not.toHaveBeenCalled();
    expect(getProjectSpendTeam).not.toHaveBeenCalled();
  });

  it('modelo de assinatura sem preço aparece "assinatura — sem preço registrado", nunca US$ 0', async () => {
    getWorkspaceSpendReport.mockResolvedValue({
      ...doWorkspace,
      porModelo: [
        { chave: 'cc/claude', rotulo: null, actorKind: null, costMicros: 0, inputTokens: 5, outputTokens: 5, chamadas: 2 },
      ],
    });
    listModelCatalog.mockResolvedValue({
      chat: { '9router': [{ name: 'cc/claude', billing: 'subscription' }] },
    });
    montar();

    expect(await screen.findByText('assinatura — sem preço registrado')).toBeInTheDocument();
  });
});

describe('ProjectSpendTab — a audiência do membro', () => {
  beforeEach(() => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
  });

  /**
   * O membro não pede a rota de owner nem a de credencial: pedir um 403 de
   * propósito é ruído no log de segurança, e a tela sabe que não é para ele.
   */
  it('mostra só o próprio consumo, sem provider e sem tocar a rota do owner', async () => {
    montar();

    expect(await screen.findByText('O meu consumo')).toBeInTheDocument();
    expect(await screen.findByText('Por sessão')).toBeInTheDocument();
    expect(screen.getByText('#a1b2c3d4')).toBeInTheDocument();
    // ADR 0233: o total do projeto e o custo por agente e por área.
    expect(await screen.findByText('Por agente')).toBeInTheDocument();
    expect(screen.getByText('Por área')).toBeInTheDocument();
    expect(getProjectSpendTeam).toHaveBeenCalledWith('p-1', 30);

    expect(getWorkspaceSpendReport).not.toHaveBeenCalled();
    expect(getCredentialSpend).not.toHaveBeenCalled();
    expect(screen.queryByText('Por provider')).not.toBeInTheDocument();
    expect(screen.getByText('Por modelo')).toBeInTheDocument(); // RN-1152: modelo sim, provider nunca
    expect(screen.queryByText('Gasto das suas chaves')).not.toBeInTheDocument();
    expect(getMySpend).toHaveBeenCalledWith('p-1', 30);
  });

  it('mantém a janela e o estimado visíveis; o porquê abre no "?"', async () => {
    montar();

    expect(await screen.findByText(/consumiu neste projeto, em custo/i)).toBeInTheDocument();
    expect(screen.queryByText(/quem paga a chamada é a chave do dono/i)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Ajuda: O meu consumo/i }));
    expect(await screen.findByText(/quem paga a chamada é a chave do dono/i)).toBeInTheDocument();
    expect(await screen.findByText(/não há quebra por provider nem por credencial/i)).toBeInTheDocument();
  });

  /** RN-088: carregando, erro e vazio são três estados, e o erro vem antes. */
  it('erro tem mensagem e botão, e não cai no vazio', async () => {
    getMySpend.mockRejectedValue(new Error('429'));
    montar();

    expect(
      await screen.findByText(/Não consegui carregar o seu consumo agora/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Por sessão')).not.toBeInTheDocument();
  });

  it('sem consumo, explica de quem é a conta em vez de mostrar zero mudo', async () => {
    getMySpend.mockResolvedValue({
      ...meu,
      totalMicros: 0,
      chamadas: 0,
      porSessao: [],
    });
    montar();

    expect(
      await screen.findByText(/sai da chave do dono do workspace/i),
    ).toBeInTheDocument();
  });
});

/**
 * O bloco "por projeto" (RN-212) e o alerta de custo (RN-213). É de PROJETO,
 * não de audiência — os testes cobrem só a audiência do owner (papel mais
 * simples de montar), mas o bloco é o MESMO componente para as duas.
 */
describe('ProjectSpendTab — o orçamento do projeto', () => {
  beforeEach(() => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
  });

  it('sem orçamento definido, mostra a nota em vez do medidor', async () => {
    getProjectBudget.mockResolvedValue(null);
    montar();

    expect(await screen.findByText('Sem teto do mês')).toBeInTheDocument();
    expect(screen.queryByTestId('token-meter')).not.toBeInTheDocument();
    expect(screen.queryByText('Não configurado')).not.toBeInTheDocument();
    // O formulário só abre com "Definir", dentro do próprio cartão (sem Popover).
    expect(screen.queryByLabelText(/Teto em US\$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Definir' }));
    expect(await screen.findByLabelText(/Teto em US\$/)).toBeInTheDocument();
    expect(document.getElementById('teto')?.contains(screen.getByLabelText(/Teto em US\$/))).toBe(true);
  });

  it('com orçamento abaixo de 70%, mostra o medidor sem alerta', async () => {
    getProjectBudget.mockResolvedValue({
      id: 'b-1',
      projectId: 'p-1',
      sessionId: null,
      limitMicros: 10_000_000,
      spentMicros: 2_000_000,
      policy: 'allow',
      lastThresholdNotified: 0,
    });
    montar();

    expect(await screen.findByTestId('token-meter')).toBeInTheDocument();
    expect(
      screen.queryByText(/já passou de/i),
    ).not.toBeInTheDocument();
  });

  it('mostra dias restantes, previsão e a virada do mês (RN-1200)', async () => {
    getProjectBudget.mockResolvedValue({
      id: 'b-1',
      projectId: 'p-1',
      sessionId: null,
      limitMicros: 10_000_000,
      spentMicros: 2_000_000,
      policy: 'allow',
      lastThresholdNotified: 0,
      periodo: { inicio: '2026-11-01', fim: '2026-12-01', diasRestantes: 18, previsaoMicros: 5_000_000 },
    });
    montar();

    const texto = await screen.findByTestId('periodo-do-teto');
    expect(texto).toHaveTextContent(/18 dias restantes/);
    // AT-1005: o cartão fechado resume numa linha; a frase inteira vai no `title`.
    expect(texto).toHaveTextContent(/Previsão US\$\s5,00 · o mês vira/);
    expect(texto.title).toMatch(/Previsão no fim do mês/);
    expect(texto.title).toMatch(/00:00 UTC/);
    expect(texto.textContent).not.toMatch(/\n/);
  });

  /** RN-213: leitura pura de `lastThresholdNotified`, nunca recalculado aqui. */
  it('cruzou 90%, mostra o alerta de nível danger', async () => {
    getProjectBudget.mockResolvedValue({
      id: 'b-1',
      projectId: 'p-1',
      sessionId: null,
      limitMicros: 10_000_000,
      spentMicros: 9_200_000,
      policy: 'allow',
      lastThresholdNotified: 90,
    });
    montar();

    const alerta = await screen.findByText(/já passou de 90%/i);
    expect(alerta.closest('[role="alert"]')).not.toBeNull();
  });

  it('política block e teto atingido, avisa que novas chamadas estão bloqueadas', async () => {
    getProjectBudget.mockResolvedValue({
      id: 'b-1',
      projectId: 'p-1',
      sessionId: null,
      limitMicros: 10_000_000,
      spentMicros: 10_000_000,
      policy: 'block',
      lastThresholdNotified: 100,
    });
    montar();

    expect(
      await screen.findByText(/estão BLOQUEADAS até o teto subir ou o mês virar/i),
    ).toBeInTheDocument();
  });

  /** 403 (quem não é maintainer no projeto) fica silencioso — nunca banner. */
  it('erro ao ler o orçamento não vira banner nenhum', async () => {
    getProjectBudget.mockRejectedValue(new Error('403'));
    montar();

    await screen.findByText('Gastos do projeto');
    expect(
      screen.queryByText(/Nenhum orçamento definido/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('token-meter')).not.toBeInTheDocument();
  });
});

/** O cartão do teto é compacto: o formulário abre dentro dele com "Definir"/"Editar". */
async function abrirOEditor() {
  fireEvent.click(await screen.findByRole('button', { name: /^(Definir|Editar)$/ }));
}

describe('ProjectSpendTab — o editor do orçamento', () => {
  it('maintainer+ grava o teto (PUT) e a política escolhida', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    setProjectBudget.mockResolvedValue({});
    montar();

    await abrirOEditor();
    const campo = await screen.findByLabelText(/Teto em US\$/);
    fireEvent.change(campo, { target: { value: '12,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));

    await waitFor(() =>
      expect(setProjectBudget).toHaveBeenCalledWith('p-1', { limitUsd: 12.5, policy: 'block' }),
    );
    expect(await screen.findByText('Orçamento salvo.')).toBeInTheDocument();
  });

  it('teto inválido não chama a api', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    montar();

    await abrirOEditor();
    await screen.findByLabelText(/Teto em US\$/);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));

    expect(await screen.findByText('Informe um teto maior que zero.')).toBeInTheDocument();
    expect(setProjectBudget).not.toHaveBeenCalled();
  });

  it('abaixo de maintainer o controle fica inerte e o motivo é dito em texto', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
    montar();

    expect(await screen.findByText(/exige o papel de maintainer/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Definir' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Teto em US\$/)).not.toBeInTheDocument();
  });

  it('o Salvar do teto é irmão do select no mesmo grupo', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    montar();
    await abrirOEditor();
    const salvar = await screen.findByRole('button', { name: 'Salvar teto' });
    const select = screen.getByRole('combobox', { name: /Ao atingir/i });
    expect(salvar.closest('form')).not.toBeNull();
    expect(salvar.parentElement?.parentElement).toBe(select.closest('[data-slot="field"]')?.parentElement);
  });
});

// AT-973 (RN-1450 a RN-1452): quatro indicadores, o período real e a sessão pelo nome.
describe('ProjectSpendTab — os Gastos da v11 (AT-973)', () => {
  /** 30 dias densos com gasto só nos últimos 5: o projeto tem 5 dias de vida. */
  const jovem = (): WorkspaceSpendReport => ({
    ...doWorkspace,
    totalMicros: 12_000,
    chamadas: 10,
    inputTokens: 41_000_000,
    outputTokens: 100_000,
    porDia: Array.from({ length: 30 }, (_, i) => ({
      dia: `2026-10-${String(i + 1).padStart(2, '0')}`,
      costMicros: i >= 25 ? 2_400 : 0,
      chamadas: i >= 25 ? 2 : 0,
    })),
  });

  beforeEach(() => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getWorkspaceSpendReport.mockResolvedValue(jovem());
  });

  it('mostra quatro indicadores: total, chamadas, tokens abreviados e custo médio com 4 casas', async () => {
    montar();
    const tokens = await screen.findByText(/mi$/);
    expect(tokens).toHaveAttribute('title', '41.100.000');
    expect(screen.getByText('Chamadas')).toBeInTheDocument();
    expect(screen.getByText('Custo médio por chamada')).toBeInTheDocument();
    expect(screen.getByText('US$ 0,0012')).toBeInTheDocument();
  });

  it('abre em "Desde o início · 5 dias" quando o primeiro gasto tem menos de 30 dias', async () => {
    montar();
    const opcao = await screen.findByRole('button', { name: 'Desde o início · 5 dias' });
    expect(opcao).toHaveAttribute('aria-pressed', 'true');
    expect(getWorkspaceSpendReport).toHaveBeenCalledWith('ws-1', 30, 'p-1');
  });

  it('o teto vive nos Gastos e a âncora #teto rola até o cartão', async () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    window.history.replaceState(null, '', '/?tab=spend#teto');
    montar();
    await screen.findByText('Sem teto do mês');
    const cartao = document.getElementById('teto');
    expect(cartao).not.toBeNull();
    expect(rolar.mock.contexts).toContain(cartao);
    expect(screen.getByRole('button', { name: 'Definir' })).toBeInTheDocument();
    window.history.replaceState(null, '', '/');
  });

  it('o ranking por sessão diz o nome (ou o tipo) antes da hashtag', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
    listSessions.mockResolvedValue([
      { id: 'a1b2c3d4-1111-2222-3333-444455556666', name: 'Agenda de estúdio', kind: 'criativa' },
    ]);
    montar();
    expect(await screen.findByText('Agenda de estúdio · #a1b2c3d4')).toBeInTheDocument();
  });
});

// Ajustes da prévia (PR #133): cartão compacto, medidor sem BRL, vazio em uma linha, tokens do membro.
describe('ProjectSpendTab — ajustes da prévia (AT-973)', () => {
  it('com teto, o cartão é compacto: valor e barra, "Editar" abre o formulário no próprio cartão', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getProjectBudget.mockResolvedValue({
      id: 'b-1',
      limitMicros: 40_000_000,
      spentMicros: 22_000_000,
      policy: 'block',
      periodo: null,
    });
    montar();
    const meter = await screen.findByTestId('token-meter');
    // Sem os marcadores 90%/100% colados e sem a linha "R$ 0,00 · US$ …".
    expect(meter.textContent).not.toMatch(/R\$\s?0,00/);
    expect(meter.textContent).not.toContain('100%100%');
    expect(screen.queryByLabelText(/Teto em US\$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(await screen.findByLabelText(/Teto em US\$/)).toHaveValue('40');
    expect(document.getElementById('teto')?.contains(screen.getByLabelText(/Teto em US\$/))).toBe(true);
  });

  it('sem gasto na janela, "Onde foi o gasto" é uma linha e o gráfico diz a janela', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getWorkspaceSpendReport.mockResolvedValue({
      ...doWorkspace,
      totalMicros: 0,
      chamadas: 0,
      inputTokens: 0,
      outputTokens: 0,
      porModelo: [],
      porProvider: [],
      porProjeto: [],
      porAtor: [],
      porOwner: [],
      porAgente: [],
      porSessao: [],
      porDia: Array.from({ length: 30 }, (_, i) => ({ dia: `2026-10-${String(i + 1).padStart(2, '0')}`, costMicros: 0, chamadas: 0 })),
      porDiaEAgente: [],
    });
    montar();
    expect(await screen.findByText('Onde foi o gasto: nenhum gasto nesta janela.')).toBeInTheDocument();
    expect(screen.queryByText('Por modelo')).not.toBeInTheDocument();
    expect(screen.queryByText('Por provider')).not.toBeInTheDocument();
    expect(await screen.findByText('Nenhum gasto nos últimos 30 dias.')).toBeInTheDocument();
  });

  it('"O meu consumo" do membro abrevia os tokens como os indicadores, com o inteiro no title', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
    getMySpend.mockResolvedValue({ ...meu, inputTokens: 50_000_000, outputTokens: 400_000 });
    montar();
    await screen.findByText('O meu consumo');
    const abreviados = await screen.findAllByText(/mi$/);
    expect(abreviados.some((e) => e.getAttribute('title') === '50.400.000')).toBe(true);
  });
});

// As sobras da v11 (AT-1005, L08): gráfico ao lado do teto, segunda linha dos indicadores, tokens do membro, link.
describe('ProjectSpendTab — as sobras da v11 (AT-1005)', () => {
  const jovem = (): WorkspaceSpendReport => ({
    ...doWorkspace,
    porDia: Array.from({ length: 30 }, (_, i) => ({
      dia: `2026-10-${String(i + 1).padStart(2, '0')}`,
      costMicros: i >= 25 ? 2_400 : 0,
      chamadas: i >= 25 ? 2 : 0,
    })),
  });

  it('owner: o gráfico por dia e o cartão #teto dividem a mesma faixa, depois dos indicadores', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getWorkspaceSpendReport.mockResolvedValue(jovem());
    montar();
    await screen.findByText('desde 26/10');
    await screen.findByText('Sem teto do mês');
    const cartao = document.getElementById('teto')!;
    const faixa = cartao.parentElement!;
    const indicadores = document.querySelector('[data-slot="section-cards"]')!;
    expect(faixa.contains(indicadores)).toBe(false);
    expect(faixa.contains(await screen.findByText(/^Gasto por dia/))).toBe(true);
    expect(indicadores.compareDocumentPosition(faixa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Total diz "desde" o primeiro dia com gasto e Chamadas diz o modelo e a fatia, lidos do relatório', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getWorkspaceSpendReport.mockResolvedValue(jovem());
    montar();
    expect(await screen.findByText('desde 26/10')).toBeInTheDocument();
    expect(screen.getByText('caro/modelo em 71%')).toBeInTheDocument();
  });

  it('sem leitura por modelo, Chamadas fica sem nota (a tela não afirma o que não leu)', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'owner' }]);
    getWorkspaceSpendReport.mockResolvedValue({ ...jovem(), porModelo: [] });
    montar();
    await screen.findByText('desde 26/10');
    expect(screen.queryByText(/ em \d+%$/)).not.toBeInTheDocument();
  });

  it('membro: nenhum número de tokens com mais de 6 dígitos fica visível (o inteiro vai no title)', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
    getMySpend.mockResolvedValue({ ...meu, inputTokens: 50_000_000, outputTokens: 400_000 });
    montar();
    await screen.findByText('O meu consumo');
    await screen.findAllByText(/mi$/);
    // O gráfico (`figure`, AT-1004) fica de fora; indicadores e rankings não mostram o inteiro.
    const corpo = document.body.cloneNode(true) as HTMLElement;
    corpo.querySelectorAll('figure').forEach((f) => f.remove());
    expect(corpo.textContent).not.toMatch(/\d{1,3}(\.\d{3}){2,}/);
    expect(document.querySelector('[title="50.000.000 entrada · 400.000 saída"]')).not.toBeNull();
  });

  it('"Ver os N agentes" é um link à esquerda, não o botão neutro centralizado', async () => {
    listWorkspaces.mockResolvedValue([{ id: 'ws-1', role: 'developer' }]);
    const agente = (chave: string) => ({
      chave, rotulo: null, actorKind: 'agent', costMicros: 1_000, inputTokens: 1, outputTokens: 1, chamadas: 1,
    });
    getProjectSpendTeam.mockResolvedValue({
      projectId: 'p-1', dias: 30, totalMicros: 4_000, inputTokens: 4, outputTokens: 4, chamadas: 4,
      porAgente: ['po', 'dev', 'qa', 'infra'].map(agente), porArea: [],
    });
    montar();
    const ver = await screen.findByRole('button', { name: 'Ver os 4 agentes' });
    expect(ver).not.toHaveAttribute('data-slot', 'button');
    expect(ver.className).toMatch(/link/);
  });
});
