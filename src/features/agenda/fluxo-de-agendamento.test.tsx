import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Expediente } from "@/features/agenda/expediente";
import type { Catalogo } from "@/features/catalogo/banco";
import type { Sessao } from "@/features/conta/sessao";
import { ErroDoBanco, reservar, salvarPerfil, type Agendamento } from "./agendamentos";
import { lerOcupados } from "./banco";
import { FluxoDeAgendamento } from "./fluxo-de-agendamento";

// O banco é simulado: aqui se testa o fluxo da tela. As regras de horário e de reserva têm os
// próprios testes (horarios-livres, paridade e os testes do banco).
vi.mock("./banco", async (importar) => ({
  ...(await importar<typeof import("./banco")>()),
  lerOcupados: vi.fn(),
}));
vi.mock("./agendamentos", async (importar) => ({
  ...(await importar<typeof import("./agendamentos")>()),
  reservar: vi.fn(),
  salvarPerfil: vi.fn(),
}));

const catalogo: Catalogo = {
  categorias: ["Cortes", "Barba"],
  servicos: [
    {
      id: "s1",
      nome: "Corte clássico",
      categoria: "Cortes",
      descricao: "",
      precoCentavos: 4500,
      duracaoMinutos: 30,
      destaque: false,
    },
    {
      id: "s2",
      nome: "Barba & navalha",
      categoria: "Barba",
      descricao: "",
      precoCentavos: 3500,
      duracaoMinutos: 30,
      destaque: false,
    },
    {
      id: "s3",
      nome: "Corte + barba",
      categoria: "Cortes",
      descricao: "",
      precoCentavos: 7000,
      duracaoMinutos: 60,
      destaque: true,
    },
  ],
};

const util = [{ abre: "09:00", fecha: "19:00" }];
// Segunda a sábado, das 9h às 19h; domingo fechado.
const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [[], util, util, util, util, util, util],
};

const cliente: Sessao = {
  id: "u1",
  email: "ana@exemplo.com",
  nome: "Ana Lima",
  celular: "11912345678",
  papel: "cliente",
  lembretesPorEmail: true,
};

function reservaDe(inicio: string): Agendamento {
  return {
    id: "a1",
    servicoId: "s1",
    servicoNome: "Corte clássico",
    precoCentavos: 4500,
    duracaoMinutos: 30,
    inicio,
    fim: new Date(new Date(inicio).getTime() + 30 * 60_000).toISOString(),
    situacao: "agendado",
    observacao: "",
  };
}

type Opcoes = {
  servicoInicial?: string;
  inicioInicial?: string;
  sessao?: Sessao | null;
  catalogo?: Catalogo | null;
};

function abrir(opcoes: Opcoes = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <FluxoDeAgendamento
          catalogo={opcoes.catalogo === undefined ? catalogo : opcoes.catalogo}
          sessao={opcoes.sessao === undefined ? cliente : opcoes.sessao}
          expediente={expediente}
          servicoInicial={opcoes.servicoInicial}
          inicioInicial={opcoes.inicioInicial}
        />
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

const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome });
const horarios = () => screen.findAllByRole("button", { name: /^\d{2}:\d{2}$/ });

async function escolherPrimeiroHorario() {
  const [primeiro] = await horarios();
  fireEvent.click(primeiro!);
  return primeiro!.textContent ?? "";
}

beforeEach(() => {
  vi.mocked(lerOcupados).mockReset().mockResolvedValue([]);
  vi.mocked(reservar).mockReset();
  vi.mocked(salvarPerfil).mockReset();
});
afterEach(cleanup);

