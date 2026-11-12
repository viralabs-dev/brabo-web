import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../../lib/i18n';
import * as api from '../../lib/api-client';
import { AgentCatalogSection } from './AgentCatalogSection';
import { ProvedorDoSumario } from './SecaoDeConfiguracoes';

beforeAll(async () => {
  await i18n.changeLanguage('pt-BR');
});

const agente = (extra = {}) => ({
  agente: 'criativo',
  identidade: 'Você é o Criativo.',
  instrucoesDoProjeto: { versao: 3, conteudo: 'abc' },
  ferramentas: [{ nome: 'rag_search', descricao: 'Busca no projeto' }],
  ...extra,
});

function montar(resposta: unknown) {
  const spy = vi.spyOn(api, 'getAgentCatalog').mockResolvedValue(resposta as never);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProvedorDoSumario>
        <AgentCatalogSection projectId="p1" />
      </ProvedorDoSumario>
    </QueryClientProvider>,
  );
  return spy;
}

describe('AgentCatalogSection (RN-1270)', () => {
  it('caminho feliz: só lê ao abrir e mostra instrução e ferramentas', async () => {
    const spy = montar({ agentes: [agente()] });
    expect(spy).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByText('Criativo')[0]);
    expect(await screen.findByText('Você é o Criativo.')).toBeTruthy();
    expect(await screen.findByText('rag_search')).toBeTruthy();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('engine fora: ferramentas null não viram "sem ferramentas"', async () => {
    montar({ agentes: [agente({ ferramentas: null, identidade: null })], motivoSemCatalogo: 'engine_indisponivel' });
    fireEvent.click(screen.getAllByText('Criativo')[0]);
    await waitFor(() => expect(screen.getByText('Não foi possível ler as ferramentas agora.')).toBeTruthy());
    expect(screen.queryByText('Este agente não tem ferramentas.')).toBeNull();
  });
});
