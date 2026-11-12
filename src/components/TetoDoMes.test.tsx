import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import i18n from '../lib/i18n';
import { TetoDoMes } from './TetoDoMes';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

function montar(podeEditar: boolean, ler = vi.fn().mockResolvedValue(null)) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <TetoDoMes
        escopo="workspace"
        queryKey={['workspace-budget', 'w-1']}
        ler={ler}
        gravar={vi.fn()}
        podeEditar={podeEditar}
      />
    </QueryClientProvider>,
  );
}

describe('TetoDoMes (RN-1201)', () => {
  it('owner: o editor do teto do workspace fica ativo', async () => {
    montar(true);
    expect(await screen.findByLabelText('Teto em US$')).toBeEnabled();
  });

  it('sem papel: o campo fica inerte e o motivo vem em texto', async () => {
    montar(false);
    expect(await screen.findByLabelText('Teto em US$')).toBeDisabled();
    expect(screen.getByText('Só o owner define o teto do workspace.')).toBeInTheDocument();
  });

  it('403 da api para quem não edita: nada aparece', async () => {
    montar(false, vi.fn().mockRejectedValue(new Error('403')));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByLabelText('Teto em US$')).toBeNull();
  });
});
