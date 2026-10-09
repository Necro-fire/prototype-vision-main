import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ShopLayout } from "@/components/shop-layout";
import type { Contato } from "./banco";

function abrirComContato(contato: Contato | null) {
  const raiz = createRootRoute({
    loader: () => ({ expediente: null, contato }),
    component: () => (
      <ShopLayout>
        <p>Conteúdo</p>
      </ShopLayout>
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

afterEach(cleanup);

describe("Rodapé com o contato da barbearia", () => {
  it("mostra endereço, telefone, WhatsApp e Instagram que a barbearia informou", async () => {
    abrirComContato({
      nome: "ON-STYLE",
      endereco: "Rua das Estrelas, 123",
      telefone: "(11) 3333-4444",
      whatsapp: "(11) 99999-9999",
      instagram: "onstyle",
    });

    const lista = await screen.findByRole("list", { name: "Contato da barbearia" });
    expect(lista).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Rua das Estrelas, 123" })).toHaveAttribute(
      "href",
      expect.stringContaining("google.com/maps"),
    );
    expect(screen.getByRole("link", { name: "(11) 3333-4444" })).toHaveAttribute(
      "href",
      "tel:+551133334444",
    );
    expect(screen.getByRole("link", { name: "WhatsApp (11) 99999-9999" })).toHaveAttribute(
      "href",
      "https://wa.me/5511999999999",
    );
    expect(screen.getByRole("link", { name: "onstyle" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/onstyle/",
    );
  });

  it("não mostra o bloco enquanto a barbearia não informou nenhum dado", async () => {
    abrirComContato({
      nome: "ON-STYLE",
      endereco: null,
      telefone: null,
      whatsapp: null,
      instagram: null,
    });

    expect(await screen.findByText("Conteúdo")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Contato da barbearia" })).not.toBeInTheDocument();
  });

  it("some sem erro quando a leitura do contato falhou", async () => {
    abrirComContato(null);

    expect(await screen.findByText("Conteúdo")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Contato da barbearia" })).not.toBeInTheDocument();
  });
});
