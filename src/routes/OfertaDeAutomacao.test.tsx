import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../lib/i18n';
import type { SessionEvent } from '../lib/api-types';

const responderAutomacao = vi.fn();

vi.mock('../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api-client')>()),
  responderAutomacao: (...a: unknown[]) => responderAutomacao(...a),
}));
vi.mock('../components/ui/ToastProvider.helpers', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const { OfertaDeAutomacao } = await import('./OfertaDeAutomacao');
const { montarTimeline } = await import('./session-timeline-montagem');

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});
afterAll(() => {
  void i18n.changeLanguage('en');
});
beforeEach(() => vi.clearAllMocks());

const payload = { categoria: 'aprovacao', chave: 'git_commit@dev', escopo: 'projeto', n: 3 };

describe('OfertaDeAutomacao (RN-1442)', () => {
  it('mostra os dois botões e aceitar chama o POST', async () => {
    responderAutomacao.mockResolvedValue([]);
    render(<OfertaDeAutomacao projectId="p1" payload={payload} resposta="pendente" podeResponder />);
    expect(screen.getByTestId('oferta-de-automacao').textContent).toContain('3 vezes seguidas');
    fireEvent.click(screen.getByRole('button', { name: /Fazer sozinho daqui em diante/ }));
    await waitFor(() =>
      expect(responderAutomacao).toHaveBeenCalledWith('p1', {
        categoria: 'aprovacao', chave: 'git_commit@dev', escopo: 'projeto', decisao: 'aceitar',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Não, continue perguntando/ }));
    await waitFor(() => expect(responderAutomacao).toHaveBeenLastCalledWith('p1', expect.objectContaining({ decisao: 'recusar' })));
  });

  it('o "dá para desfazer" é link para a seção das regras, montado na web', () => {
    render(<OfertaDeAutomacao projectId="p1" payload={{ ...payload, comoDesfazer: 'DELETE /x' } as never} resposta="pendente" podeResponder />);
    const link = screen.getByTestId('oferta-de-automacao-desfazer');
    expect(link.getAttribute('href')).toBe('/projects/p1?tab=settings&group=projeto&section=regras-de-oferta');
    expect(screen.getByTestId('oferta-de-automacao').textContent).not.toContain('DELETE');
  });

  it('respondida some com os botões e diz o desfecho', () => {
    render(<OfertaDeAutomacao projectId="p1" payload={payload} resposta="recusada" podeResponder />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTestId('oferta-de-automacao-resposta').textContent).toMatch(/continuo perguntando/);
  });

  it('sem o papel os botões ficam inertes com o motivo', () => {
    render(<OfertaDeAutomacao projectId="p1" payload={payload} resposta="pendente" podeResponder={false} />);
    expect(screen.getByRole('button', { name: /Não, continue perguntando/ })).toBeDisabled();
    expect(screen.getByText(/maintainer/)).toBeTruthy();
  });
});

describe('a timeline mostra a automação (RN-1442, RN-1444)', () => {
  const ev = (seq: number, type: string, p: object) =>
    ({ id: `e${seq}`, seq, type, actor: { kind: 'system', id: 'automacao-oferta' }, payload: p, createdAt: '2026-11-19T12:00:00.000Z' }) as unknown as SessionEvent;

  function montar(events: SessionEvent[]) {
    const nada = vi.fn();
    const ctx = {
      events, actions: [], backlogQuery: { data: undefined }, projectId: 'p1', sessionId: 's1',
      t: i18n.getFixedT('pt-BR', 'sessionPage'), autoria: { meuId: null, meuEmail: null, membros: undefined },
      queryClient: {} as never, invalidateActions: nada, ofertasAcionaveis: [], isActive: true, semRepositorio: false,
      promovendoStoryId: null, promovendoTodas: false, ativandoExecucao: false, podeAtivarAutoMode: true, podeDecidir: true,
      setRecusandoStory: nada, setMotivoRecusa: nada, handlePromoteStory: nada, handlePromoteAll: nada, handleAcceptHandoff: nada,
      handleActivateExecution: nada, handleActivateAutoMode: nada, iniciarTurnoDoAgente: nada, acompanharTurnoPeloLog: nada,
      finalizarTurnoDoAgente: nada,
    } as unknown as Parameters<typeof montarTimeline>[0];
    return render(<>{montarTimeline(ctx).map((e) => <div key={e.chave}>{e.node}</div>)}</>);
  }

  it('a oferta vira cartão e o evento `recusada` a fecha', () => {
    const oferta = ev(1, 'automacao.oferecida', { categoria: 'aprovacao', chave: 'git_commit@dev', n: 3 });
    const { unmount } = montar([oferta]);
    expect(screen.getByRole('button', { name: /Fazer sozinho daqui em diante/ })).toBeInTheDocument();
    unmount();
    montar([oferta, ev(2, 'automacao.recusada', { categoria: 'aprovacao', chave: 'git_commit@dev' })]);
    expect(screen.queryByRole('button', { name: /Fazer sozinho/ })).toBeNull();
  });

  it('aplicada vira a linha de narração e outro_caminho lista as saídas sem automatizar', () => {
    montar([
      ev(1, 'automacao.aplicada', { categoria: 'aprovacao', actionType: 'git_commit', agente: 'dev', regraDesde: '2026-11-10T00:00:00.000Z' }),
      ev(2, 'automacao.outro_caminho', { categoria: 'aprovacao', chave: 'x@dev', opcoes: ['trocar_modelo', 'arquivar'] }),
    ]);
    expect(screen.getByTestId('automacao-aplicada').textContent).toContain('Feito sozinho pela regra de git_commit · dev');
    expect(screen.getByTestId('automacao-aplicada').textContent).toMatch(/git_commit · dev, desde \S+ · desfazer$/);
    expect(screen.getByTestId('automacao-aplicada-desfazer').getAttribute('href')).toBe(
      '/projects/p1?tab=settings&group=projeto&section=regras-de-oferta',
    );
    expect(screen.getByTestId('automacao-outro-caminho').textContent).toContain('trocar o modelo desta tarefa · arquivar');
    expect(screen.queryByRole('button', { name: /Fazer sozinho/ })).toBeNull();
  });
});
