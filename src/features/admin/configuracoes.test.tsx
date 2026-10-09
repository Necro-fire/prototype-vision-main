import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Expediente } from "@/features/agenda/expediente";
import { Configuracoes } from "./configuracoes";

type Linha = Record<string, unknown>;
type Escrita = { tabela: string; op: string; linha?: Linha; id?: unknown };

// O Supabase é simulado no nível do cliente: leituras devolvem linhas como o banco, e as escritas
// ficam registradas para conferir o que seria gravado.
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const escritas: Escrita[] = [];
  const estado = { falha: null as string | null };
  const rpc = vi.fn();
  const from = (tabela: string) => {
    const atual: { op: string; linha?: Linha; id?: unknown } = { op: "select" };
    const concluir = () => {
      if (atual.op === "select") return { data: tabelas[tabela] ?? [], error: null };
      escritas.push({ tabela, ...atual });
      return { data: null, error: estado.falha ? { message: estado.falha } : null };
    };
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      insert: (linha: Linha) => {
        atual.op = "insert";
        atual.linha = linha;
        return consulta;
      },
      update: (linha: Linha) => {
        atual.op = "update";
        atual.linha = linha;
        return consulta;
      },
      delete: () => {
        atual.op = "delete";
        return consulta;
      },
      eq: (_coluna: string, valor: unknown) => {
        atual.id = valor;
        return consulta;
      },
      single: () => Promise.resolve({ data: (tabelas[tabela] ?? [])[0] ?? null, error: null }),
      then: (resolver: (r: unknown) => void) => resolver(concluir()),
    };
    return consulta;
  };
  return { tabelas, escritas, estado, rpc, from };
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
const local = (dia: number, hora: number, mes = 9) =>
  new Date(Date.UTC(2026, mes, dia, hora + 3)).toISOString();

function abrir() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <Configuracoes />
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: AGORA });
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.escritas.length = 0;
  banco.estado.falha = null;
  banco.rpc.mockReset();
  banco.tabelas["empresa"] = [
    {
      nome: "ON-STYLE",
      endereco: "Rua das Flores, 10",
      telefone: null,
      whatsapp: null,
      instagram: null,
      grade_minutos: 30,
      antecedencia_max_dias: 30,
      max_agendamentos_futuros: 3,
    },
  ];
  banco.tabelas["funcionamento"] = [1, 2, 3, 4, 5, 6].map((dia) => ({
    dia_semana: dia,
    abre: "09:00:00",
    fecha: "19:00:00",
  }));
  banco.tabelas["bloqueios"] = [
    { id: "b-passado", inicio: local(1, 0), fim: local(2, 0), motivo: "Já passou" },
    { id: "b-natal", inicio: local(25, 0, 11), fim: local(26, 0, 11), motivo: "Natal" },
  ];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Dados da barbearia", () => {
  it("abre com o que está cadastrado", async () => {
    abrir();
    expect(await screen.findByLabelText("Nome")).toHaveValue("ON-STYLE");
    expect(screen.getByLabelText(/Endereço/)).toHaveValue("Rua das Flores, 10");
    expect(screen.getByLabelText(/Telefone/)).toHaveValue("");
  });

  it("salva: vazio vira nulo e o Instagram guarda só o usuário", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/Telefone/), {
      target: { value: "(11) 91234-5678" },
    });
    fireEvent.change(screen.getByLabelText(/Instagram/), {
      target: { value: "https://www.instagram.com/onstyle/" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByText(/Dados salvos/)).toBeInTheDocument();
    expect(banco.escritas).toEqual([
      {
        tabela: "empresa",
        op: "update",
        id: 1,
        linha: {
          nome: "ON-STYLE",
          endereco: "Rua das Flores, 10",
          telefone: "(11) 91234-5678",
          whatsapp: null,
          instagram: "onstyle",
        },
      },
    ]);
  });

  it("não grava nome vazio nem telefone sem DDD", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText(/WhatsApp/), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByText("Informe o nome da barbearia.")).toBeInTheDocument();
    expect(screen.getByText(/Informe o número com DDD/)).toBeInTheDocument();
    expect(banco.escritas).toEqual([]);
  });
});

