import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ShopProvider, useShop } from "@/features/demo/shop-provider";
import { MeusHorarios } from "./meus-horarios";

function nextMonday() {
  const d = new Date(2099, 0, 1, 12);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Dois agendamentos da Maria (um concluído) e um do Pedro, que ela não pode ver.
function ComDados({ children }: { children: ReactNode }) {
  const shop = useShop();
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const base = { date: nextMonday(), note: "" };
    shop.book({ ...base, name: "Maria", phone: "11999990001", serviceId: "1", time: "10:00" });
    shop.book({ ...base, name: "Maria", phone: "11999990001", serviceId: "2", time: "14:00" });
    shop.book({ ...base, name: "Pedro", phone: "11999990002", serviceId: "3", time: "16:00" });
    shop.setBookings((old) =>
      old.map((b) => (b.time === "14:00" ? { ...b, status: "Concluído" } : b)),
    );
    // Agendar deixa o último cliente "logado" no protótipo; começamos deslogados.
    shop.setCurrentPhone("");
    setPronto(true);
    // Semeia uma única vez, na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return pronto ? <>{children}</> : null;
}

function abrir() {
  const rootRoute = createRootRoute({
    component: () => (
      <ShopProvider>
        <ComDados>
          <MeusHorarios />
        </ComDados>
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

async function entrarComoMaria() {
  fireEvent.change(await screen.findByLabelText("Celular com DDD"), {
    target: { value: "(11) 99999-0001" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Ver meus horários" }));
}

afterEach(cleanup);

describe("Meus horários", () => {
  it("pede o celular com DDD antes de mostrar qualquer coisa", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText("Celular com DDD"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver meus horários" }));
    expect(await screen.findByText(/Digite o celular com DDD/)).toBeInTheDocument();
    expect(screen.queryByText("Próximos")).not.toBeInTheDocument();
  });

  it("mostra só os agendamentos de quem entrou, separados em próximos e histórico", async () => {
    abrir();
    await entrarComoMaria();
    const proximos = await screen.findByRole("region", { name: "Próximos" });
    expect(within(proximos).getByText("Corte clássico")).toBeInTheDocument();
    const historico = screen.getByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Barba & navalha")).toBeInTheDocument();
    expect(within(historico).getByText("Concluído")).toBeInTheDocument();
    expect(screen.queryByText("Corte + barba")).not.toBeInTheDocument();
  });

  it("cancela só depois de confirmar no diálogo", async () => {
    abrir();
    await entrarComoMaria();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar agendamento" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText("Cancelar este agendamento?")).toBeInTheDocument();
    // Desistir não cancela nada
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter agendamento" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Próximos" })).toHaveTextContent("Corte clássico");
    // Confirmar cancela e manda o agendamento para o histórico
    fireEvent.click(screen.getByRole("button", { name: "Cancelar agendamento" }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Cancelar agendamento" }));
    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Cancelado")).toBeInTheDocument();
  });

  it("sai e volta para a tela de celular", async () => {
    abrir();
    await entrarComoMaria();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect(await screen.findByLabelText("Celular com DDD")).toBeInTheDocument();
  });
});
