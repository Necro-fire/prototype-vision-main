import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ShopProvider } from "@/features/demo/shop-provider";
import { FluxoDeAgendamento } from "./fluxo-de-agendamento";

function abrir(servicoInicial?: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <ShopProvider>
        <FluxoDeAgendamento servicoInicial={servicoInicial} />
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

const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome });
const horarioLivre = () =>
  screen.getAllByRole("button").find((b) => /^\d{2}:\d{2}$/.test(b.textContent ?? ""));

afterEach(cleanup);

describe("Fluxo de agendamento", () => {
  it("começa pela escolha do serviço", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Qual serviço?" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").length).toBeGreaterThanOrEqual(6);
  });

  it("não deixa continuar sem escolher o serviço", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: /Escolher dia e horário/ }));
    expect(await screen.findByText("Escolha um serviço para continuar.")).toBeInTheDocument();
  });

  it("entra direto no dia e horário quando o serviço vem do catálogo", async () => {
    abrir("1");
    expect(await screen.findByRole("heading", { name: "Que dia e horário?" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumo do agendamento" })).toHaveTextContent(
      "Corte clássico",
    );
  });

  it("mostra desabilitados os dias sem horário livre", async () => {
    abrir("1");
    await screen.findByRole("heading", { name: "Que dia e horário?" });
    // Em 14 dias sempre há um domingo, e a barbearia fecha aos domingos.
    const semVaga = await screen.findAllByRole("button", { name: /sem horários livres/ });
    expect(semVaga.length).toBeGreaterThanOrEqual(1);
    for (const dia of semVaga) expect(dia).toBeDisabled();
  });

  it("pede um horário antes de avançar", async () => {
    abrir("1");
    await screen.findByRole("heading", { name: "Que dia e horário?" });
    await screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(botao(/Informar meus dados/));
    expect(await screen.findByText("Escolha um horário livre para continuar.")).toBeInTheDocument();
  });

  it("aponta o erro em cada campo dos dados", async () => {
    abrir("1");
    await screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(horarioLivre()!);
    fireEvent.click(botao(/Informar meus dados/));
    fireEvent.click(await screen.findByRole("button", { name: /Revisar agendamento/ }));
    const celular = await screen.findByLabelText("Celular com DDD");
    expect(celular).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Digite o celular com DDD/)).toBeInTheDocument();
    expect(screen.getByText("Digite seu nome.")).toBeInTheDocument();
  });

  it("agenda do começo ao fim e mostra a confirmação", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("radio", { name: /Corte clássico/ }));
    fireEvent.click(botao(/Escolher dia e horário/));
    await screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    const escolhido = horarioLivre()!;
    const hora = escolhido.textContent;
    fireEvent.click(escolhido);
    fireEvent.click(botao(/Informar meus dados/));
    fireEvent.change(await screen.findByLabelText("Celular com DDD"), {
      target: { value: "(11) 99999-0001" },
    });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Maria Souza" } });
    fireEvent.click(botao(/Revisar agendamento/));
    expect(await screen.findByRole("heading", { name: "Confira e confirme" })).toBeInTheDocument();
    expect(screen.getByText("Maria Souza")).toBeInTheDocument();
    fireEvent.click(botao("Confirmar agendamento"));
    expect(
      await screen.findByRole("heading", { name: "Agendamento confirmado" }),
    ).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`às ${hora}`))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver meus agendamentos" })).toBeInTheDocument();
  });

  it("reconhece quem já agendou pelo celular", async () => {
    abrir();
    // Primeiro agendamento
    fireEvent.click(await screen.findByRole("radio", { name: /Corte clássico/ }));
    fireEvent.click(botao(/Escolher dia e horário/));
    await screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(horarioLivre()!);
    fireEvent.click(botao(/Informar meus dados/));
    fireEvent.change(await screen.findByLabelText("Celular com DDD"), {
      target: { value: "11999990002" },
    });
    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Carlos Lima" } });
    fireEvent.click(botao(/Revisar agendamento/));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar agendamento" }));
    await screen.findByRole("heading", { name: "Agendamento confirmado" });
    // Segundo, com o mesmo celular
    fireEvent.click(botao("Agendar outro horário"));
    fireEvent.click(await screen.findByRole("radio", { name: /Barba & navalha/ }));
    fireEvent.click(botao(/Escolher dia e horário/));
    await screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(horarioLivre()!);
    fireEvent.click(botao(/Informar meus dados/));
    fireEvent.change(await screen.findByLabelText("Celular com DDD"), {
      target: { value: "(11) 99999-0002" },
    });
    expect(await screen.findByText(/Que bom ver você de novo, Carlos Lima/)).toBeInTheDocument();
    expect(screen.getByLabelText("Seu nome")).toBeDisabled();
  });
});
