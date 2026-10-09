import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErroDoBanco, excluirMinhaConta, salvarPerfil } from "@/features/agenda/agendamentos";
import { PerfilDoCliente } from "./perfil";
import type { Sessao } from "./sessao";

vi.mock("@/features/agenda/agendamentos", async (importar) => ({
  ...(await importar<typeof import("@/features/agenda/agendamentos")>()),
  salvarPerfil: vi.fn(),
  excluirMinhaConta: vi.fn(),
}));
const sair = vi.hoisted(() => vi.fn());
vi.mock("./sair", () => ({ useSair: () => sair }));

const sessao: Sessao = {
  id: "u1",
  email: "maria@exemplo.com",
  nome: "Maria Souza",
  celular: "11999990001",
  papel: "cliente",
  lembretesPorEmail: true,
};

function abrir() {
  const rootRoute = createRootRoute({ component: () => <PerfilDoCliente sessao={sessao} /> });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.mocked(salvarPerfil).mockReset();
  vi.mocked(excluirMinhaConta).mockReset();
  sair.mockReset();
});
afterEach(cleanup);

describe("Perfil do cliente", () => {
  it("mostra os dados da conta, com o e-mail só para leitura", async () => {
    abrir();
    expect(await screen.findByLabelText("Nome")).toHaveValue("Maria Souza");
    expect(screen.getByLabelText("Celular com DDD")).toHaveValue("11999990001");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("readonly");
    expect(screen.getByRole("checkbox", { name: /lembrete por e-mail/ })).toBeChecked();
  });

  it("não salva nome vazio nem celular sem DDD", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Celular com DDD"), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByText(/Informe o celular com DDD/)).toBeInTheDocument();
    expect(salvarPerfil).not.toHaveBeenCalled();
  });

  it("salva nome, celular só com números e a preferência de lembretes", async () => {
    vi.mocked(salvarPerfil).mockResolvedValue();
    abrir();
    fireEvent.change(await screen.findByLabelText("Nome"), { target: { value: "  Maria S. " } });
    fireEvent.change(screen.getByLabelText("Celular com DDD"), {
      target: { value: "(21) 98888-7777" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /lembrete por e-mail/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Dados salvos.");
    expect(salvarPerfil).toHaveBeenCalledWith("u1", {
      nome: "Maria S.",
      celular: "21988887777",
      lembretesPorEmail: false,
    });
  });

  it("mostra o erro quando o banco recusa", async () => {
    vi.mocked(salvarPerfil).mockRejectedValue(
      new Error("Algo deu errado. Tente de novo em instantes."),
    );
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Salvar dados" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Algo deu errado");
  });

  it("só exclui a conta depois de confirmar, e sai em seguida", async () => {
    vi.mocked(excluirMinhaConta).mockResolvedValue();
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }));
    const dialogo = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter minha conta" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(excluirMinhaConta).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Excluir minha conta" }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Excluir minha conta" }));
    await waitFor(() => expect(sair).toHaveBeenCalledTimes(1));
    expect(excluirMinhaConta).toHaveBeenCalledTimes(1);
  });

  it("conta de dono não pode ser excluída: avisa e não sai", async () => {
    vi.mocked(excluirMinhaConta).mockRejectedValue(
      new ErroDoBanco("dono_nao_pode_excluir", "A conta do dono não pode ser excluída por aqui."),
    );
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Excluir minha conta" }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Excluir minha conta" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("não pode ser excluída");
    expect(sair).not.toHaveBeenCalled();
  });
});
