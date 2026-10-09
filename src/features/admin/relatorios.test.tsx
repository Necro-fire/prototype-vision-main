import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { baixarArquivo } from "@/lib/baixar";
import type { Expediente } from "@/features/agenda/expediente";
import { Relatorios } from "./relatorios";

type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
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
  return { tabelas, from };
});
vi.mock("@/lib/supabase-navegador", () => ({
  supabaseNavegador: () => ({ from: banco.from, rpc: vi.fn() }),
}));
vi.mock("@/lib/baixar", () => ({ baixarArquivo: vi.fn() }));

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

// Segunda-feira, 12/10/2026, 12:00 em São Paulo. O período padrão é 13/09 a 12/10.
const AGORA = new Date("2026-10-12T15:00:00Z");
const local = (dia: number, hora: number, mes = 10) =>
  new Date(Date.UTC(2026, mes - 1, dia, hora + 3)).toISOString();

const atendimento = (
  id: string,
  servicoId: string,
  nome: string,
  preco: number,
  inicio: string,
  extras: Linha = {},
): Linha => ({
  id,
  servico_id: servicoId,
  servico_nome: nome,
  preco_centavos: preco,
  desconto_centavos: 0,
  duracao_minutos: 30,
  inicio,
  fim: inicio,
  situacao: "concluido",
  observacao: "",
  cliente_id: `c-${id}`,
  cliente_nome: "Cliente",
  cliente_celular: "11999990000",
  ...extras,
});

