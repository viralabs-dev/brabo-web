import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { ProjectPage } from './ProjectPage';
import { AbasDoProjeto } from './AbasDoProjeto';
import { itensDasAbas } from './AbasDoProjeto.helpers';
import {
  pedirAba,
  useAbaPublicada,
  useContagensDoProjeto,
} from '../lib/contagens-do-projeto';
// A instância REAL do app (não uma isolada): `project-tabs.ts` (não-React)
// resolve `label` chamando `i18n.t(...)` direto no singleton global de
// `lib/i18n.ts` (mesmo padrão de `ProjectExecutorsTab.test.tsx`), então uma
// instância isolada aqui não alcançaria essas chamadas. As asserções abaixo
// checam o texto ATUAL em português, que é o que já estava hardcoded antes
// da extração.
import i18n from '../lib/i18n';
import {
  ABAS_DO_PROJETO,
  CHAVES_DE_ABA,
  SECOES_DO_PROJETO,
  secaoDaChave,
  abaPorChave,
  ehChaveDeAba,
  resolverChaveDeAba,
} from './project-tabs';
import type { Project } from '../lib/api-types';

const getProject = vi.fn();
const getRepository = vi.fn();
const getProjectBudget = vi.fn();

vi.mock('../lib/api-client', async () => {
  // `ApiError`/`mensagemDaApi` reais pelo mesmo motivo de `ProjectPage.test.tsx`:
  // dublê deles provaria só que o componente chama uma função.
  const real =
    await vi.importActual<typeof import('../lib/api-client')>('../lib/api-client');
  return {
    // O controle de roteamento (ADR 0166) renderiza dentro de Configurações:
    // nenhum provider com a capability, o estado de produção hoje.
    listProviderCapabilities: () => Promise.resolve([]),
    ApiError: real.ApiError,
    mensagemDaApi: real.mensagemDaApi,
    getProject: (...args: unknown[]) => getProject(...args),
    getRepository: (...args: unknown[]) => getRepository(...args),
    getProjectBudget: (...args: unknown[]) => getProjectBudget(...args),
  };
});

const useBacklog = vi.fn(() => ({ data: [] as unknown[] }));
const useHypotheses = vi.fn(() => ({ data: [] as unknown[] }));
// AT-297 (RN-638): o contador de Aprovações e o de PRs saem da MESMA fila de
// pendentes do PROJETO — não mais da sessão mais recente.
const useProjectPendingActions = vi.fn(() => ({ data: undefined as unknown }));
// `useArchitecture` (Onda 3) e `useProjectPendingActions` (Onda 2) — as duas
// contagens novas que `ProjectPage.tsx` lê pra `arquiteturaPendente`/
// `prsPendentes`. O que este arquivo prova é a moldura de abas, não o
// número em si (isso é `ProjectPage.test.tsx`/os testes de cada onda), daí
// os dois ficarem em `undefined` fixo — sem `vi.fn()` próprio, ninguém aqui
// varia o retorno.
vi.mock('../lib/hooks', () => ({
  useBacklog: () => useBacklog(),
  useHypotheses: () => useHypotheses(),
  useLatestSession: () => ({ latest: undefined }),
  useArchitecture: () => ({ data: undefined }),
  useProjectPendingActions: () => useProjectPendingActions(),
}));