describe("Fluxo de agendamento", () => {
  it("começa pela escolha do serviço", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Qual serviço?" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("não deixa continuar sem escolher o serviço", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: /Escolher dia e horário/ }));
    expect(await screen.findByText("Escolha um serviço para continuar.")).toBeInTheDocument();
  });

  it("entra direto no dia e horário quando o serviço vem do catálogo", async () => {
    abrir({ servicoInicial: "s1" });
    expect(await screen.findByRole("heading", { name: "Que dia e horário?" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumo do agendamento" })).toHaveTextContent(
      "Corte clássico",
    );
  });

  it("ignora um serviço da URL que não existe e começa pela escolha", async () => {
    abrir({ servicoInicial: "nao-existe" });
    expect(await screen.findByRole("heading", { name: "Qual serviço?" })).toBeInTheDocument();
  });

  it("avisa quando o catálogo não carregou", async () => {
    abrir({ catalogo: null });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não conseguimos carregar os serviços",
    );
  });

  it("mostra desabilitados os dias sem horário livre", async () => {
    abrir({ servicoInicial: "s1" });
    await screen.findByRole("heading", { name: "Que dia e horário?" });
    // Em 14 dias sempre há um domingo, e a barbearia fecha aos domingos.
    const semVaga = await screen.findAllByRole("button", { name: /sem horários livres/ });
    expect(semVaga.length).toBeGreaterThanOrEqual(1);
    for (const dia of semVaga) expect(dia).toBeDisabled();
  });

  it("esconde o horário que o banco informa como ocupado", async () => {
    // O primeiro horário livre de hoje ou de amanhã passa a estar ocupado.
    abrir({ servicoInicial: "s1" });
    const antes = (await horarios()).map((b) => b.textContent);
    cleanup();

    const ocupado = antes[0] ?? "";
    const [h = 0, m = 0] = ocupado.split(":").map(Number);
    vi.mocked(lerOcupados).mockImplementation(async () => {
      // Qualquer dia: ocupa o intervalo [h:m, h:m+30) no fuso de São Paulo (UTC-3).
      const dia = new Date();
      const inicios: { inicio: string; fim: string }[] = [];
      for (let i = -1; i <= 15; i++) {
        const d = new Date(
          Date.UTC(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate() + i, h + 3, m),
        );
        inicios.push({
          inicio: d.toISOString(),
          fim: new Date(d.getTime() + 30 * 60_000).toISOString(),
        });
      }
      return inicios;
    });
    abrir({ servicoInicial: "s1" });
    const depois = (await horarios()).map((b) => b.textContent);
    expect(depois).not.toContain(ocupado);
  });

  it("pede um horário antes de avançar", async () => {
    abrir({ servicoInicial: "s1" });
    await horarios();
    fireEvent.click(botao(/Revisar agendamento/));
    expect(await screen.findByText("Escolha um horário livre para continuar.")).toBeInTheDocument();
  });

  it("visitante vê o convite para entrar, com o horário guardado no link, e não tem como confirmar", async () => {
    abrir({ servicoInicial: "s1", sessao: null });
    await escolherPrimeiroHorario();
    fireEvent.click(botao(/Revisar agendamento/));
    expect(
      await screen.findByRole("heading", { name: "Entre para confirmar o horário" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar agendamento" })).not.toBeInTheDocument();
    const entrar = screen.getByRole("link", { name: "Entrar" });
    const voltar = decodeURIComponent(entrar.getAttribute("href") ?? "");
    expect(voltar).toMatch(/voltar=\/agendamento\?service=s1&inicio=\d{4}-\d{2}-\d{2}T/);
    expect(screen.getByRole("link", { name: "Criar conta" })).toBeInTheDocument();
  });

  it("cliente confirma e o banco recebe serviço, instante de início e observação", async () => {
    vi.mocked(reservar).mockImplementation(async ({ inicio }) => reservaDe(inicio));
    abrir({ servicoInicial: "s1" });
    await escolherPrimeiroHorario();
    fireEvent.click(botao(/Revisar agendamento/));
    await screen.findByRole("heading", { name: "Confira e confirme" });
    fireEvent.change(screen.getByLabelText(/Observação/), { target: { value: "  Degradê  " } });
    fireEvent.click(botao("Confirmar agendamento"));

    expect(
      await screen.findByRole("heading", { name: "Agendamento confirmado" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Ana Lima, seu horário está reservado/)).toBeInTheDocument();
    const chamada = vi.mocked(reservar).mock.calls[0]?.[0];
    expect(chamada?.servicoId).toBe("s1");
    expect(chamada?.inicio).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(chamada?.observacao).toBe("Degradê");
    expect(screen.getByRole("link", { name: "Ver meus agendamentos" })).toBeInTheDocument();
  });

  it("quando o horário acabou de ser reservado por outra pessoa, volta a escolher e busca de novo", async () => {
    vi.mocked(reservar).mockRejectedValue(
      new ErroDoBanco(
        "horario_indisponivel",
        "Esse horário acabou de ser reservado. Escolha outro.",
      ),
    );
    abrir({ servicoInicial: "s1" });
    await escolherPrimeiroHorario();
    fireEvent.click(botao(/Revisar agendamento/));
    await screen.findByRole("heading", { name: "Confira e confirme" });
    const consultasAntes = vi.mocked(lerOcupados).mock.calls.length;
    fireEvent.click(botao("Confirmar agendamento"));

    expect(await screen.findByRole("heading", { name: "Que dia e horário?" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Esse horário acabou de ser reservado");
    // A escolha foi limpa e a lista de horários foi buscada de novo.
    for (const h of await horarios()) expect(h).toHaveAttribute("aria-pressed", "false");
    await waitFor(() =>
      expect(vi.mocked(lerOcupados).mock.calls.length).toBeGreaterThan(consultasAntes),
    );
  });

  it("outro erro do banco fica no passo de confirmar, com a mensagem", async () => {
    vi.mocked(reservar).mockRejectedValue(
      new ErroDoBanco(
        "limite_de_agendamentos",
        "Você já tem o máximo de horários marcados. Cancele um para marcar outro.",
      ),
    );
    abrir({ servicoInicial: "s1" });
    await escolherPrimeiroHorario();
    fireEvent.click(botao(/Revisar agendamento/));
    await screen.findByRole("heading", { name: "Confira e confirme" });
    fireEvent.click(botao("Confirmar agendamento"));
    expect(await screen.findByRole("alert")).toHaveTextContent("máximo de horários marcados");
    expect(screen.getByRole("heading", { name: "Confira e confirme" })).toBeInTheDocument();
  });

  it("perfil sem nome e celular: pede os dois, salva e só então reserva", async () => {
    vi.mocked(reservar).mockImplementation(async ({ inicio }) => reservaDe(inicio));
    vi.mocked(salvarPerfil).mockResolvedValue();
    abrir({ servicoInicial: "s1", sessao: { ...cliente, nome: "", celular: null } });
    await escolherPrimeiroHorario();
    fireEvent.click(botao(/Revisar agendamento/));
    await screen.findByRole("heading", { name: "Confira e confirme" });

    fireEvent.click(botao("Confirmar agendamento"));
    expect(await screen.findByText("Informe seu nome.")).toBeInTheDocument();
    expect(reservar).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Seu nome"), { target: { value: "Ana Lima" } });
    fireEvent.change(screen.getByLabelText("Celular com DDD"), {
      target: { value: "(11) 91234-5678" },
    });
    fireEvent.click(botao("Confirmar agendamento"));
    expect(
      await screen.findByRole("heading", { name: "Agendamento confirmado" }),
    ).toBeInTheDocument();
    expect(salvarPerfil).toHaveBeenCalledWith("u1", { nome: "Ana Lima", celular: "11912345678" });
  });

  it("volta do login já com serviço e horário escolhidos, direto na confirmação", async () => {
    const inicio = new Date(Date.now() + 3 * 86_400_000).toISOString();
    abrir({ servicoInicial: "s1", inicioInicial: inicio });
    expect(await screen.findByRole("heading", { name: "Confira e confirme" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar agendamento" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resumo do agendamento" })).toHaveTextContent(
      "Corte clássico",
    );
  });

  it("ignora um horário da URL que não é uma data", async () => {
    abrir({ servicoInicial: "s1", inicioInicial: "amanhã" });
    expect(await screen.findByRole("heading", { name: "Que dia e horário?" })).toBeInTheDocument();
  });
});
