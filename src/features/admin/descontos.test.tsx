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
import { Descontos } from "./descontos";

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

const cupom = (extras: Linha = {}): Linha => ({
  id: "c1",
  codigo: "VERAO10",
  tipo: "percentual",
  valor: 10,
  valido_ate: null,
  limite_usos: null,
  ativo: true,
  usos: 0,
  situacao: "ativo",
  ...extras,
});

let cupons: Linha[] = [];

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

const chamadas = (nome: string) => banco.rpc.mock.calls.filter((c) => c[0] === nome);

beforeEach(() => {
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  cupons = [];
  banco.rpc.mockReset();
  banco.rpc.mockImplementation(async (nome: string) =>
    nome === "listar_cupons" ? { data: cupons, error: null } : { data: {}, error: null },
  );
  banco.tabelas["empresa"] = [
    {
      fidelidade_ativa: false,
      fidelidade_atendimentos: 10,
      fidelidade_servico_id: null,
      servicos: null,
    },
  ];
  banco.tabelas["servicos"] = [
    {
      id: "s1",
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
    {
      id: "s2",
      nome: "Serviço antigo",
      categoria_id: null,
      descricao: "",
      preco_centavos: 1000,
      duracao_minutos: 30,
      ativo: false,
      destaque: false,
      ordem: 2,
      categorias: null,
    },
  ];
});
afterEach(() => cleanup());

describe("Descontos: cupons", () => {
  it("lista os cupons com desconto, validade, usos e situação", async () => {
    cupons = [
      cupom({ limite_usos: 5, usos: 2 }),
      cupom({
        id: "c2",
        codigo: "CINCO",
        tipo: "valor",
        valor: 500,
        valido_ate: "2026-11-01T03:00:00.000Z", // vale até 31/10, o dia inteiro
        ativo: false,
        situacao: "inativo",
      }),
    ];
    abrir(<Descontos />);
    const secao = await screen.findByRole("region", { name: "Cupons" });
    const linhas = within(secao).getAllByRole("listitem");
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toHaveTextContent("VERAO10");
    expect(linhas[0]).toHaveTextContent("10%");
    expect(linhas[0]).toHaveTextContent("Sem prazo");
    expect(linhas[0]).toHaveTextContent("2 de 5");
    expect(linhas[0]).toHaveTextContent("Ativo");
    expect(linhas[1]).toHaveTextContent("R$ 5,00");
    expect(linhas[1]).toHaveTextContent("31/10/2026");
    expect(linhas[1]).toHaveTextContent("Desligado");
  });

  it("sem cupons, convida a criar o primeiro", async () => {
    abrir(<Descontos />);
    expect(await screen.findByText("Nenhum cupom criado.")).toBeInTheDocument();
  });

  it("liga e desliga um cupom", async () => {
    cupons = [cupom()];
    abrir(<Descontos />);
    fireEvent.click(await screen.findByRole("button", { name: /Desligar.*VERAO10/ }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("mudar_cupom_ativo", { p_id: "c1", p_ativo: false }),
    );
  });

  it("cria cupom percentual: o código vai em maiúsculas e sem validade nem limite", async () => {
    abrir(<Descontos />);
    await screen.findByRole("region", { name: "Novo cupom" });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: " verao10 " } });
    fireEvent.change(screen.getByLabelText(/Percentual/), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar cupom/ }));
    expect(await screen.findByText("Cupom criado.")).toBeInTheDocument();
    expect(banco.rpc).toHaveBeenCalledWith("criar_cupom", {
      p_codigo: "VERAO10",
      p_tipo: "percentual",
      p_valor: 15,
      p_valido_ate: null,
      p_limite_usos: null,
    });
  });

  it("cria cupom de valor fixo em centavos, válido o dia inteiro, com limite", async () => {
    abrir(<Descontos />);
    await screen.findByRole("region", { name: "Novo cupom" });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "natal" } });
    fireEvent.change(screen.getByLabelText("Tipo de desconto"), { target: { value: "valor" } });
    fireEvent.change(screen.getByLabelText(/Valor do desconto/), { target: { value: "5,50" } });
    fireEvent.change(screen.getByLabelText(/Válido até/), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText(/Limite de usos/), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar cupom/ }));
    await screen.findByText("Cupom criado.");
    expect(banco.rpc).toHaveBeenCalledWith("criar_cupom", {
      p_codigo: "NATAL",
      p_tipo: "valor",
      p_valor: 550,
      // 31/12 vale até a meia-noite de São Paulo: 01/01 às 03h em UTC.
      p_valido_ate: "2027-01-01T03:00:00.000Z",
      p_limite_usos: 10,
    });
  });

  it("explica cada campo inválido sem chamar o banco", async () => {
    abrir(<Descontos />);
    await screen.findByRole("region", { name: "Novo cupom" });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "a b" } });
    fireEvent.change(screen.getByLabelText(/Percentual/), { target: { value: "150" } });
    fireEvent.change(screen.getByLabelText(/Limite de usos/), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar cupom/ }));
    expect(await screen.findByText(/Use de 3 a 20 letras/)).toBeInTheDocument();
    expect(screen.getByText(/percentual inteiro de 1 a 100/)).toBeInTheDocument();
    expect(screen.getByText(/limite precisa ser um número inteiro/)).toBeInTheDocument();
    expect(chamadas("criar_cupom")).toHaveLength(0);
  });

  it("mostra a mensagem do banco quando o código já existe", async () => {
    banco.rpc.mockImplementation(async (nome: string) =>
      nome === "criar_cupom"
        ? { data: null, error: { message: "cupom_codigo_repetido" } }
        : { data: [], error: null },
    );
    abrir(<Descontos />);
    await screen.findByRole("region", { name: "Novo cupom" });
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "REPETIDO" } });
    fireEvent.change(screen.getByLabelText(/Percentual/), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /Criar cupom/ }));
    expect(await screen.findByText("Já existe um cupom com esse código.")).toBeInTheDocument();
  });
});

