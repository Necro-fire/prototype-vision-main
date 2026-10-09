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

import type { Expediente } from "@/features/agenda/expediente";
import type { Sessao } from "@/features/conta/sessao";
import {
  ErroDoBanco,
  cancelar,
  lerMeusAgendamentos,
  remarcar,
  type Agendamento,
  type Situacao,
} from "./agendamentos";
import { lerOcupados } from "./banco";
import { MeusHorarios } from "./meus-horarios";

vi.mock("./banco", async (importar) => ({
  ...(await importar<typeof import("./banco")>()),
  lerOcupados: vi.fn(),
}));
vi.mock("./agendamentos", async (importar) => ({
  ...(await importar<typeof import("./agendamentos")>()),
  lerMeusAgendamentos: vi.fn(),
  cancelar: vi.fn(),
  remarcar: vi.fn(),
}));
const sair = vi.hoisted(() => vi.fn());
vi.mock("@/features/conta/sair", () => ({ useSair: () => sair }));

const util = [{ abre: "09:00", fecha: "19:00" }];
const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [[], util, util, util, util, util, util],
};

const sessao: Sessao = {
  id: "u1",
  email: "maria@exemplo.com",
  nome: "Maria",
  celular: "11999990001",
  papel: "cliente",
  lembretesPorEmail: true,
};

const emDias = (dias: number) => new Date(Date.now() + dias * 86_400_000);

function agendamento(
  id: string,
  servicoNome: string,
  dias: number,
  situacao: Situacao = "agendado",
): Agendamento {
  const inicio = emDias(dias);
  return {
    id,
    servicoId: `serv-${id}`,
    servicoNome,
    precoCentavos: 4500,
    duracaoMinutos: 30,
    inicio: inicio.toISOString(),
    fim: new Date(inicio.getTime() + 30 * 60_000).toISOString(),
    situacao,
    observacao: "",
  };
}

const proximo = () => agendamento("a1", "Corte clássico", 2);
const concluido = () => agendamento("a2", "Barba & navalha", -10, "concluido");

function abrir(exp: Expediente | null = expediente) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <MeusHorarios sessao={sessao} expediente={exp} />
      </QueryClientProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "/", component: () => null }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
}

beforeEach(() => {
  vi.mocked(lerMeusAgendamentos).mockReset();
  vi.mocked(cancelar).mockReset();
  vi.mocked(remarcar).mockReset();
  vi.mocked(lerOcupados).mockReset().mockResolvedValue([]);
  sair.mockReset();
});
afterEach(cleanup);