// Cada painel vira uma frase única. É o que permite afirmar QUAL aba
// renderizou — o que uma cadeia de `&&` incompleta não conseguiria fazer.
vi.mock('./ProjectOverviewTab', () => ({
  ProjectOverviewTab: () => <div>painel de overview</div>,
}));
vi.mock('./ProjectSessionsTab', () => ({
  // AT-893: as três sub-abas de Sessões vêm do mesmo módulo.
  ProjectCriativoTab: () => <div>painel de criativo</div>,
  ProjectTodasTab: () => <div>painel de todas</div>,
  ProjectChatTab: () => <div>painel de chat</div>,
}));
vi.mock('./ProjectCodeTab', () => ({
  ProjectCodeTab: () => <div>painel de code</div>,
}));
vi.mock('./ProjectPrsTab', () => ({
  ProjectPrsTab: () => <div>painel de prs</div>,
}));
vi.mock('./ProjectArchitectureTab', () => ({
  ProjectArchitectureTab: () => <div>painel de arquitetura</div>,
}));
vi.mock('./ProjectExecutorsTab', () => ({
  ProjectExecutorsTab: () => <div>painel de executores</div>,
}));
vi.mock('./ProjectApprovalsTab', () => ({
  ProjectApprovalsTab: () => <div>painel de approvals</div>,
}));
vi.mock('./ProjectBacklogTab', () => ({
  ProjectBacklogTab: () => <div>painel de backlog</div>,
  aguardandoPromocao: (itens: unknown[] | undefined) => itens ?? [],
}));
vi.mock('./ProjectInsightsTab', () => ({
  ProjectInsightsTab: () => <div>painel de insights</div>,
}));
vi.mock('./ProjectSpendTab', () => ({
  ProjectSpendTab: () => <div>painel de spend</div>,
}));
vi.mock('./ProjectSettingsTab', () => ({
  ProjectSettingsTab: () => <div>painel de settings</div>,
}));

const PROJETO: Project = {
  id: 'proj-1',
  workspaceId: 'ws-1',
  name: 'Checkout',
  slug: 'checkout',
  createdBy: 'user-1',
  maxConsecutiveBlocked: null,
  storyPromotion: 'manual',
  executionMode: 'container',
  workspacePath: null,
  workspaceVerifiedAt: null,
  mirrorPath: null,
  language: 'pt-BR',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

/**
 * A lista do projeto como a sidebar a monta (ADR 0211): mesmas contagens
 * (o hook da moldura), a aba ativa que a moldura publica, e o clique pedido
 * à moldura. O `Shell` inteiro tem o próprio teste (`Shell.test.tsx`).
 */
function AbasDaSidebar() {
  const publicada = useAbaPublicada();
  const { contagens } = useContagensDoProjeto('proj-1');
  return (
    <AbasDoProjeto
      projectId="proj-1"
      nomeDoProjeto="Checkout"
      itens={itensDasAbas(contagens)}
      active={publicada?.tab}
      onChange={(tab) => pedirAba({ projectId: 'proj-1', tab })}
    />
  );
}

function montar(initialTab?: Parameters<typeof ProjectPage>[0]['initialTab']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AbasDaSidebar />
      <ProjectPage projectId="proj-1" initialTab={initialTab} />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('pt-BR');
  getProject.mockResolvedValue(PROJETO);
  getRepository.mockResolvedValue(null);
  getProjectBudget.mockResolvedValue(null);
  useBacklog.mockReturnValue({ data: [] });
  useHypotheses.mockReturnValue({ data: [] });
  useProjectPendingActions.mockReturnValue({ data: undefined });
});

// Restaura o default do app depois deste arquivo — a instância é o
// singleton REAL (`../lib/i18n`), então deixar em `pt-BR` vazaria para
// qualquer teste seguinte que compartilhe o mesmo registro de módulos.
afterAll(() => {
  void i18n.changeLanguage('en');
});

/**
 * O defeito real: a lista de abas do projeto existia em QUATRO lugares que não
 * se enxergavam — `PROJECT_TABS` no `router.tsx` (que valida o deep-link
 * `?tab=`), o `type TabKey`, o array passado à régua e a cadeia de `&&` que
 * renderiza, os três últimos no `ProjectPage.tsx`.
 *
 * Nada disso quebra compilação quando diverge, e é essa a armadilha: aceitar
 * `?tab=x` e ter painel para `x` eram decisões independentes. Uma chave só no
 * router abre o projeto numa aba EM BRANCO; uma chave só no `ProjectPage` faz
 * o deep-link cair silenciosamente na Visão geral.
 *
 * Estes testes varrem o registro — não uma lista escrita aqui. Uma aba nova
 * entra automaticamente em todas as asserções, e se qualquer um dos quatro
 * pontos parar de derivar do registro, um deles morre.
 */
