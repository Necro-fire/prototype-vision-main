import { useEffect, useState, type ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { ShopProvider, useShop } from "@/features/demo/shop-provider";
import { AdminPanel } from "./painel";

function nextMonday() {
  const d = new Date("2099-01-01T12:00:00");
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
const monday = nextMonday();

// Três agendamentos e duas vendas, para que cada módulo tenha o que mostrar.
function ComDados({ children }: { children: ReactNode }) {
  const shop = useShop();
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const base = { date: monday, note: "" };
    shop.book({ ...base, name: "João Silva", phone: "11999990001", serviceId: "3", time: "10:00" });
    shop.book({
      ...base,
      name: "Pedro Souza",
      phone: "11999990002",
      serviceId: "1",
      time: "14:00",
    });
    shop.book({ ...base, name: "Ana Lima", phone: "11999990003", serviceId: "2", time: "16:00" });
    shop.setBookings((old) =>
      old.map((b) =>
        b.time === "10:00"
          ? { ...b, status: "Concluído" }
          : b.time === "16:00"
            ? { ...b, status: "Cancelado" }
            : b,
      ),
    );
    shop.sell("1", 2, monday);
    shop.sell("3", 1, monday);
    setPronto(true);
    // Semeia uma única vez, na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pronto ? <>{children}</> : null;
}

function mostrar(module: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <ShopProvider>
        <ComDados>
          <Outlet />
        </ComDados>
      </ShopProvider>
    ),
  });
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <AdminPanel module={module} />,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

afterEach(cleanup);

describe("Painel administrativo", () => {
  it.each([
    ["vendas", "Vendas"],
    ["financeiro", "Financeiro"],
    ["configuracoes", "Configurações"],
  ])("abre o módulo %s", async (module, titulo) => {
    mostrar(module);
    expect(await screen.findByRole("heading", { level: 1, name: titulo })).toBeInTheDocument();
  });

  it("avisa quando o módulo não existe", async () => {
    mostrar("inexistente");
    expect(await screen.findByText("Módulo não encontrado.")).toBeInTheDocument();
  });

  it("soma serviços concluídos e vendas no faturamento", async () => {
    mostrar("financeiro");
    // Corte + barba (R$ 70) + 2 máquinas (R$ 378) + 1 pente (R$ 25)
    const cartao = (await screen.findByText("Faturamento bruto")).closest(
      '[role="group"]',
    ) as HTMLElement;
    expect(within(cartao).getByText(/473,00/)).toBeInTheDocument();
  });
});
