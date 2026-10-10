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

import { lerOcupados } from "@/features/agenda/banco";
import type { Expediente } from "@/features/agenda/expediente";
import type { Catalogo } from "@/features/catalogo/banco";
import { PainelDeAgendamento } from "./painel-de-agendamento";

// O banco é simulado: aqui se testa a tela. A regra dos horários tem os próprios testes.
vi.mock("@/features/agenda/banco", async (importar) => ({
  ...(await importar<typeof import("@/features/agenda/banco")>()),
  lerOcupados: vi.fn(),
}));

const servico = (id: string, nome: string, precoCentavos: number, duracaoMinutos: number) => ({
  id,
  nome,
  categoria: null,
  descricao: "",
  precoCentavos,
  duracaoMinutos,
  destaque: false,
  fotoUrl: null,
});

const catalogo: Catalogo = {
  categorias: [],
  servicos: [servico("s1", "Corte clássico", 4500, 30), servico("s2", "Corte + barba", 7000, 60)],
};

const util = [{ abre: "09:00", fecha: "19:00" }];
// Segunda a sábado, das 9h às 19h; domingo fechado.
const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [[], util, util, util, util, util, util],
};

function abrir(dados: Catalogo | null = catalogo) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    loader: () => ({ expediente, contato: null, servicos: null }),
  });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({
        getParentRoute: () => raiz,
        path: "/",
        component: () => (
          <QueryClientProvider client={queryClient}>
            <PainelDeAgendamento catalogo={dados} />
          </QueryClientProvider>
        ),
      }),
      createRoute({ getParentRoute: () => raiz, path: "/agendamento", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

const horarios = () => screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });

beforeEach(() => {
  vi.mocked(lerOcupados).mockReset().mockResolvedValue([]);
});
afterEach(cleanup);

describe("Painel de agendamento da página inicial", () => {
  it("abre com o primeiro serviço escolhido e já mostra os horários livres", async () => {
    abrir();
    expect(await screen.findByRole("radio", { name: /Corte clássico/ })).toBeChecked();
    expect((await horarios()).length).toBeGreaterThan(0);
    expect(screen.getByRole("list", { name: "Passos do agendamento" })).toHaveTextContent(
      "Dia e horário",
    );
  });

  it("pede o horário antes de seguir para a confirmação", async () => {
    const router = abrir();
    await horarios();
    fireEvent.click(screen.getByRole("button", { name: "Revisar agendamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Escolha um horário livre para continuar.",
    );
    expect(router.state.location.pathname).toBe("/");
  });

  it("leva o serviço e o horário escolhidos para a confirmação em /agendamento", async () => {
    const router = abrir();
    fireEvent.click(await screen.findByRole("radio", { name: /Corte \+ barba/ }));
    const [primeiro] = await horarios();
    fireEvent.click(primeiro!);
    expect(primeiro).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Revisar agendamento" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/agendamento"));
    const busca: Record<string, unknown> = router.state.location.search;
    expect(busca["service"]).toBe("s2");
    expect(Number.isNaN(Date.parse(String(busca["inicio"])))).toBe(false);
  });

  it("trocar de serviço descarta o horário, porque a duração muda", async () => {
    abrir();
    const [primeiro] = await horarios();
    fireEvent.click(primeiro!);
    fireEvent.click(screen.getByRole("radio", { name: /Corte \+ barba/ }));
    const resumo = (await screen.findByText("Resumo do agendamento")).closest("div");
    expect(within(resumo!).getByText("Escolha um horário")).toBeInTheDocument();
    expect(within(resumo!).getAllByText("Corte + barba").length).toBeGreaterThan(0);
  });

  it("avisa quando os serviços não carregaram", async () => {
    abrir(null);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não conseguimos carregar os serviços",
    );
  });
});
