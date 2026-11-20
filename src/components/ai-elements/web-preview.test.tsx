import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import i18n from '../../lib/i18n';
import { EntregavelPreview } from '../EntregavelPreview';

await i18n.changeLanguage('pt-BR');

describe('Web preview (AT-685)', () => {
  it('URL local mostra o iframe com sandbox mínimo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ type: 'opaque' }));
    const { container } = render(<EntregavelPreview urls={[{ label: 'app', url: 'http://localhost:3001' }]} />);
    await waitFor(() => expect(container.querySelector('iframe')).not.toBeNull());
    const f = container.querySelector('iframe')!;
    expect(f.getAttribute('src')).toBe('http://localhost:3001');
    expect(f.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
  });

  it('URL externa é recusada e cai no texto', () => {
    const { container } = render(<EntregavelPreview urls={[{ label: 'x', url: 'https://example.com' }]} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByText('Não há entregável publicado para visualizar.')).toBeTruthy();
  });

  it('sem URL aparece o texto', () => {
    render(<EntregavelPreview urls={[]} />);
    expect(screen.getByText('Não há entregável publicado para visualizar.')).toBeTruthy();
  });
});
