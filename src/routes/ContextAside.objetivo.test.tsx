import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { SessionEvent } from '../lib/api-types';
import { historicoFalso } from '../test/historico-de-eventos';
import i18n from '../lib/i18n';

// AT-950 (e): o Objetivo do painel de contexto é Markdown, não texto cru.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

const brief = {
  id: 'e-brief',
  sessionId: 's1',
  seq: 1,
  type: 'artifact.product_brief',
  actor: { kind: 'agent', id: 'criativo' },
  payload: { summary: 'Agenda de **estúdio**\n\n- reservas\n- cobrança' },
  createdAt: '2026-10-10T12:00:00.000Z',
} as SessionEvent;

vi.mock('../lib/hooks', () => ({ useSessionEventHistory: () => historicoFalso([brief]) }));
vi.mock('../lib/perguntas-em-aberto', () => ({
  usePerguntasEmAberto: () => ({ data: undefined }),
  rolarAteAsPerguntas: () => {},
  abrirPendencias: () => {},
}));
vi.mock('../lib/contexto-da-sessao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/contexto-da-sessao')>()),
  useContextoDaSessaoInteira: () => ({ data: undefined }),
}));

const { ContextAside } = await import('./ContextAside');

describe('ContextAside — Objetivo em Markdown (AT-950)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('pt-BR');
  });

  it('renderiza negrito e lista', () => {
    render(
      <ContextAside projectId="p1" sessionId="s1" actions={[]} pausarPoll={false} logOpen={true} onToggleLog={() => {}} />,
    );
    const secao = screen.getByTestId('aside-objetivo');
    expect(secao.querySelector('strong')).toHaveTextContent('estúdio');
    expect(secao.querySelectorAll('li')).toHaveLength(2);
    expect(secao).not.toHaveTextContent('**');
  });
});