describe("Descontos: cartão fidelidade", () => {
  it("liga o cartão com os atendimentos e o serviço grátis", async () => {
    abrir(<Descontos />);
    const secao = await screen.findByRole("region", { name: "Cartão fidelidade" });
    await within(secao).findByRole("checkbox");
    const opcoes = within(within(secao).getByLabelText("Serviço grátis"))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opcoes).toEqual(["Escolha um serviço", "Corte clássico"]);

    fireEvent.click(within(secao).getByRole("checkbox", { name: "Cartão fidelidade ligado" }));
    fireEvent.change(within(secao).getByLabelText(/Atendimentos para ganhar/), {
      target: { value: "8" },
    });
    fireEvent.change(within(secao).getByLabelText("Serviço grátis"), { target: { value: "s1" } });
    fireEvent.click(within(secao).getByRole("button", { name: "Salvar cartão fidelidade" }));
    expect(await screen.findByText("Cartão fidelidade salvo.")).toBeInTheDocument();
    expect(banco.rpc).toHaveBeenCalledWith("salvar_fidelidade", {
      p_ativa: true,
      p_atendimentos: 8,
      p_servico_id: "s1",
    });
  });

  it("não deixa ligar sem o serviço, nem com número de atendimentos fora do limite", async () => {
    abrir(<Descontos />);
    const secao = await screen.findByRole("region", { name: "Cartão fidelidade" });
    fireEvent.click(await within(secao).findByRole("checkbox"));
    fireEvent.click(within(secao).getByRole("button", { name: "Salvar cartão fidelidade" }));
    expect(
      await within(secao).findByText("Escolha o serviço que sai de graça."),
    ).toBeInTheDocument();

    fireEvent.change(within(secao).getByLabelText(/Atendimentos para ganhar/), {
      target: { value: "1" },
    });
    fireEvent.click(within(secao).getByRole("button", { name: "Salvar cartão fidelidade" }));
    expect(await within(secao).findByText("Informe de 2 a 100 atendimentos.")).toBeInTheDocument();
    expect(chamadas("salvar_fidelidade")).toHaveLength(0);
  });

  it("mostra o que já está salvo", async () => {
    banco.tabelas["empresa"] = [
      {
        fidelidade_ativa: true,
        fidelidade_atendimentos: 6,
        fidelidade_servico_id: "s1",
        servicos: { nome: "Corte clássico" },
      },
    ];
    abrir(<Descontos />);
    const secao = await screen.findByRole("region", { name: "Cartão fidelidade" });
    expect(await within(secao).findByRole("checkbox")).toBeChecked();
    expect(within(secao).getByLabelText(/Atendimentos para ganhar/)).toHaveValue("6");
    expect(within(secao).getByLabelText("Serviço grátis")).toHaveValue("s1");
  });
});