const venda = (id: string, produto: string, preco: number, quantidade: number, quando: string) => ({
  id,
  total_centavos: preco * quantidade,
  desconto_centavos: 0,
  forma_pagamento: "pix",
  ocorrida_em: quando,
  estornada_em: null,
  venda_itens: [{ produto_id: produto, produto_nome: produto, preco_centavos: preco, quantidade }],
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
  vi.mocked(baixarArquivo).mockReset();
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.tabelas["agendamentos"] = [
    // No período padrão (13/09 a 12/10): 45 + 70 = 115
    atendimento("a1", "corte", "Corte", 4500, local(9, 10)),
    atendimento("a2", "combo", "Corte + barba", 7000, local(12, 10)),
    // No período anterior (14/08 a 12/09): 35
    atendimento("a3", "barba", "Barba", 3500, local(20, 10, 8)),
    // Cancelado não conta
    atendimento("a4", "corte", "Corte", 4500, local(10, 10), { situacao: "cancelado" }),
  ];
  banco.tabelas["vendas"] = [
    venda("v1", "Pente", 2500, 2, local(11, 15)), // 50 no período padrão
    venda("v2", "Pente", 2500, 1, local(1, 15, 9)), // 25 (01/09): anterior
  ];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Relatórios", () => {
  it("abre nos últimos 30 dias e compara com os 30 anteriores", async () => {
    abrir(<Relatorios />);
    const faturamento = await screen.findByRole("group", { name: "Faturamento" });
    expect(screen.getByText(/Período: 13\/09\/2026 a 12\/10\/2026/)).toHaveTextContent(
      "Comparado com 14/08/2026 a 12/09/2026",
    );
    // Atual: 45 + 70 + 50 = 165. Anterior: 35 + 25 = 60.
    expect(faturamento).toHaveTextContent("R$ 165,00");
    expect(faturamento).toHaveTextContent("Subiu 175,0% sobre o período anterior");
    expect(screen.getByRole("group", { name: "Serviços" })).toHaveTextContent("R$ 115,00");
    expect(screen.getByRole("group", { name: "Serviços" })).toHaveTextContent("Subiu 228,6%");
    expect(screen.getByRole("group", { name: "Produtos" })).toHaveTextContent("R$ 50,00");
    expect(screen.getByRole("group", { name: "Produtos" })).toHaveTextContent("Subiu 100,0%");
  });

  it("o gráfico tem descrição por escrito e a tabela com os mesmos valores", async () => {
    abrir(<Relatorios />);
    const grafico = await screen.findByRole("img", {
      name: /Faturamento de 13\/09\/2026 a 12\/10\/2026/,
    });
    expect(grafico).toHaveAccessibleName(/R\$\s165,00.*Período anterior: R\$\s60,00/);
    const detalhes = screen.getByText(/Ver os valores de cada dia/);
    fireEvent.click(detalhes);
    const tabela = await screen.findByRole("list", {
      name: "Faturamento do período, comparado com o anterior",
    });
    // 30 dias, do mais antigo ao mais recente, com zero nos dias sem movimento.
    const itens = within(tabela).getAllByRole("listitem");
    expect(itens).toHaveLength(30);
    expect(itens[0]).toHaveTextContent("13/09/2026");
    expect(itens[0]).toHaveTextContent("R$ 0,00");
  });

  it("troca de período pelos botões prontos", async () => {
    abrir(<Relatorios />);
    await screen.findByRole("group", { name: "Faturamento" });
    fireEvent.click(screen.getByRole("button", { name: "Últimos 7 dias" }));
    expect(screen.getByText(/Período: 06\/10\/2026 a 12\/10\/2026/)).toBeInTheDocument();
    // Nos últimos 7 dias: 45 (09/10) + 70 (12/10) + 50 (11/10) = 165, e antes (29/09 a 05/10) nada.
    expect(screen.getByRole("group", { name: "Faturamento" })).toHaveTextContent(
      "O período anterior não teve valor para comparar",
    );
    fireEvent.click(screen.getByRole("button", { name: "Mês passado" }));
    expect(screen.getByText(/Período: 01\/09\/2026 a 30\/09\/2026/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Faturamento" })).toHaveTextContent("R$ 25,00");
  });

  it("avisa quando o período está errado, sem quebrar a tela", async () => {
    abrir(<Relatorios />);
    await screen.findByRole("group", { name: "Faturamento" });
    fireEvent.change(screen.getByLabelText("Data final"), { target: { value: "2026-09-01" } });
    expect(await screen.findByRole("alert")).toHaveTextContent("igual ou depois da inicial");
    fireEvent.click(screen.getByRole("button", { name: "Este mês" }));
    expect(screen.getByRole("group", { name: "Faturamento" })).toBeInTheDocument();
  });

  it("ranking de serviços pelo valor cobrado e de produtos por quantidade vendida", async () => {
    abrir(<Relatorios />);
    const servicos = await screen.findByRole("region", { name: "Serviços mais pedidos" });
    const s = within(servicos).getAllByRole("listitem");
    expect(s[0]).toHaveTextContent("Corte + barba");
    expect(s[0]).toHaveTextContent("R$ 70,00");
    expect(s[1]).toHaveTextContent("Corte");
    const produtos = screen.getByRole("region", { name: "Produtos mais vendidos" });
    expect(within(produtos).getByRole("listitem")).toHaveTextContent("Pente");
    expect(within(produtos).getByRole("listitem")).toHaveTextContent("R$ 50,00");
  });

  it("baixa a planilha do faturamento por dia, com o nome do período e o dinheiro com vírgula", async () => {
    abrir(<Relatorios />);
    await screen.findByRole("group", { name: "Faturamento" });
    fireEvent.click(screen.getByRole("button", { name: /Baixar faturamento por dia/ }));
    expect(baixarArquivo).toHaveBeenCalledTimes(1);
    const [nome, conteudo] = vi.mocked(baixarArquivo).mock.calls[0]!;
    expect(nome).toBe("faturamento-por-dia-2026-09-13-a-2026-10-12.csv");
    const linhas = conteudo.split("\r\n");
    expect(linhas[0]).toBe("Dia;Serviços (R$);Produtos (R$);Total (R$)");
    expect(linhas).toContain("2026-10-09;45,00;0,00;45,00");
    expect(linhas).toContain("2026-10-11;0,00;50,00;50,00");
    expect(linhas.filter((l) => l.startsWith("2026-")).length).toBe(30);
  });

  it("baixa a planilha de serviços e produtos", async () => {
    abrir(<Relatorios />);
    await screen.findByRole("group", { name: "Faturamento" });
    fireEvent.click(screen.getByRole("button", { name: /Baixar serviços e produtos/ }));
    const [nome, conteudo] = vi.mocked(baixarArquivo).mock.calls[0]!;
    expect(nome).toBe("servicos-e-produtos-2026-09-13-a-2026-10-12.csv");
    expect(conteudo).toContain("Tipo;Nome;Quantidade;Total (R$)");
    expect(conteudo).toContain("Serviço;Corte + barba;1;70,00");
    expect(conteudo).toContain("Produto;Pente;2;50,00");
  });
});
