import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { moduleNames } from "./modulos";
import { AdminPanel } from "./painel";

function mostrar(module: string) {
  const raiz = createRootRoute({ component: () => <AdminPanel module={module} /> });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("Painel administrativo", () => {
  it("avisa quando o módulo não existe e leva de volta ao início", async () => {
    mostrar("inexistente");
    expect(await screen.findByText("Módulo não encontrado.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar à visão geral" })).toBeInTheDocument();
  });

  it("dá nome em português a cada módulo do menu", () => {
    expect(Object.keys(moduleNames).sort()).toEqual(
      [
        "agendamentos",
        "alertas",
        "caixa",
        "clientes",
        "configuracoes",
        "dashboard",
        "financeiro",
        "produtos",
        "servicos",
        "vendas",
      ].sort(),
    );
    expect(moduleNames["dashboard"]).toBe("Hoje");
  });
});
