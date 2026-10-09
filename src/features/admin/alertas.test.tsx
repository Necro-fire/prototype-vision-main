import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Alertas } from "./alertas";
import { useAlertasEmTempoReal } from "./alertas-do-dono";
import { Sino } from "./sino";

type Linha = Record<string, unknown>;
type Escrita = { op: string; linha?: Linha; id?: unknown; filtro?: string };

const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const escritas: Escrita[] = [];
  const estado = { falhaDeLeitura: false, leituras: 0 };
  const quandoChegarAlerta: { chamar: (() => void) | null } = { chamar: null };
  const canal = {
    on: vi.fn((_tipo: string, _filtro: unknown, aoChegar: () => void) => {
      quandoChegarAlerta.chamar = aoChegar;
      return canal;
    }),
    subscribe: vi.fn(() => canal),
  };
  const removeChannel = vi.fn();
  const channel = vi.fn(() => canal);
  const from = (tabela: string) => {
    const atual: Escrita = { op: "select" };
    const concluir = () => {
      if (atual.op === "select") {
        estado.leituras += 1;
        if (estado.falhaDeLeitura) return { data: null, error: { message: "rede" } };
        return { data: tabelas[tabela] ?? [], error: null };
      }
      escritas.push({ ...atual });
      return { data: null, error: null };
    };
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      limit: () => consulta,
      update: (linha: Linha) => {
        atual.op = "update";
        atual.linha = linha;
        return consulta;
      },
      eq: (_coluna: string, valor: unknown) => {
        atual.id = valor;
        return consulta;
      },
      gte: () => consulta,
      is: (coluna: string) => {
        atual.filtro = `${coluna} is null`;
        return consulta;
      },
      then: (resolver: (r: unknown) => void) => resolver(concluir()),
    };
    return consulta;
  };
  const rpc = vi.fn(async (nome: string, argumentos: Linha) => {
    escritas.push({ op: `rpc:${nome}`, linha: argumentos });
    return { data: null, error: null };
  });
  return {
    tabelas,
    escritas,
    estado,
    canal,
    channel,
    removeChannel,
    quandoChegarAlerta,
    from,
    rpc,
  };
});
vi.mock("@/lib/supabase-navegador", () => ({
  supabaseNavegador: () => ({
    from: banco.from,
    rpc: banco.rpc,
    channel: banco.channel,
    removeChannel: banco.removeChannel,
  }),
}));
vi.mock("@/features/agenda/use-funcionamento", async (importar) => ({
  ...(await importar<typeof import("@/features/agenda/use-funcionamento")>()),
  useExpediente: () => null,
}));

const alerta = (id: string, tipo: string, texto: string, lido: boolean): Linha => ({
  id,
  tipo,
  texto,
  criado_em: "2026-10-12T15:00:00Z",
  lido_em: lido ? "2026-10-12T16:00:00Z" : null,
});