describe("Meus horários", () => {
  it("separa o que vem pela frente do histórico, com a situação de cada um", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([concluido(), proximo()]);
    abrir();
    const proximos = await screen.findByRole("region", { name: "Próximos" });
    expect(within(proximos).getByText("Corte clássico")).toBeInTheDocument();
    expect(within(proximos).getByText("Agendado")).toBeInTheDocument();
    const historico = screen.getByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Barba & navalha")).toBeInTheDocument();
    expect(within(historico).getByText("Concluído")).toBeInTheDocument();
  });

  it("cumprimenta pelo nome e leva ao perfil", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    abrir();
    expect(await screen.findByText("Maria")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meu perfil" })).toBeInTheDocument();
  });

  it("sem agendamentos, convida a agendar", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([]);
    abrir();
    expect(await screen.findByText("Você ainda não tem agendamentos.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agendar horário" })).toBeInTheDocument();
  });

  it("se a leitura falha, avisa e deixa tentar de novo", async () => {
    vi.mocked(lerMeusAgendamentos).mockRejectedValueOnce(new Error("rede"));
    abrir();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não conseguimos carregar");
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("region", { name: "Próximos" })).toBeInTheDocument();
  });

  it("cancela só depois de confirmar no diálogo, e o agendamento vai para o histórico", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    vi.mocked(cancelar).mockResolvedValue({ ...proximo(), situacao: "cancelado" });
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar agendamento" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(within(dialogo).getByText("Cancelar este agendamento?")).toBeInTheDocument();

    // Desistir não cancela nada
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter agendamento" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(cancelar).not.toHaveBeenCalled();

    // Confirmar cancela, busca a lista de novo e mostra o cancelado no histórico
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([{ ...proximo(), situacao: "cancelado" }]);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar agendamento" }));
    const outro = await screen.findByRole("alertdialog");
    fireEvent.click(within(outro).getByRole("button", { name: "Cancelar agendamento" }));
    const historico = await screen.findByRole("region", { name: "Histórico" });
    expect(within(historico).getByText("Cancelado")).toBeInTheDocument();
    expect(cancelar).toHaveBeenCalledWith("a1", expect.anything());
    expect(await screen.findByRole("status")).toHaveTextContent("Agendamento cancelado");
  });

  it("mostra a mensagem do banco quando não dá para cancelar", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    vi.mocked(cancelar).mockRejectedValue(
      new ErroDoBanco("ja_comecou", "Esse horário já começou e não pode mais ser alterado."),
    );
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar agendamento" }));
    const dialogo = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar agendamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("já começou");
  });

  it("não oferece cancelar nem remarcar para quem já foi atendido ou cancelou", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([
      concluido(),
      agendamento("a3", "Sobrancelha", -3, "cancelado"),
    ]);
    abrir();
    await screen.findByRole("region", { name: "Histórico" });
    expect(screen.queryByRole("button", { name: "Cancelar agendamento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remarcar" })).not.toBeInTheDocument();
  });

  it("horário que já começou continua nos próximos, mas sem cancelar nem remarcar", async () => {
    const comecou = agendamento("a4", "Corte + barba", 0);
    const inicio = new Date(Date.now() - 10 * 60_000);
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([
      {
        ...comecou,
        inicio: inicio.toISOString(),
        fim: new Date(inicio.getTime() + 30 * 60_000).toISOString(),
      },
      agendamento("a5", "Sobrancelha", 0, "em_atendimento"),
    ]);
    abrir();
    const proximos = await screen.findByRole("region", { name: "Próximos" });
    expect(within(proximos).getByText("Corte + barba")).toBeInTheDocument();
    expect(within(proximos).getByText("Em atendimento")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar agendamento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remarcar" })).not.toBeInTheDocument();
  });

  it("remarca escolhendo um novo horário livre", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    vi.mocked(remarcar).mockResolvedValue(proximo());
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Remarcar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Remarcar horário" });
    const confirmar = within(dialogo).getByRole("button", { name: "Confirmar novo horário" });
    expect(confirmar).toBeDisabled();

    const horarios = await within(dialogo).findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(horarios[0]!);
    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);

    await waitFor(() => expect(remarcar).toHaveBeenCalledTimes(1));
    const [id, novoInicio] = vi.mocked(remarcar).mock.calls[0] ?? [];
    expect(id).toBe("a1");
    expect(novoInicio).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(await screen.findByRole("status")).toHaveTextContent("Horário remarcado");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("remarcar para um horário que acabou de ser tomado mostra o erro e limpa a escolha", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    vi.mocked(remarcar).mockRejectedValue(
      new ErroDoBanco(
        "horario_indisponivel",
        "Esse horário acabou de ser reservado. Escolha outro.",
      ),
    );
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Remarcar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Remarcar horário" });
    const horarios = await within(dialogo).findAllByRole("button", { name: /^\d{2}:\d{2}$/ });
    fireEvent.click(horarios[0]!);
    fireEvent.click(within(dialogo).getByRole("button", { name: "Confirmar novo horário" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("acabou de ser reservado");
    expect(within(dialogo).getByRole("button", { name: "Confirmar novo horário" })).toBeDisabled();
  });

  it("desistir da remarcação mantém o horário", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Remarcar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Remarcar horário" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Manter o horário atual" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(remarcar).not.toHaveBeenCalled();
  });

  it("sem os dados de funcionamento não oferece remarcar, mas deixa cancelar", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    abrir(null);
    await screen.findByRole("button", { name: "Cancelar agendamento" });
    expect(screen.queryByRole("button", { name: "Remarcar" })).not.toBeInTheDocument();
  });

  it("no histórico, agendar de novo leva ao mesmo serviço", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([concluido()]);
    abrir();
    const link = await screen.findByRole("link", { name: "Agendar de novo" });
    expect(link.getAttribute("href")).toContain("service=serv-a2");
  });

  it("sair encerra a sessão", async () => {
    vi.mocked(lerMeusAgendamentos).mockResolvedValue([proximo()]);
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
    expect(sair).toHaveBeenCalledTimes(1);
  });
});
