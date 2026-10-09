import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CartaoDoCliente } from "./cartao-do-cliente";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const rpc = vi.fn();
  const from = (tabela: string) => {
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      limit: () => consulta,
      then: (resolver: (r: unknown) => void) =>
        resolver({ data: tabelas[tabela] ?? [], error: null }),
    };
    return consulta;
  };
  return { tabelas, rpc, from };
});
vi.mock("@/lib/supabase-navegador", () => ({
  supabaseNavegador: () => ({ from: banco.from, rpc: banco.rpc }),
}));

const regra = (extras: Linha = {}): Linha => ({
  fidelidade_ativa: true,
  fidelidade_atendimentos: 10,
  fidelidade_servico_id: "s1",
  servicos: { nome: "Corte clássico" },
  ...extras,
});

function abrir() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <CartaoDoCliente fuso="America/Sao_Paulo" />
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

const comSaldo = (saldo: number) =>
  banco.rpc.mockImplementation(async () => ({ data: saldo, error: null }));

beforeEach(() => {
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.rpc.mockReset();
  banco.tabelas["empresa"] = [regra()];
  banco.tabelas["fidelidade_movimentos"] = [];
});
afterEach(() => cleanup());

describe("Cartão fidelidade do cliente", () => {
  it("mostra os pontos, quanto falta e o serviço grátis", async () => {
    comSaldo(7);
    abrir();
    const secao = await screen.findByRole("region", { name: "Seus pontos" });
    expect(secao).toHaveTextContent("7 pontos");
    expect(secao).toHaveTextContent("7 de 10 atendimentos");
    expect(secao).toHaveTextContent("Faltam 3 atendimentos para ganhar Corte clássico de graça.");
    const barra = within(secao).getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "7");
    expect(barra).toHaveAttribute("aria-valuemax", "10");
  });

  it("no singular quando falta só um", async () => {
    comSaldo(9);
    abrir();
    expect(await screen.findByText(/Falta 1 atendimento para ganhar/)).toBeInTheDocument();
  });

  it("com o cartão cheio, avisa que ganhou", async () => {
    comSaldo(10);
    abrir();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Você ganhou Corte clássico de graça. Avise na sua próxima visita.",
    );
  });

  it("com mais de um prêmio guardado, conta quantos", async () => {
    comSaldo(23);
    abrir();
    expect(await screen.findByRole("status")).toHaveTextContent("2 atendimentos de Corte clássico");
  });

  it("lista de onde vieram os pontos", async () => {
    comSaldo(2);
    banco.tabelas["fidelidade_movimentos"] = [
      { pontos: 1, motivo: "atendimento", criado_em: "2026-10-09T17:00:00Z" },
      { pontos: -10, motivo: "resgate", criado_em: "2026-09-01T17:00:00Z" },
    ];
    abrir();
    const historico = await screen.findByRole("region", { name: "Histórico de pontos" });
    const itens = await within(historico).findAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("+1 ponto, atendimento concluído");
    expect(itens[0]).toHaveTextContent("09/10/2026");
    expect(itens[1]).toHaveTextContent("-10 pontos, serviço grátis");
  });

  it("sem movimentos, diz que o primeiro ponto vem no próximo atendimento", async () => {
    comSaldo(0);
    abrir();
    expect(await screen.findByText(/Nenhum ponto ainda/)).toBeInTheDocument();
  });

  it("com o programa desligado, avisa e convida a agendar", async () => {
    banco.tabelas["empresa"] = [regra({ fidelidade_ativa: false })];
    abrir();
    expect(
      await screen.findByText("A barbearia ainda não tem cartão fidelidade."),
    ).toBeInTheDocument();
    expect(banco.rpc).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Agendar horário" })).toBeInTheDocument();
  });
});