function abrir(tela: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => <QueryClientProvider client={queryClient}>{tela}</QueryClientProvider>,
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
      createRoute({ getParentRoute: () => raiz, path: "/admin/$module", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.escritas.length = 0;
  banco.estado.falhaDeLeitura = false;
  banco.estado.leituras = 0;
  banco.quandoChegarAlerta.chamar = null;
  vi.clearAllMocks();
  banco.tabelas["alertas"] = [
    alerta("a1", "novo_agendamento", "Ana agendou Corte clássico para 13/10 às 09:00.", false),
    alerta("a2", "cancelamento", "Bruno cancelou Barba de 12/10 às 10:00.", false),
    alerta("a3", "remarcacao", "Carla remarcou Sobrancelha.", true),
  ];
});
afterEach(cleanup);

describe("Alertas", () => {
  it("lista o histórico, com o tipo de cada um e o que ainda é novo", async () => {
    abrir(<Alertas />);
    const lista = await screen.findByRole("list", { name: "Alertas" });
    expect(lista).toHaveTextContent("Ana agendou Corte clássico");
    expect(lista).toHaveTextContent("Novo agendamento");
    expect(lista).toHaveTextContent("Cancelamento");
    expect(lista).toHaveTextContent("Remarcação");
    // Dois não lidos, um lido: só os não lidos têm o botão e a marca "Novo".
    expect(screen.getAllByText("Novo")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /Marcar como lido/ })).toHaveLength(2);
  });

  it("marca um alerta como lido", async () => {
    abrir(<Alertas />);
    fireEvent.click(await screen.findByRole("button", { name: /Marcar como lido.*Ana agendou/ }));
    await waitFor(() => expect(banco.escritas).toHaveLength(1));
    expect(banco.escritas[0]).toMatchObject({ op: "update", id: "a1" });
    expect(typeof banco.escritas[0]?.linha?.["lido_em"]).toBe("string");
  });

  it("marca todos como lidos de uma vez, só os que ainda não foram lidos", async () => {
    abrir(<Alertas />);
    fireEvent.click(await screen.findByRole("button", { name: "Marcar todos como lidos" }));
    await waitFor(() => expect(banco.escritas).toHaveLength(1));
    expect(banco.escritas[0]).toMatchObject({ op: "update", filtro: "lido_em is null" });
  });

  it("sem nada não lido, o botão de marcar todos fica desligado", async () => {
    banco.tabelas["alertas"] = [alerta("a3", "remarcacao", "Carla remarcou Sobrancelha.", true)];
    abrir(<Alertas />);
    await screen.findByRole("list", { name: "Alertas" });
    expect(screen.getByRole("button", { name: "Marcar todos como lidos" })).toBeDisabled();
  });

  it("o alerta de e-mail que não saiu aparece com o nome do tipo", async () => {
    banco.tabelas["alertas"] = [
      alerta(
        "a9",
        "email_falhou",
        "Não conseguimos enviar o e-mail de lembrete para ana@exemplo.com.",
        false,
      ),
    ];
    abrir(<Alertas />);
    const lista = await screen.findByRole("list", { name: "Alertas" });
    expect(lista).toHaveTextContent("E-mail não enviado");
    expect(lista).toHaveTextContent("ana@exemplo.com");
  });

  it("sem e-mail com problema, a seção nem aparece", async () => {
    abrir(<Alertas />);
    await screen.findByRole("list", { name: "Alertas" });
    expect(screen.queryByText("E-mails que não saíram")).not.toBeInTheDocument();
  });

  it("lista os e-mails que desistiram, com o motivo, e deixa tentar de novo", async () => {
    banco.tabelas["emails_fila"] = [
      {
        id: "e1",
        destinatario: "ana@exemplo.com",
        modelo: "lembrete",
        erro: "Resend 403: The domain is not verified",
      },
    ];
    abrir(<Alertas />);
    const lista = await screen.findByRole("list", { name: "E-mails que não saíram" });
    expect(lista).toHaveTextContent("Lembrete para ana@exemplo.com");
    expect(lista).toHaveTextContent("Motivo: Resend 403: The domain is not verified");
    fireEvent.click(screen.getByRole("button", { name: /Tentar de novo.*ana@exemplo.com/ }));
    await waitFor(() => expect(banco.escritas).toHaveLength(1));
    expect(banco.escritas[0]).toEqual({ op: "rpc:reenviar_email", linha: { p_id: "e1" } });
  });

  it("sem alertas, explica quando eles aparecem", async () => {
    banco.tabelas["alertas"] = [];
    abrir(<Alertas />);
    expect(await screen.findByText("Nenhum alerta por enquanto.")).toBeInTheDocument();
  });

  it("se a leitura falha, avisa e deixa tentar de novo", async () => {
    banco.estado.falhaDeLeitura = true;
    abrir(<Alertas />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não conseguimos carregar os alertas",
    );
    banco.estado.falhaDeLeitura = false;
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("list", { name: "Alertas" })).toBeInTheDocument();
  });
});

describe("Sino", () => {
  it("mostra quantos alertas não foram lidos, também para leitor de tela", async () => {
    abrir(<Sino />);
    const sino = await screen.findByRole("link", { name: "Alertas, 2 não lidos" });
    expect(sino).toHaveTextContent("2");
  });

  it("sem pendências, fica sem número", async () => {
    banco.tabelas["alertas"] = [alerta("a3", "remarcacao", "Carla remarcou.", true)];
    abrir(<Sino />);
    const sino = await screen.findByRole("link", { name: "Alertas" });
    expect(sino).not.toHaveTextContent(/\d/);
  });
});

describe("Tempo real", () => {
  function Escuta() {
    useAlertasEmTempoReal();
    return <Sino />;
  }

  it("assina os alertas novos e desfaz a assinatura ao sair", async () => {
    const { unmount } = abrir(<Escuta />);
    await screen.findByRole("link", { name: /Alertas/ });
    expect(banco.channel).toHaveBeenCalledWith("alertas-do-dono");
    expect(banco.canal.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "alertas" },
      expect.any(Function),
    );
    expect(banco.canal.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(banco.removeChannel).toHaveBeenCalledTimes(1);
  });

  it("quando chega um alerta, o sino se atualiza sem recarregar a página", async () => {
    abrir(<Escuta />);
    await screen.findByRole("link", { name: "Alertas, 2 não lidos" });
    const leiturasAntes = banco.estado.leituras;
    banco.tabelas["alertas"] = [
      alerta("a4", "novo_agendamento", "Davi agendou Corte clássico.", false),
      ...(banco.tabelas["alertas"] ?? []),
    ];
    banco.quandoChegarAlerta.chamar?.();
    expect(await screen.findByRole("link", { name: "Alertas, 3 não lidos" })).toBeInTheDocument();
    expect(banco.estado.leituras).toBeGreaterThan(leiturasAntes);
  });
});
