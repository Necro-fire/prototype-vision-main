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

describe("Página de comparação do Letreiro, claro e escuro", () => {
  it("mostra as duas versões com os serviços do protótipo", async () => {
    abrir();
    expect(await screen.findByText(/^Letreiro claro\./)).toBeInTheDocument();
    expect(screen.getByText(/^Letreiro escuro\./)).toBeInTheDocument();
    expect(screen.getAllByText("Corte clássico")).toHaveLength(2);
  });

  it("acende o ON nas duas quando a barbearia está aberta", async () => {
    abrir("aberto");
    const avisos = await screen.findAllByText(/^Aberto agora, até as 19h$/);
    expect(avisos).toHaveLength(2);
    for (const aviso of avisos) expect(aviso).toHaveAttribute("data-ligado", "true");
  });

  it("apaga o ON nas duas quando a barbearia está fechada", async () => {
    abrir("fechado");
    const avisos = await screen.findAllByText(/^Fechado\. Abre /);
    expect(avisos).toHaveLength(2);
    for (const aviso of avisos) expect(aviso).toHaveAttribute("data-ligado", "false");
  });

  it("troca o estado pelo seletor", async () => {
    abrir("fechado");
    await screen.findAllByText(/^Fechado\. Abre /);
    const seletor = screen.getByRole("group", { name: "Estado da barbearia" });
    fireEvent.click(within(seletor).getByRole("button", { name: "Aberta" }));
    expect(await screen.findAllByText(/^Aberto agora/)).toHaveLength(2);
  });

  it("calcula o contraste e avisa o único par que não passa: laranja como texto no claro", async () => {
    abrir();
    await screen.findByText(/^Letreiro claro\./);
    const reprovados = screen.getAllByText(/\(não passa\)/);
    expect(reprovados).toHaveLength(1);
    expect(reprovados[0]?.closest("li")).toHaveTextContent("Laranja como texto (não usar)");
  });
});
