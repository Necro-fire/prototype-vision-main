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

import type { Situacao } from "@/features/agenda/agendamentos";
import type { Expediente } from "@/features/agenda/expediente";
import { Agendamentos } from "./agendamentos";
import { Clientes } from "./clientes";
import type { AgendamentoDoDono } from "./hoje";
import { VisaoGeral } from "./visao-geral";

// O Supabase é simulado no nível do cliente: as linhas voltam como o banco as devolve, então a
// conversão também é testada.
type Linha = Record<string, unknown>;
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const falhas = new Set<string>();
  const rpc = vi.fn();
  const from = (tabela: string) => {
    const consulta = {
      select: () => consulta,
      eq: () => consulta,
      order: () => consulta,
      limit: () => consulta,
      then: (resolver: (r: { data: Linha[] | null; error: { message: string } | null }) => void) =>
        resolver(
          falhas.has(tabela)
            ? { data: null, error: { message: "rede" } }
            : { data: tabelas[tabela] ?? [], error: null },
        ),
    };
    return consulta;
  };
  return { tabelas, falhas, rpc, from };
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
// O funcionamento vem da rota raiz; aqui entra direto.
vi.mock("@/features/agenda/use-funcionamento", async (importar) => ({
  ...(await importar<typeof import("@/features/agenda/use-funcionamento")>()),
  useExpediente: () => expediente,
}));

// Segunda-feira, 12/10/2026, 12:00 em São Paulo (15:00 UTC).
const AGORA = new Date("2026-10-12T15:00:00Z");
const local = (dia: number, hora: number, minuto = 0) =>
  new Date(Date.UTC(2026, 9, dia, hora + 3, minuto)).toISOString();

function ag(
  id: string,
  cliente: string,
  inicio: string,
  situacao: Situacao,
  servico = "Corte clássico",
  precoCentavos = 4500,
  duracaoMinutos = 30,
): AgendamentoDoDono {
  return {
    id,
    servicoId: "s1",
    servicoNome: servico,
    precoCentavos,
    duracaoMinutos,
    inicio,
    fim: new Date(new Date(inicio).getTime() + duracaoMinutos * 60_000).toISOString(),
    situacao,
    observacao: "",
    clienteId: `c-${id}`,
    clienteNome: cliente,
    clienteCelular: "11999990000",
  };
}

// A linha como o banco a devolve.
const linhaDe = (a: AgendamentoDoDono): Linha => ({
  id: a.id,
  servico_id: a.servicoId,
  servico_nome: a.servicoNome,
  preco_centavos: a.precoCentavos,
  duracao_minutos: a.duracaoMinutos,
  inicio: a.inicio,
  fim: a.fim,
  situacao: a.situacao,
  observacao: a.observacao,
  cliente_id: a.clienteId,
  cliente_nome: a.clienteNome,
  cliente_celular: a.clienteCelular,
});

