import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './ToastProvider.helpers';

function Dispara() {
  const { showToast } = useToast();
  return <button onClick={() => showToast({ title: 'Salvo' })}>dispara</button>;
}

describe('ToastProvider (AT-1027)', () => {
  afterEach(() => vi.useRealTimers());

  it('desmontar o provider não deixa temporizador vivo', () => {
    vi.useFakeTimers();
    const { unmount } = render(<ToastProvider><Dispara /></ToastProvider>);
    act(() => screen.getByText('dispara').click());
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sem desmontar, o toast some em 5 s', () => {
    vi.useFakeTimers();
    render(<ToastProvider><Dispara /></ToastProvider>);
    act(() => screen.getByText('dispara').click());
    expect(screen.getByText('Salvo')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.queryByText('Salvo')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
