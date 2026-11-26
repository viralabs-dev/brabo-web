import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const getOpenQuestions = vi.fn();
vi.mock('./api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api-client')>()),
  getOpenQuestions: (...a: unknown[]) => getOpenQuestions(...a),
}));

const { usePerguntasEmAberto } = await import('./perguntas-em-aberto');

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('usePerguntasEmAberto (RN-632, RN-1510)', () => {
  it('a pergunta nascida em outra sessão aparece em 15 s, sem evento de canal', async () => {
    getOpenQuestions.mockResolvedValueOnce({ itens: [], total: 0 });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePerguntasEmAberto('p1'), { wrapper });
    await waitFor(() => expect(result.current.data?.total).toBe(0));
    getOpenQuestions.mockResolvedValue({ itens: [{ questionId: 'q' }], total: 1 });
    await vi.advanceTimersByTimeAsync(15_100);
    await waitFor(() => expect(result.current.data?.total).toBe(1));
  });
});
