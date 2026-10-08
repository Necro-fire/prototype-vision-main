import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShopProvider } from "@/features/demo/shop-provider";
import { PaginaIdentidade } from "./pagina";

function abrir(estado?: "aberto" | "fechado") {
  const rootRoute = createRootRoute({
    component: () => (
      <ShopProvider>
        <PaginaIdentidade estadoInicial={estado} />
      </ShopProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("Página de comparação das direções de identidade", () => {
  it("mostra as três direções com os serviços do protótipo", async () => {
    abrir();
    for (const nome of ["Letreiro", "Azulejo", "Poste"]) {
      expect(await screen.findByText(new RegExp(`^Direção [ABC]: ${nome}`))).toBeInTheDocument();
    }
    expect(screen.getAllByText("Corte clássico").length).toBeGreaterThanOrEqual(3);
  });

  it("acende o ON nas três quando a barbearia está aberta", async () => {
    abrir("aberto");
    const avisos = await screen.findAllByText(/^Aberto agora, até as 19h$/);
    expect(avisos).toHaveLength(3);
    for (const aviso of avisos) expect(aviso).toHaveAttribute("data-ligado", "true");
  });

  it("apaga o ON nas três quando a barbearia está fechada", async () => {
    abrir("fechado");
    const avisos = await screen.findAllByText(/^Fechado\. Abre /);
    expect(avisos).toHaveLength(3);
    for (const aviso of avisos) expect(aviso).toHaveAttribute("data-ligado", "false");
  });

  it("troca o estado pelo seletor", async () => {
    abrir("fechado");
    await screen.findAllByText(/^Fechado\. Abre /);
    const seletor = screen.getByRole("group", { name: "Estado da barbearia" });
    fireEvent.click(within(seletor).getByRole("button", { name: "Aberta" }));
    expect(await screen.findAllByText(/^Aberto agora/)).toHaveLength(3);
  });

  it("calcula o contraste dos pares de cor e avisa o único que não passa", async () => {
    abrir();
    await screen.findByText(/^Direção A/);
    // O azul do Poste sobre o fundo escuro não serve de texto nem de borda, e a página diz isso.
    expect(screen.getAllByText(/\(não passa\)/)).toHaveLength(1);
  });
});