describe("Horário de funcionamento", () => {
  it("mostra cada dia, com o domingo fechado", async () => {
    abrir();
    expect(await screen.findByLabelText("Segunda: abre")).toHaveValue("09:00");
    expect(screen.getByLabelText("Segunda: fecha")).toHaveValue("19:00");
    expect(screen.getByRole("checkbox", { name: "Domingo" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Segunda" })).toBeChecked();
    expect(screen.queryByLabelText("Domingo: abre")).not.toBeInTheDocument();
  });

  it("salva a lista inteira de uma vez, em ordem, com o dia novo", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: null });
    abrir();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Domingo" }));
    fireEvent.change(screen.getByLabelText("Domingo: fecha"), { target: { value: "13:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(await screen.findByText(/Horários salvos/)).toBeInTheDocument();
    const [nome, args] = banco.rpc.mock.calls[0] as [string, { p_intervalos: unknown[] }];
    expect(nome).toBe("salvar_funcionamento");
    expect(args.p_intervalos).toHaveLength(7);
    expect(args.p_intervalos[0]).toEqual({ dia_semana: 0, abre: "09:00", fecha: "13:00" });
    expect(args.p_intervalos[1]).toEqual({ dia_semana: 1, abre: "09:00", fecha: "19:00" });
  });

  it("almoço: dois horários no mesmo dia", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: null });
    abrir();
    await screen.findByLabelText("Segunda: abre");
    fireEvent.change(screen.getByLabelText("Segunda: fecha"), { target: { value: "12:00" } });
    fireEvent.click(screen.getByRole("button", { name: /Adicionar horário em Segunda/ }));
    // O novo horário entra depois do primeiro, 14h às 18h.
    const fechas = screen.getAllByLabelText("Segunda: fecha");
    expect(fechas).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    await screen.findByText(/Horários salvos/);
    const enviados = (banco.rpc.mock.calls[0]?.[1] as { p_intervalos: Linha[] }).p_intervalos;
    expect(enviados.filter((i) => i["dia_semana"] === 1)).toEqual([
      { dia_semana: 1, abre: "09:00", fecha: "12:00" },
      { dia_semana: 1, abre: "14:00", fecha: "18:00" },
    ]);
  });

  it("horários que se sobrepõem não vão para o banco", async () => {
    abrir();
    await screen.findByLabelText("Segunda: abre");
    fireEvent.click(screen.getByRole("button", { name: /Adicionar horário em Segunda/ }));
    fireEvent.change(screen.getAllByLabelText("Segunda: abre")[1]!, { target: { value: "18:00" } });
    fireEvent.change(screen.getAllByLabelText("Segunda: fecha")[1]!, {
      target: { value: "20:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(
      await screen.findByText("Segunda: Os horários do dia se sobrepõem."),
    ).toBeInTheDocument();
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it("fechamento antes da abertura é recusado na tela", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText("Terça: fecha"), { target: { value: "08:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(
      await screen.findByText("Terça: O fechamento precisa ser depois da abertura."),
    ).toBeInTheDocument();
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it("mostra a mensagem do banco quando ele recusa", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: { message: "sem_permissao" } });
    abrir();
    await screen.findByLabelText("Segunda: abre");
    fireEvent.click(screen.getByRole("button", { name: "Salvar horários" }));
    expect(await screen.findByText("Você não tem permissão para fazer isso.")).toBeInTheDocument();
  });

  it("fechar o dia some com os horários dele", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Sábado" }));
    expect(screen.queryByLabelText("Sábado: abre")).not.toBeInTheDocument();
    expect(screen.getAllByText("Fechado").length).toBeGreaterThanOrEqual(2);
  });
});

describe("Regras da agenda", () => {
  it("abre com os valores atuais e salva com os nomes das colunas", async () => {
    abrir();
    expect(await screen.findByLabelText(/Intervalo entre horários/)).toHaveValue("30");
    expect(screen.getByLabelText(/Agenda aberta até/)).toHaveValue("30");
    fireEvent.change(screen.getByLabelText(/Intervalo entre horários/), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/Horários futuros por cliente/), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
    expect(await screen.findByText("Regras salvas.")).toBeInTheDocument();
    expect(banco.escritas).toEqual([
      {
        tabela: "empresa",
        op: "update",
        id: 1,
        linha: { grade_minutos: 15, antecedencia_max_dias: 30, max_agendamentos_futuros: 5 },
      },
    ]);
  });

  it("recusa valores fora dos limites do banco", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/Agenda aberta até/), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText(/Horários futuros por cliente/), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar regras" }));
    expect(await screen.findByText("Use de 1 a 365 dias.")).toBeInTheDocument();
    expect(screen.getByText("Use de 1 a 20 horários.")).toBeInTheDocument();
    expect(banco.escritas).toEqual([]);
  });
});

describe("Bloqueios e folgas", () => {
  it("lista só o que ainda não terminou", async () => {
    abrir();
    const lista = await screen.findByRole("list", { name: "Bloqueios" });
    expect(within(lista).getByText("Natal")).toBeInTheDocument();
    expect(within(lista).queryByText("Já passou")).not.toBeInTheDocument();
  });

  it("bloqueia um feriado: dia inteiro, no horário da barbearia", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/De \(data\)/), {
      target: { value: "2026-11-02" },
    });
    fireEvent.change(screen.getByLabelText(/Motivo/), {
      target: { value: " Finados " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquear período" }));
    expect(await screen.findByText(/Período bloqueado/)).toBeInTheDocument();
    expect(banco.escritas).toEqual([
      {
        tabela: "bloqueios",
        op: "insert",
        linha: {
          inicio: "2026-11-02T03:00:00.000Z",
          fim: "2026-11-03T03:00:00.000Z",
          motivo: "Finados",
        },
      },
    ]);
  });

  it("período no meio do dia", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/De \(data\)/), {
      target: { value: "2026-11-05" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Dia inteiro" }));
    fireEvent.change(screen.getByLabelText("Das"), { target: { value: "12:00" } });
    fireEvent.change(screen.getByLabelText("Às"), { target: { value: "14:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Bloquear período" }));
    await screen.findByText(/Período bloqueado/);
    expect(banco.escritas[0]?.linha).toMatchObject({
      inicio: "2026-11-05T15:00:00.000Z",
      fim: "2026-11-05T17:00:00.000Z",
    });
  });

  it("pede a data antes de bloquear", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Bloquear período" }));
    expect(await screen.findByText("Informe a data.")).toBeInTheDocument();
    expect(banco.escritas).toEqual([]);
  });

  it("avisa quando já existe agendamento no período, sem bloquear", async () => {
    banco.estado.falha = "bloqueio_com_agendamento";
    abrir();
    fireEvent.change(await screen.findByLabelText(/De \(data\)/), {
      target: { value: "2026-10-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bloquear período" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Há agendamento nesse período");
  });

  it("remove só depois de confirmar", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: /Remover bloqueio: Natal/ }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter bloqueio" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(banco.escritas).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /Remover bloqueio: Natal/ }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Remover bloqueio" }));
    await waitFor(() =>
      expect(banco.escritas).toEqual([{ tabela: "bloqueios", op: "delete", id: "b-natal" }]),
    );
  });
});
