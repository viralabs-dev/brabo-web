import { describe, expect, it, vi, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { historicoFalso } from "../test/historico-de-eventos";
import i18n from "../lib/i18n";

// AT-978 (RN-1426/1427): "Gasto por agente" lê o resumo da sessão, não os eventos baixados.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

const getSessionTokenUsage = vi.fn();
vi.mock("../lib/hooks", () => ({
  useSessionEventHistory: () => historicoFalso([]),
}));
vi.mock("../lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api-client")>()),
  getSessionTokenUsage: (...a: unknown[]) => getSessionTokenUsage(...a),
}));
vi.mock("../lib/perguntas-em-aberto", () => ({
  usePerguntasEmAberto: () => ({ data: undefined }),
  rolarAteAsPerguntas: () => {},
  abrirPendencias: () => {},
}));
vi.mock("../lib/contexto-da-sessao", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/contexto-da-sessao")>()),
  useContextoDaSessaoInteira: () => ({ data: undefined }),
}));

const { ContextAside } = await import("./ContextAside");

function montar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ContextAside
        projectId="p1"
        sessionId="s1"
        actions={[]}
        pausarPoll={false}
        logOpen={true}
        onToggleLog={() => {}}
      />
    </QueryClientProvider>,
  );
  return screen.getByTestId("aside-gasto");
}

describe("ContextAside — gasto real (AT-978)", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("pt-BR");
  });

  it('com gasto no resumo, mostra o valor e nunca "Sem gasto ainda"', async () => {
    getSessionTokenUsage.mockResolvedValue([
      {
        actorId: "dev",
        costMicros: 1_086_800,
        inputTokens: 1,
        outputTokens: 1,
      },
    ]);
    const secao = montar();
    expect(await within(secao).findByText("US$ 1,0868")).toBeTruthy();
    expect(document.body).not.toHaveTextContent("Sem gasto ainda");
  });

  it('resumo ainda não chegou: não afirma "Sem gasto ainda"', () => {
    getSessionTokenUsage.mockReturnValue(new Promise(() => {}));
    montar();
    expect(document.body).not.toHaveTextContent("Sem gasto ainda");
  });

  it('resumo com zero: "Sem gasto ainda"', async () => {
    getSessionTokenUsage.mockResolvedValue([]);
    expect(await within(montar()).findByText("Sem gasto ainda.")).toBeTruthy();
  });
});