describe('abas do projeto derivam de um registro só', () => {
  // `.map(aba => aba.key)`, NUNCA `.label` aqui: `it.each` avalia este array
  // na COLETA do teste, antes de qualquer `beforeEach` rodar — `.label` é
  // getter sobre `i18n.t()` (RN-432), e capturá-lo agora prenderia o idioma
  // que o singleton tinha ANTES de `changeLanguage('pt-BR')`. O rótulo certo
  // só existe depois, dentro do corpo do teste.
  it.each(ABAS_DO_PROJETO.map((aba) => aba.key))(
    'a aba %s tem seção na sidebar E painel que renderiza',
    async (key) => {
      // Ponto 3: a sidebar tem o item da SEÇÃO da aba (ADR 0294); âncora
      // no regex para "Chat"/"Código" não baterem por substring.
      const label = secaoDaChave(key as never).label;
      montar(key as never);
      const escapado = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(
        await screen.findByRole('tab', { name: new RegExp(`^${escapado}\\s*\\d*$`) }),
      ).toBeInTheDocument();
      // Ponto 4: o render. Uma cadeia de `&&` sem esta chave mostraria o
      // cabeçalho do projeto e um corpo vazio. `findBy` porque o painel é um
      // chunk carregado sob demanda (AT-300) e chega depois do trilho.
      expect(await screen.findByText(`painel de ${key}`)).toBeInTheDocument();
    },
  );

  // ADR 0126: este caso afirmava o contrário — que a régua mostrava só os 6
  // itens de TOPO (`['Visão geral','Agentes','Dev','Documentação','Gastos',
  // 'Configurações']`), com as filhas escondidas até o grupo ser escolhido.
  // Essa era a garantia da régua horizontal de dois níveis (`GroupedTabs`,
  // removida na mesma mudança); o trilho vertical existe justamente para
  // deixar os TRÊS grupos abertos ao mesmo tempo. A asserção continua sendo
  // sobre a ORDEM DECLARADA que sai do registro — só que agora achatada, com
  // os cabeçalhos de grupo pontuando a lista sem serem selecionáveis.
  it('a sidebar mostra as 8 seções, na ordem declarada', async () => {
    montar();
    const botoes = await screen.findAllByRole('tab');
    const sidebar = botoes.filter((b) => b.getAttribute('href'));
    expect(sidebar.map((b) => b.textContent)).toEqual([
      'Visão geral',
      'Sessões',
      'Trabalho',
      'Código',
      'Decisões',
      'Arquitetura',
      'Gastos',
      'Configurações',
    ]);
  });

  it('toda chave do registro é aceita pelo guarda do deep-link', () => {
    // Ponto 1: é este guarda que o `validateSearch` do router usa. Se ele
    // voltasse a ter lista própria, uma aba nova cairia na Visão geral.
    for (const chave of CHAVES_DE_ABA) {
      expect(ehChaveDeAba(chave)).toBe(true);
    }
    expect(CHAVES_DE_ABA).toHaveLength(ABAS_DO_PROJETO.length);
  });

  it('chave desconhecida NÃO é aceita e cai na aba padrão', () => {
    // O caso de falha do deep-link: uma chave que nunca existiu, ou um link
    // velho de uma aba que saiu do registro. Nada de tela em branco — volta
    // para a Visão geral.
    expect(ehChaveDeAba('nao-existe')).toBe(false);
    expect(ehChaveDeAba(undefined)).toBe(false);
    expect(ehChaveDeAba(42)).toBe(false);
    expect(abaPorChave('nao-existe').key).toBe('overview');
    expect(abaPorChave(undefined).key).toBe('overview');
  });

  it('ordem é única — duas abas no mesmo lugar seria régua instável', () => {
    const ordens = ABAS_DO_PROJETO.map((aba) => aba.ordem);
    expect(new Set(ordens).size).toBe(ordens.length);
    expect([...ordens].sort((a, b) => a - b)).toEqual(ordens);
  });

  it('a faixa de sub-abas mostra o selo de CADA fila, e a sidebar só o ponto de Decisões', async () => {
    useProjectPendingActions.mockReturnValue({
      data: [{ status: 'pending', actionType: 'terminal', actor: { kind: 'user' } }],
    });
    useHypotheses.mockReturnValue({ data: [{ status: 'proposed' }] });
    useBacklog.mockReturnValue({ data: [] });

    montar('approvals' as never);

    // Cada fila no seu número, lado a lado, na faixa da seção Decisões.
    expect(await screen.findByRole('tab', { name: /^Aprovações\s*1$/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Hipóteses\s*1$/ })).toBeInTheDocument();
    // E o item da seção na sidebar não soma: é só o nome.
    expect(screen.getByRole('tab', { name: 'Decisões' }).textContent).toBe('Decisões');
  });

  /**
   * PROGRAMA de abas agrupadas — Onda 1. O handoff do PROGRAMA 28 previa 7
   * abas; este registro tem mais. As nascidas depois do handoff —
   * `executores`, `backlog`, `insights` — continuam aqui (RN-203, ADR
   * 0078): o handoff é referência de fidelidade visual, não teto de
   * produto. `chat` é a fusão desta onda (substitui `sessions` e `rag`,
   * que saíram do registro); `prs`/`arquitetura` são placeholder das
   * Ondas 2/3.
   */
  it('as abas que o handoff não previu continuam no registro, e a fusão Chat/RAG tirou uma chave', () => {
    expect(ABAS_DO_PROJETO).toHaveLength(13);
    const chaves = ABAS_DO_PROJETO.map((aba) => aba.key);
    expect(chaves).toEqual(
      expect.arrayContaining([
        'executores',
        'backlog',
        'insights',
        'chat',
        'prs',
        'arquitetura',
      ]),
    );
    // `sessions` e `rag` não são mais chaves de registro — viraram alias
    // (ver testes de `resolverChaveDeAba` abaixo) e segmento interno do
    // `ProjectChatShell`, respectivamente.
    expect(ehChaveDeAba('sessions')).toBe(false);
    expect(ehChaveDeAba('rag')).toBe(false);
  });

  it('a aba `chat` é a sub-aba "Conversa" da seção Sessões — nunca "Chat RAG"', async () => {
    montar('chat' as never);

    expect(await screen.findByRole('tab', { name: 'Conversa' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ideação' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Chat RAG' })).toBeNull();
  });

  describe('resolverChaveDeAba — os 15 deep-links de hoje, mais as chaves de seção', () => {
    const ESPERADO: Record<string, [string, string]> = {
      overview: ['overview', 'overview'],
      executores: ['trabalho', 'executores'],
      criativo: ['sessoes', 'criativo'],
      chat: ['sessoes', 'chat'],
      insights: ['decisoes', 'insights'],
      code: ['codigo', 'code'],
      prs: ['codigo', 'prs'],
      approvals: ['decisoes', 'approvals'],
      backlog: ['trabalho', 'backlog'],
      arquitetura: ['arquitetura', 'arquitetura'],
      spend: ['spend', 'spend'],
      settings: ['settings', 'settings'],
      sessions: ['sessoes', 'chat'],
      rag: ['sessoes', 'todas'],
      todas: ['sessoes', 'todas'],
      historias: ['trabalho', 'backlog'],
      // chave de seção abre a primeira sub-aba
      sessoes: ['sessoes', 'todas'],
      trabalho: ['trabalho', 'backlog'],
      codigo: ['codigo', 'code'],
      decisoes: ['decisoes', 'approvals'],
    };
    it.each(Object.entries(ESPERADO))('`%s` resolve para %j', (chave, [secao, sub]) => {
      expect(resolverChaveDeAba(chave)).toEqual({ secao, sub });
    });

    it('chave desconhecida (ou não-string) devolve undefined', () => {
      expect(resolverChaveDeAba('nao-existe')).toBeUndefined();
      expect(resolverChaveDeAba(undefined)).toBeUndefined();
      expect(resolverChaveDeAba(42)).toBeUndefined();
    });
  });

  describe('SECOES_DO_PROJETO — as oito seções', () => {
    it('são 8, e toda ChaveDeAba pertence a exatamente uma sub-aba de uma seção', () => {
      expect(SECOES_DO_PROJETO).toHaveLength(8);
      const vistas = SECOES_DO_PROJETO.flatMap((s) => [...s.subs]);
      expect(new Set(vistas).size).toBe(vistas.length);
      expect(new Set(vistas)).toEqual(new Set(CHAVES_DE_ABA));
    });

    it('a seção de cada aba bate com o campo `secao` do registro', () => {
      for (const aba of ABAS_DO_PROJETO) {
        expect(secaoDaChave(aba.key as never).chave).toBe(aba.secao);
      }
    });
  });
});
