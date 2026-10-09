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
import { CaixaDoDia } from "./caixa";

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

const local = (dia: number, hora: number, minuto = 0) =>
  new Date(Date.UTC(2026, 9, dia, hora + 3, minuto)).toISOString();

const vazia = { entradas_centavos: 0, estornos_centavos: 0, quantidade: 0 };
const resumoDoBanco = {
  por_forma: {
    pix: { entradas_centavos: 7000, estornos_centavos: 0, quantidade: 1 },
    dinheiro: { entradas_centavos: 4500, estornos_centavos: 2500, quantidade: 2 },
    debito: vazia,
    credito: vazia,
  },
  // Troco de R$ 50,00 + R$ 45,00 em dinheiro − R$ 25,00 estornados
  esperado_centavos: 7000,
};

const caixaAberto: Linha = {
  id: "cx-aberto",
  aberto_em: local(12, 9),
  valor_inicial_centavos: 5000,
  fechado_em: null,
  valor_contado_centavos: null,
  esperado_centavos: null,
  diferenca_centavos: null,
  observacao: "",
  resumo: null,
};
const caixaFechado: Linha = {
  id: "cx-velho",
  aberto_em: local(9, 9),
  valor_inicial_centavos: 5000,
  fechado_em: local(9, 19),
  valor_contado_centavos: 9000,
  esperado_centavos: 9500,
  diferenca_centavos: -500,
  observacao: "",
  resumo: { pix: vazia, dinheiro: vazia, debito: vazia, credito: vazia },
};

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
  banco.rpc.mockReset();
  banco.rpc.mockImplementation(async (nome: string) =>
    nome === "resumo_do_caixa" ? { data: resumoDoBanco, error: null } : { data: {}, error: null },
  );
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
    {
      id: "velho",
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

describe("Caixa: fechado", () => {
  it("abre com o troco informado, em centavos", async () => {
    abrir(<CaixaDoDia />);
    expect(await screen.findByRole("region", { name: "Caixa fechado" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Dinheiro inicial na gaveta (troco)"), {
      target: { value: "50,50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Abrir caixa/ }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("abrir_caixa", { p_valor_inicial_centavos: 5050 }),
    );
    expect(await screen.findByText("Caixa aberto.")).toBeInTheDocument();
  });

  it("recusa troco inválido sem chamar o banco", async () => {
    abrir(<CaixaDoDia />);
    const campo = await screen.findByLabelText("Dinheiro inicial na gaveta (troco)");
    fireEvent.change(campo, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /Abrir caixa/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o dinheiro inicial");
    expect(chamadas("abrir_caixa")).toHaveLength(0);
  });

  it("mostra a mensagem do banco quando abrir é recusado", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: { message: "caixa_ja_aberto" } });
    abrir(<CaixaDoDia />);
    await screen.findByLabelText("Dinheiro inicial na gaveta (troco)");
    fireEvent.click(screen.getByRole("button", { name: /Abrir caixa/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe um caixa aberto");
  });

  it("lista os caixas fechados com a conferência de cada um", async () => {
    banco.tabelas["caixas"] = [caixaFechado];
    abrir(<CaixaDoDia />);
    const lista = await screen.findByRole("region", { name: "Caixas fechados" });
    const linha = within(lista).getByRole("listitem");
    expect(linha).toHaveTextContent("R$ 95,00");
    expect(linha).toHaveTextContent("R$ 90,00");
    expect(linha).toHaveTextContent("Faltou R$ 5,00");
  });
});

describe("Caixa: aberto", () => {
  beforeEach(() => {
    banco.tabelas["caixas"] = [caixaAberto, caixaFechado];
  });

  it("mostra o troco, o que entrou e o dinheiro esperado na gaveta", async () => {
    abrir(<CaixaDoDia />);
    const aberto = await screen.findByRole("region", { name: "Caixa aberto" });
    const indicador = (nome: string) => within(aberto).getByRole("group", { name: nome });
    await waitFor(() => expect(indicador("Esperado na gaveta")).toHaveTextContent("R$ 70,00"));
    expect(indicador("Dinheiro inicial")).toHaveTextContent("R$ 50,00");
    // Pix 70 + dinheiro 45 − estorno 25
    expect(indicador("Entrou no caixa")).toHaveTextContent("R$ 90,00");
    const formas = within(aberto).getAllByRole("listitem");
    expect(formas).toHaveLength(4);
    expect(formas[0]).toHaveTextContent("Pix");
    expect(formas[1]).toHaveTextContent("Dinheiro");
    expect(formas[1]).toHaveTextContent("R$ 25,00");
  });

  it("diz na hora se o dinheiro contado confere, sobra ou falta", async () => {
    abrir(<CaixaDoDia />);
    const campo = await screen.findByLabelText("Dinheiro contado");
    await screen.findByText(/O sistema espera R\$ 70,00/);
    fireEvent.change(campo, { target: { value: "70" } });
    expect(await screen.findByText(/Confere/)).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "65,00" } });
    expect(await screen.findByText("Faltam R$ 5,00 na gaveta.")).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "70,01" } });
    expect(await screen.findByText("Sobram R$ 0,01 na gaveta.")).toBeInTheDocument();
  });

  it("fecha só depois de confirmar, enviando o contado em centavos e a observação", async () => {
    abrir(<CaixaDoDia />);
    fireEvent.change(await screen.findByLabelText("Dinheiro contado"), {
      target: { value: "65" },
    });
    fireEvent.change(screen.getByLabelText(/Observação/), { target: { value: "troco do pão" } });
    await screen.findByText(/O sistema espera R\$ 70,00/);
    fireEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo).toHaveTextContent("Contado R$ 65,00, esperado R$ 70,00");
    expect(chamadas("fechar_caixa")).toHaveLength(0);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Voltar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(chamadas("fechar_caixa")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Fechar caixa" }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("fechar_caixa", {
        p_valor_contado_centavos: 6500,
        p_observacao: "troco do pão",
      }),
    );
  });

  it("pede o valor contado antes de fechar", async () => {
    abrir(<CaixaDoDia />);
    await screen.findByLabelText("Dinheiro contado");
    fireEvent.click(screen.getByRole("button", { name: "Fechar caixa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o dinheiro contado");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("Atendimento sem hora marcada", () => {
  it("oferece só os serviços ativos", async () => {
    abrir(<CaixaDoDia />);
    const campo = await screen.findByLabelText("Serviço feito");
    const opcoes = within(campo)
      .getAllByRole("option")
      .map((o) => (o.textContent ?? "").replace(/\s/g, " "));
    expect(opcoes).toEqual(["Corte clássico, R$ 45,00"]);
  });

  it("registra com o serviço, o nome e a forma de pagamento; o preço fica com o banco", async () => {
    abrir(<CaixaDoDia />);
    await screen.findByLabelText("Serviço feito");
    fireEvent.change(screen.getByLabelText(/Nome do cliente/), { target: { value: "Seu Zé" } });
    fireEvent.click(screen.getByRole("radio", { name: "Dinheiro" }));
    fireEvent.click(screen.getByRole("button", { name: /Registrar atendimento/ }));
    expect(await screen.findByText("Atendimento registrado.")).toBeInTheDocument();
    expect(banco.rpc).toHaveBeenCalledWith("registrar_atendimento_avulso", {
      p_servico_id: "corte",
      p_forma_pagamento: "dinheiro",
      p_cliente_nome: "Seu Zé",
    });
  });

  it("não registra sem a forma de pagamento", async () => {
    abrir(<CaixaDoDia />);
    await screen.findByLabelText("Serviço feito");
    fireEvent.click(screen.getByRole("button", { name: /Registrar atendimento/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha como o cliente pagou");
    expect(chamadas("registrar_atendimento_avulso")).toHaveLength(0);
  });
});
