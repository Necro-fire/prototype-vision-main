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
import { Avaliacoes } from "@/features/admin/avaliacoes";
import { DialogoDeAvaliacao } from "./dialogo-de-avaliacao";
import { PaginaDeAvaliacoes } from "./pagina-de-avaliacoes";

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

function abrir(tela: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => <QueryClientProvider client={queryClient}>{tela}</QueryClientProvider>,
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
      createRoute({ getParentRoute: () => raiz, path: "/agendamento", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.rpc.mockReset();
});
afterEach(() => cleanup());

describe("Página pública de avaliações", () => {
  const dados = {
    resumo: { media: 4.5, total: 2 },
    avaliacoes: [
      {
        nota: 5,
        comentario: "Corte perfeito.",
        autor: "Maria L.",
        criadaEm: "2026-10-09T17:00:00Z",
      },
      { nota: 4, comentario: "", autor: "João", criadaEm: "2026-10-01T17:00:00Z" },
    ],
  };

  it("mostra a média com vírgula, o total e cada avaliação com autor e data", async () => {
    abrir(<PaginaDeAvaliacoes dados={dados} />);
    const media = await screen.findByRole("region", { name: "Nota média" });
    expect(media).toHaveTextContent("4,5");
    expect(media).toHaveTextContent("2 avaliações");
    const itens = within(
      screen.getByRole("region", { name: "Avaliações dos clientes" }),
    ).getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Maria L.");
    expect(itens[0]).toHaveTextContent("09/10/2026");
    expect(itens[0]).toHaveTextContent("Corte perfeito.");
    expect(within(itens[0]!).getByRole("img")).toHaveAccessibleName("5 de 5 estrelas");
    expect(within(itens[1]!).getByRole("img")).toHaveAccessibleName("4 de 5 estrelas");
  });

  it("sem avaliações, convida a agendar", async () => {
    abrir(<PaginaDeAvaliacoes dados={{ resumo: { media: null, total: 0 }, avaliacoes: [] }} />);
    expect(await screen.findByText(/Ainda não há avaliações/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agendar horário" })).toBeInTheDocument();
  });

  it("avisa quando não conseguiu carregar", async () => {
    abrir(<PaginaDeAvaliacoes dados={null} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não conseguimos carregar as avaliações",
    );
  });
});

describe("Diálogo de avaliação do cliente", () => {
  function abrirDialogo() {
    const aoAvaliar = vi.fn();
    const aoFechar = vi.fn();
    abrir(
      <DialogoDeAvaliacao
        agendamentoId="a1"
        servico="Corte clássico"
        aoAvaliar={aoAvaliar}
        aoFechar={aoFechar}
      />,
    );
    return { aoAvaliar, aoFechar };
  }

  it("exige a nota antes de enviar", async () => {
    abrirDialogo();
    fireEvent.click(await screen.findByRole("button", { name: "Enviar avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escolha de 1 a 5 estrelas.");
    expect(banco.rpc).not.toHaveBeenCalled();
  });

  it("envia nota e comentário sem espaços sobrando", async () => {
    banco.rpc.mockResolvedValue({ data: {}, error: null });
    const { aoAvaliar } = abrirDialogo();
    fireEvent.click(await screen.findByRole("radio", { name: "4 estrelas" }));
    fireEvent.change(screen.getByLabelText(/Comentário/), {
      target: { value: "  Gostei muito  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    await waitFor(() => expect(aoAvaliar).toHaveBeenCalled());
    expect(banco.rpc).toHaveBeenCalledWith("avaliar", {
      p_agendamento_id: "a1",
      p_nota: 4,
      p_comentario: "Gostei muito",
    });
  });

  it("mostra a mensagem do banco quando já foi avaliado", async () => {
    banco.rpc.mockResolvedValue({ data: null, error: { message: "ja_avaliado" } });
    const { aoAvaliar } = abrirDialogo();
    fireEvent.click(await screen.findByRole("radio", { name: "5 estrelas" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você já avaliou esse atendimento.");
    expect(aoAvaliar).not.toHaveBeenCalled();
  });

  it("'Agora não' fecha sem enviar", async () => {
    const { aoFechar } = abrirDialogo();
    fireEvent.click(await screen.findByRole("button", { name: "Agora não" }));
    expect(aoFechar).toHaveBeenCalled();
    expect(banco.rpc).not.toHaveBeenCalled();
  });
});

describe("Avaliações no painel do dono", () => {
  const linha = (extras: Linha = {}): Linha => ({
    id: "av1",
    nota: 5,
    comentario: "Excelente",
    autor_nome: "Maria L.",
    publicada: true,
    criada_em: "2026-10-09T17:00:00Z",
    perfis: { nome: "Maria Souza Lima" },
    agendamentos: { servico_nome: "Corte clássico" },
    ...extras,
  });

  it("mostra a média só das publicadas, e o nome completo que só o dono vê", async () => {
    banco.tabelas["avaliacoes"] = [
      linha(),
      linha({ id: "av2", nota: 2, comentario: "Demorou", publicada: false }),
    ];
    abrir(<Avaliacoes />);
    const media = await screen.findByRole("group", { name: "Nota média" });
    expect(media).toHaveTextContent("5,0");
    expect(screen.getByRole("group", { name: "Avaliações" })).toHaveTextContent(
      "1 publicadas, 1 ocultas",
    );
    const todas = screen.getByRole("region", { name: "Todas as avaliações" });
    const itens = within(todas).getAllByRole("listitem");
    expect(itens[0]).toHaveTextContent("Maria Souza Lima, Corte clássico");
    expect(itens[0]).toHaveTextContent("No site: Maria L.");
    expect(itens[1]).toHaveTextContent("Oculta");
  });

  it("oculta e volta a publicar pelo banco", async () => {
    banco.rpc.mockResolvedValue({ data: {}, error: null });
    banco.tabelas["avaliacoes"] = [linha(), linha({ id: "av2", publicada: false })];
    abrir(<Avaliacoes />);
    fireEvent.click(await screen.findByRole("button", { name: /Ocultar do site/ }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("moderar_avaliacao", {
        p_id: "av1",
        p_publicada: false,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Publicar no site/ }));
    await waitFor(() =>
      expect(banco.rpc).toHaveBeenCalledWith("moderar_avaliacao", {
        p_id: "av2",
        p_publicada: true,
      }),
    );
  });

  it("sem avaliações, explica como elas chegam", async () => {
    abrir(<Avaliacoes />);
    expect(await screen.findByText("Nenhuma avaliação ainda.")).toBeInTheDocument();
  });
});