const lista = () => [
  ag("a1", "Ana", local(12, 9), "concluido"),
  ag("a4", "Davi", local(12, 11), "agendado", "Barba & navalha", 3000),
  ag("a2", "Bruno", local(12, 12, 30), "confirmado", "Corte + barba", 7000, 60),
  ag("a3", "Carla", local(12, 14), "agendado", "Sobrancelha", 3500),
  ag("a6", "Fábio", local(12, 16), "cancelado"),
  ag("a5", "Eva", local(13, 9), "agendado"),
];

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
  for (const tabela of Object.keys(banco.tabelas)) delete banco.tabelas[tabela];
  banco.falhas.clear();
  banco.rpc.mockReset();
  banco.tabelas["agendamentos"] = lista().map(linhaDe);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Hoje", () => {
  it("resume o dia: próximo cliente, marcados, atendidos e previsto", async () => {
    abrir(<VisaoGeral />);
    expect(await screen.findByRole("heading", { level: 1, name: "Hoje" })).toBeInTheDocument();
    const proximo = await screen.findByRole("group", { name: "Próximo cliente" });
    expect(proximo).toHaveTextContent("12:30");
    expect(proximo).toHaveTextContent("Bruno");
    // Ana, Davi, Bruno e Carla contam; o cancelado de hoje não.
    expect(screen.getByRole("group", { name: "Marcados hoje" })).toHaveTextContent("4");
    expect(screen.getByRole("group", { name: "Já atendidos" })).toHaveTextContent("1 de 4");
    // 45 + 30 + 70 + 35
    expect(screen.getByRole("group", { name: "Previsto para hoje" })).toHaveTextContent("R$ 180");
  });

  it("mostra o dia em ordem, no horário da barbearia, com o cancelado também", async () => {
    abrir(<VisaoGeral />);
    const linha = await screen.findByRole("region", { name: "Linha do tempo de hoje" });
    const nomes = within(linha)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(nomes).toEqual(["Ana", "Davi", "Bruno", "Carla", "Fábio"]);
    expect(within(linha).getByText("12:30")).toBeInTheDocument();
  });

  it("avisa dos horários que já passaram sem situação", async () => {
    abrir(<VisaoGeral />);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "1 horário de hoje já passou e ficou sem situação.",
    );
  });

  it("lista os próximos dias, sem misturar com hoje", async () => {
    abrir(<VisaoGeral />);
    const proximos = await screen.findByRole("region", { name: "Próximos dias" });
    expect(within(proximos).getByText("Eva")).toBeInTheDocument();
    expect(within(proximos).queryByText("Carla")).not.toBeInTheDocument();
  });

  it("avança o horário em um toque, chamando a função do banco", async () => {
    banco.rpc.mockResolvedValue({ data: linhaDe(lista()[3]!), error: null });
    abrir(<VisaoGeral />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar: Carla" }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("mudar_situacao", {
        p_id: "a3",
        p_para: "confirmado",
      }),
    );
  });

  it("o horário confirmado oferece iniciar o atendimento, e o em atendimento oferece concluir", async () => {
    banco.tabelas["agendamentos"] = [
      ag("x1", "Bruno", local(12, 12), "confirmado"),
      ag("x2", "Carla", local(12, 11, 30), "em_atendimento"),
    ].map(linhaDe);
    abrir(<VisaoGeral />);
    expect(
      await screen.findByRole("button", { name: "Iniciar atendimento: Bruno" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Concluir atendimento: Carla" })).toBeInTheDocument();
    // Em atendimento não pode ser cancelado nem marcado como falta.
    expect(
      screen.queryByRole("button", { name: "Cancelar horário: Carla" }),
    ).not.toBeInTheDocument();
  });

  it("'não compareceu' só é oferecido depois do horário começar", async () => {
    abrir(<VisaoGeral />);
    // Davi era às 11h (já começou); Carla é às 14h (ainda não).
    expect(await screen.findByRole("button", { name: "Não compareceu: Davi" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Não compareceu: Carla" })).not.toBeInTheDocument();
  });

  it("mostra a mensagem do banco quando a mudança é recusada", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: { message: "transicao_invalida" } });
    abrir(<VisaoGeral />);
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar: Carla" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não é permitida");
  });

  it("cancelar pede confirmação e só então muda a situação", async () => {
    banco.rpc.mockResolvedValue({ data: linhaDe(lista()[3]!), error: null });
    abrir(<VisaoGeral />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar horário: Carla" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText("Cancelar este horário?")).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter horário" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(banco.rpc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar horário: Carla" }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Cancelar horário" }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("mudar_situacao", { p_id: "a3", p_para: "cancelado" }),
    );
  });

  it("dia sem horários convida a esperar o primeiro", async () => {
    banco.tabelas["agendamentos"] = [];
    abrir(<VisaoGeral />);
    expect(await screen.findByText("Nenhum horário marcado para hoje.")).toBeInTheDocument();
  });

  it("se a leitura falha, avisa e deixa tentar de novo", async () => {
    banco.falhas.add("agendamentos");
    abrir(<VisaoGeral />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Não conseguimos carregar a agenda");
    banco.falhas.clear();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("group", { name: "Marcados hoje" })).toBeInTheDocument();
  });

  it("mostra o histórico de mudanças de um horário", async () => {
    banco.tabelas["agendamento_eventos"] = [
      { de: null, para: "agendado", em: "2026-10-10T13:00:00Z", perfis: null },
      { de: "agendado", para: "confirmado", em: "2026-10-11T13:30:00Z", perfis: { nome: "Dono" } },
    ];
    abrir(<VisaoGeral />);
    fireEvent.click(await screen.findByRole("button", { name: /Histórico.*Carla/ }));
    const dialogo = await screen.findByRole("dialog");
    expect(await within(dialogo).findByText("Agendado para Confirmado")).toBeInTheDocument();
    expect(within(dialogo).getByText(/por Dono/)).toBeInTheDocument();
  });
});

