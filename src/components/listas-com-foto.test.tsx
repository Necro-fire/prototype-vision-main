import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import type { Catalogo, Produto } from "@/features/catalogo/banco";
import { ProductList } from "./product-list";
import { ServiceList } from "./service-list";

function abrir(tela: ReactNode) {
  const raiz = createRootRoute({ component: () => tela });
  const router = createRouter({
    routeTree: raiz.addChildren([
      createRoute({ getParentRoute: () => raiz, path: "/", component: () => null }),
      createRoute({ getParentRoute: () => raiz, path: "/agendamento", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}
afterEach(cleanup);

const catalogo: Catalogo = {
  categorias: ["Cortes"],
  servicos: [
    {
      id: "s1",
      nome: "Corte clássico",
      categoria: "Cortes",
      descricao: "",
      precoCentavos: 4500,
      duracaoMinutos: 30,
      destaque: false,
      fotoUrl: "https://x/corte.webp",
    },
    {
      id: "s2",
      nome: "Barba",
      categoria: "Cortes",
      descricao: "",
      precoCentavos: 3500,
      duracaoMinutos: 30,
      destaque: false,
      fotoUrl: null,
    },
  ],
};

describe("Serviços com foto", () => {
  it("mostra a foto só de quem tem, sem quebrar a linha de quem não tem", async () => {
    abrir(<ServiceList catalogo={catalogo} />);
    const lista = await screen.findByRole("list", { name: "Serviços e preços" });
    const [corte, barba] = within(lista).getAllByRole("listitem");
    expect(corte!.querySelector("img")).toHaveAttribute("src", "https://x/corte.webp");
    expect(barba!.querySelector("img")).toBeNull();
    // O nome e o preço continuam no lugar, com ou sem foto.
    expect(corte).toHaveTextContent("Corte clássico");
    expect(corte).toHaveTextContent("R$");
    expect(barba).toHaveTextContent("Barba");
  });

  it("a foto é enfeite: o nome do serviço continua sendo o nome do link", async () => {
    abrir(<ServiceList catalogo={catalogo} />);
    expect(await screen.findByRole("link", { name: /^Corte clássico/ })).toBeInTheDocument();
  });
});

describe("Produtos com foto", () => {
  const produtos: Produto[] = [
    {
      id: "p1",
      nome: "Pomada",
      descricao: "Fixação forte",
      precoCentavos: 3990,
      fotoUrl: "https://x/p.webp",
    },
    { id: "p2", nome: "Pente", descricao: "", precoCentavos: 2500, fotoUrl: null },
  ];

  it("mostra a foto só de quem tem", async () => {
    abrir(<ProductList produtos={produtos} />);
    const lista = await screen.findByRole("list", { name: "Produtos e preços" });
    const [pomada, pente] = within(lista).getAllByRole("listitem");
    expect(pomada!.querySelector("img")).toHaveAttribute("src", "https://x/p.webp");
    expect(pente!.querySelector("img")).toBeNull();
    expect(pomada).toHaveTextContent("Fixação forte");
  });
});
