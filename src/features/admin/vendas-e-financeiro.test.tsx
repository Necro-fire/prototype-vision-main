import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Expediente } from "@/features/agenda/expediente";
import { Financeiro } from "./financeiro";
import { Vendas } from "./vendas";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const rpc = vi.fn();
  const from = (tabela: string) => {
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      limit: () => consulta,
      eq: () => consulta,
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

const util = [{ abre: "09:00", fecha: "19:00" }];
const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [[], util, util, util, util, util, util],
};
vi.mock("@/features/agenda/use-funcionamento", async (importar) => ({
  ...(await importar<typeof import("@/features/agenda/use-funcionamento")>()),
  useExpediente: () => expediente,
}));

// Segunda-feira, 12/10/2026, 12:00 em São Paulo.
const AGORA = new Date("2026-10-12T15:00:00Z");
const local = (dia: number, hora: number, minuto = 0) =>
  new Date(Date.UTC(2026, 9, dia, hora + 3, minuto)).toISOString();

const atendimento = (
  id: string,
  cliente: string,
  dia: number,
  situacao: string,
  preco = 4500,
): Linha => ({
  id,
  servico_id: "corte",
  servico_nome: "Corte clássico",
  preco_centavos: preco,
  duracao_minutos: 30,
  inicio: local(dia, 10),
  fim: local(dia, 10, 30),
  situacao,
  observacao: "",
  cliente_id: `c-${id}`,
  cliente_nome: cliente,
  cliente_celular: "11999990000",
});

const venda = (
  id: string,
  produtoId: string,
  nome: string,
  preco: number,
  quantidade: number,
  dia: number,
  extras: Linha = {},
): Linha => ({
  id,
  total_centavos: preco * quantidade,
  desconto_centavos: 0,
  forma_pagamento: null,
  ocorrida_em: local(dia, 15),
  estornada_em: null,
  venda_itens: [{ produto_id: produtoId, produto_nome: nome, preco_centavos: preco, quantidade }],
  ...extras,
});

function abrir(tela: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => <QueryClientProvider client={queryClient}>{tela}</QueryClientProvider>,
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: AGORA });
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.rpc.mockReset();
  banco.tabelas["produtos"] = [
    {
      id: "maquina",
      nome: "Máquina de acabamento",
      descricao: "",
      preco_centavos: 18900,
      ativo: true,
      ordem: 1,
    },
    {
      id: "pente",
      nome: "Pente profissional",
      descricao: "",
      preco_centavos: 2500,
      ativo: true,
      ordem: 2,
    },
    {
      id: "velho",
      nome: "Produto antigo",
      descricao: "",
      preco_centavos: 1000,
      ativo: false,
      ordem: 3,
    },
  ];
  banco.tabelas["servicos"] = [
    {
      id: "corte",
      nome: "Corte clássico",
      categoria_id: null,
      descricao: "",
      preco_centavos: 4500,
      duracao_minutos: 30,
      ativo: true,
      destaque: false,
      ordem: 1,
      categorias: null,
    },
  ];
  banco.tabelas["agendamentos"] = [
    atendimento("a1", "Ana", 9, "concluido"),
    atendimento("a2", "Bruno", 12, "concluido", 7000),
    atendimento("a3", "Carla", 12, "cancelado"),
  ];
  banco.tabelas["vendas"] = [
    venda("v1", "maquina", "Máquina de acabamento", 18900, 1, 12),
    venda("v2", "pente", "Pente profissional", 2500, 2, 9),
    venda("v3", "pente", "Pente profissional", 2500, 1, 9, { estornada_em: local(9, 18) }),
  ];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Vendas", () => {
  it("oferece só os produtos ativos para vender", async () => {
    abrir(<Vendas />);
    const campo = await screen.findByLabelText("Produto");
    const opcoes = within(campo)
      .getAllByRole("option")
      .map((o) => o.textContent ?? "");
    expect(opcoes).toHaveLength(2);
    expect(opcoes.join(" ")).not.toContain("Produto antigo");
  });

  it("registra a venda de hoje com o horário de agora; o preço vem do banco, não da tela", async () => {
    banco.rpc.mockResolvedValue({ data: {}, error: null });
    abrir(<Vendas />);
    await screen.findByLabelText("Produto");
    fireEvent.change(screen.getByLabelText("Produto"), { target: { value: "pente" } });
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar venda/ }));
    expect(await screen.findByText("Venda registrada.")).toBeInTheDocument();
    expect(banco.rpc).toHaveBeenCalledWith("registrar_venda", {
      p_itens: [{ produto_id: "pente", quantidade: 3 }],
      p_forma_pagamento: null,
      p_desconto_centavos: 0,
      p_ocorrida_em: "2026-10-12T15:00:00.000Z",
    });
  });

  it("venda de outro dia fica no meio-dia da barbearia", async () => {
    banco.rpc.mockResolvedValue({ data: {}, error: null });
    abrir(<Vendas />);
    await screen.findByLabelText("Produto");
    fireEvent.change(screen.getByLabelText("Data"), { target: { value: "2026-10-09" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar venda/ }));
    await screen.findByText("Venda registrada.");
    expect(banco.rpc.mock.calls[0]?.[1]).toMatchObject({
      p_ocorrida_em: "2026-10-09T15:00:00.000Z",
    });
  });

  it("recusa quantidade inválida sem chamar o banco", async () => {
    abrir(<Vendas />);
    await screen.findByLabelText("Produto");
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar venda/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("pelo menos 1");
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it("mostra a mensagem do banco quando a venda é recusada", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: { message: "produto_indisponivel" } });
    abrir(<Vendas />);
    await screen.findByLabelText("Produto");
    fireEvent.click(screen.getByRole("button", { name: /Registrar venda/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não está disponível");
  });

  it("histórico: total de cada venda e a estornada marcada", async () => {
    abrir(<Vendas />);
    const historico = await screen.findByRole("region", { name: "Histórico de vendas" });
    expect(within(historico).getByText("Máquina de acabamento (1)")).toBeInTheDocument();
    expect(within(historico).getAllByText("Pente profissional (2)").length).toBe(1);
    expect(within(historico).getByText("Estornada")).toBeInTheDocument();
  });

  it("estorna só depois de confirmar", async () => {
    banco.rpc.mockResolvedValue({ data: {}, error: null });
    abrir(<Vendas />);
    fireEvent.click(await screen.findByRole("button", { name: /Estornar.*Máquina de acabamento/ }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter venda" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(banco.rpc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Estornar.*Máquina de acabamento/ }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Estornar venda" }));
    await waitFor(() => expect(banco.rpc).toHaveBeenCalledWith("estornar_venda", { p_id: "v1" }));
  });

  it("lista os serviços concluídos e filtra por data", async () => {
    abrir(<Vendas />);
    const servicos = await screen.findByRole("region", { name: "Histórico de serviços" });
    expect(within(servicos).getByText("Ana")).toBeInTheDocument();
    expect(within(servicos).getByText("Bruno")).toBeInTheDocument();
    expect(within(servicos).queryByText("Carla")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar vendas por data"), {
      target: { value: "2026-10-09" },
    });
    expect(within(servicos).getByText("Ana")).toBeInTheDocument();
    expect(within(servicos).queryByText("Bruno")).not.toBeInTheDocument();
  });
});