describe("Agendamentos", () => {
  it("lista tudo e filtra por situação", async () => {
    abrir(<Agendamentos />);
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrar status"), { target: { value: "concluido" } });
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Bruno")).not.toBeInTheDocument();
  });

  it("busca por cliente ou serviço", async () => {
    abrir(<Agendamentos />);
    await screen.findByText("Ana");
    fireEvent.change(screen.getByLabelText("Pesquisar registros"), {
      target: { value: "sobrancelha" },
    });
    expect(screen.getByText("Carla")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
  });

  it("filtra por data, no dia da barbearia", async () => {
    abrir(<Agendamentos />);
    await screen.findByText("Ana");
    fireEvent.change(screen.getByLabelText("Filtrar por data"), {
      target: { value: "2026-10-13" },
    });
    expect(screen.getByText("Eva")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
  });

  it("limpa os filtros", async () => {
    abrir(<Agendamentos />);
    await screen.findByText("Ana");
    fireEvent.change(screen.getByLabelText("Filtrar status"), { target: { value: "cancelado" } });
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("visão por semana: um bloco por dia, de segunda a domingo, com navegação", async () => {
    abrir(<Agendamentos />);
    await screen.findByText("Ana");
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(screen.getByText("12/10/2026 a 18/10/2026")).toBeInTheDocument();
    const segunda = screen.getByRole("region", { name: "segunda-feira, 12 de outubro" });
    expect(within(segunda).getByText("Ana")).toBeInTheDocument();
    expect(within(segunda).queryByText("Eva")).not.toBeInTheDocument();
    const terca = screen.getByRole("region", { name: "terça-feira, 13 de outubro" });
    expect(within(terca).getByText("Eva")).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(7);

    fireEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(screen.getByText("19/10/2026 a 25/10/2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Esta semana" }));
    expect(screen.getByText("12/10/2026 a 18/10/2026")).toBeInTheDocument();
  });
});

describe("Clientes", () => {
  const clientes = [
    { id: "c-a1", nome: "Ana", celular: "11999990001", criado_em: "2026-09-01T10:00:00Z" },
    { id: "c-a2", nome: "Bruno", celular: "11999990002", criado_em: "2026-09-02T10:00:00Z" },
    { id: "sem-agendamento", nome: "Zeca", celular: null, criado_em: "2026-10-01T10:00:00Z" },
  ];

  it("lista quem tem conta, com a contagem de agendamentos", async () => {
    banco.tabelas["perfis"] = clientes;
    abrir(<Clientes />);
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("3 clientes com conta")).toBeInTheDocument();
    expect(screen.getByText("Não informado")).toBeInTheDocument();
  });

  it("busca por nome ou celular", async () => {
    banco.tabelas["perfis"] = clientes;
    abrir(<Clientes />);
    await screen.findByText("Ana");
    fireEvent.change(screen.getByLabelText("Buscar cliente"), { target: { value: "0002" } });
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).not.toBeInTheDocument();
  });

  it("abre o histórico de um cliente", async () => {
    banco.tabelas["perfis"] = clientes;
    abrir(<Clientes />);
    fireEvent.click(await screen.findByRole("button", { name: /Ver histórico.*Ana/ }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("Corte clássico")).toBeInTheDocument();
    expect(within(dialogo).getByText("Concluído")).toBeInTheDocument();
  });

  it("sem clientes, explica de onde eles vêm", async () => {
    banco.tabelas["perfis"] = [];
    abrir(<Clientes />);
    expect(await screen.findByText("Nenhum cliente cadastrado.")).toBeInTheDocument();
  });
});