describe("Financeiro", () => {
  const indicador = (nome: string) => screen.getByRole("group", { name: nome });

  it("soma serviços concluídos e vendas, sem cancelados nem estornos", async () => {
    abrir(<Financeiro />);
    await screen.findByRole("group", { name: "Faturamento bruto" });
    // Serviços: 45 + 70 = 115. Produtos: 189 + 2 x 25 = 239 (a venda estornada não conta).
    expect(indicador("Serviços")).toHaveTextContent("R$ 115,00");
    expect(indicador("Produtos")).toHaveTextContent("R$ 239,00");
    expect(indicador("Faturamento bruto")).toHaveTextContent("R$ 354,00");
    expect(indicador("Serviços")).toHaveTextContent("2 atendimentos concluídos");
    expect(indicador("Produtos")).toHaveTextContent("2 vendas");
  });

  it("filtra por período, no dia da barbearia", async () => {
    abrir(<Financeiro />);
    await screen.findByRole("group", { name: "Faturamento bruto" });
    fireEvent.change(screen.getByLabelText("Data inicial"), { target: { value: "2026-10-12" } });
    // Só o que aconteceu na segunda: Bruno (70) e a máquina (189).
    expect(indicador("Faturamento bruto")).toHaveTextContent("R$ 259,00");
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-10-11" } });
    expect(indicador("Faturamento bruto")).toHaveTextContent("R$ 0,00");
  });

  it("escolher um produto mostra só ele; escolher um serviço, só serviços", async () => {
    abrir(<Financeiro />);
    await screen.findByRole("group", { name: "Faturamento bruto" });
    fireEvent.change(screen.getByLabelText("Filtrar produto"), { target: { value: "pente" } });
    expect(indicador("Faturamento bruto")).toHaveTextContent("R$ 50,00");
    expect(indicador("Serviços")).toHaveTextContent("R$ 0,00");
    fireEvent.change(screen.getByLabelText("Filtrar serviço"), { target: { value: "corte" } });
    expect(indicador("Produtos")).toHaveTextContent("R$ 0,00");
    expect(indicador("Serviços")).toHaveTextContent("R$ 115,00");
  });

  it("mostra o faturamento dia a dia, do mais recente ao mais antigo", async () => {
    abrir(<Financeiro />);
    const lista = await screen.findByRole("region", { name: "Por dia" });
    const dias = within(lista).getAllByRole("listitem");
    expect(dias).toHaveLength(2);
    expect(dias[0]).toHaveTextContent("12/10/2026");
    expect(dias[0]).toHaveTextContent("R$ 259,00");
    expect(dias[1]).toHaveTextContent("09/10/2026");
    expect(dias[1]).toHaveTextContent("R$ 95,00");
  });

  it("limpa os filtros", async () => {
    abrir(<Financeiro />);
    await screen.findByRole("group", { name: "Faturamento bruto" });
    fireEvent.change(screen.getByLabelText("Filtrar produto"), { target: { value: "pente" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(indicador("Faturamento bruto")).toHaveTextContent("R$ 354,00");
  });
});
