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

import { Catalogo } from "./catalogo";

type Linha = Record<string, unknown>;
type Escrita = { tabela: string; op: string; linha: Linha; id?: string };

// O Supabase é simulado no nível do cliente: leituras devolvem linhas como o banco, e as escritas
// ficam registradas para conferir o que seria gravado (em centavos, com os nomes das colunas).
const banco = vi.hoisted(() => {
  const tabelas: Record<string, Linha[]> = {};
  const escritas: Escrita[] = [];
  const estado = { falhaDeEscrita: null as string | null };
  const from = (tabela: string) => {
    const atual: { op: string; linha: Linha; id: string | undefined } = {
      op: "select",
      linha: {},
      id: undefined,
    };
    const concluir = () => {
      if (atual.op === "select") return { data: tabelas[tabela] ?? [], error: null };
      escritas.push({
        tabela,
        op: atual.op,
        linha: atual.linha,
        ...(atual.id ? { id: atual.id } : {}),
      });
      return {
        data: null,
        error: estado.falhaDeEscrita ? { message: estado.falhaDeEscrita } : null,
      };
    };
    const consulta = {
      select: () => consulta,
      order: () => consulta,
      insert: (linha: Linha) => {
        atual.op = "insert";
        atual.linha = linha;
        return consulta;
      },
      update: (linha: Linha) => {
        atual.op = "update";
        atual.linha = linha;
        return consulta;
      },
      eq: (_coluna: string, valor: string) => {
        atual.id = valor;
        return consulta;
      },
      single: () => Promise.resolve({ ...concluir(), data: { id: "cat-nova" } }),
      then: (resolver: (r: unknown) => void) => resolver(concluir()),
    };
    return consulta;
  };
  return { tabelas, escritas, estado, from };
});
vi.mock("@/lib/supabase-navegador", () => ({ supabaseNavegador: () => ({ from: banco.from }) }));

const linhaDeServico = (id: string, nome: string, extras: Linha = {}): Linha => ({
  id,
  nome,
  categoria_id: "cat-cortes",
  descricao: "",
  preco_centavos: 4500,
  duracao_minutos: 30,
  ativo: true,
  destaque: false,
  ordem: 1,
  categorias: { nome: "Cortes" },
  ...extras,
});

function abrir(module: "servicos" | "produtos") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const raiz = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <Catalogo module={module} />
      </QueryClientProvider>
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

beforeEach(() => {
  for (const t of Object.keys(banco.tabelas)) delete banco.tabelas[t];
  banco.escritas.length = 0;
  banco.estado.falhaDeEscrita = null;
  banco.tabelas["categorias"] = [
    { id: "cat-cortes", nome: "Cortes" },
    { id: "cat-barba", nome: "Barba" },
  ];
  banco.tabelas["servicos"] = [
    linhaDeServico("s1", "Corte clássico", { destaque: true }),
    linhaDeServico("s2", "Barba & navalha", {
      categoria_id: "cat-barba",
      categorias: { nome: "Barba" },
      preco_centavos: 3550,
      ativo: false,
    }),
  ];
  banco.tabelas["produtos"] = [
    {
      id: "p1",
      nome: "Pente profissional",
      descricao: "Antiestático",
      preco_centavos: 2500,
      ativo: true,
      ordem: 1,
    },
  ];
});
afterEach(cleanup);

describe("Serviços", () => {
  it("lista tudo, inclusive o desativado, com preço, duração e categoria", async () => {
    abrir("servicos");
    expect(await screen.findByText("Corte clássico")).toBeInTheDocument();
    expect(screen.getByText("Barba & navalha")).toBeInTheDocument();
    expect(screen.getByText("2 itens cadastrados")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s45,50|R\$\s35,50/)).toBeInTheDocument();
    expect(screen.getAllByText("Mais pedido").length).toBeGreaterThanOrEqual(1);
  });

  it("busca pelo nome", async () => {
    abrir("servicos");
    await screen.findByText("Corte clássico");
    fireEvent.change(screen.getByLabelText("Pesquisar catálogo"), { target: { value: "barba" } });
    expect(screen.getByText("Barba & navalha")).toBeInTheDocument();
    expect(screen.queryByText("Corte clássico")).not.toBeInTheDocument();
  });

  it("ativa e desativa um serviço direto na lista", async () => {
    abrir("servicos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Alterar disponibilidade de Corte clássico" }),
    );
    await waitFor(() =>
      expect(banco.escritas).toContainEqual({
        tabela: "servicos",
        op: "update",
        linha: { ativo: false },
        id: "s1",
      }),
    );
  });

  it("marca e desmarca o mais pedido", async () => {
    abrir("servicos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Marcar Barba & navalha como mais pedido" }),
    );
    await waitFor(() =>
      expect(banco.escritas).toContainEqual({
        tabela: "servicos",
        op: "update",
        linha: { destaque: true },
        id: "s2",
      }),
    );
  });

  it("abre o cadastro com os dados do serviço, preço em reais", async () => {
    abrir("servicos");
    fireEvent.click(await screen.findByRole("button", { name: "Editar Barba & navalha" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar serviço" });
    expect(within(dialogo).getByLabelText("Nome")).toHaveValue("Barba & navalha");
    expect(within(dialogo).getByLabelText("Preço (R$)")).toHaveValue("35,50");
    expect(within(dialogo).getByLabelText("Duração (min)")).toHaveValue("30");
    expect(within(dialogo).getByLabelText("Categoria")).toHaveValue("cat-barba");
  });

  it("salva a edição em centavos, sem mexer no que não mudou", async () => {
    abrir("servicos");
    fireEvent.click(await screen.findByRole("button", { name: "Editar Corte clássico" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar serviço" });
    fireEvent.change(within(dialogo).getByLabelText("Preço (R$)"), { target: { value: "52,90" } });
    fireEvent.change(within(dialogo).getByLabelText("Duração (min)"), { target: { value: "45" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar cadastro" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Serviço salvo.");
    expect(banco.escritas).toEqual([
      {
        tabela: "servicos",
        op: "update",
        id: "s1",
        linha: {
          nome: "Corte clássico",
          categoria_id: "cat-cortes",
          descricao: "",
          preco_centavos: 5290,
          duracao_minutos: 45,
          destaque: true,
          ordem: 1,
        },
      },
    ]);
  });

  it("serviço novo: confere os campos antes de gravar", async () => {
    abrir("servicos");
    fireEvent.click(await screen.findByRole("button", { name: "Novo serviço" }));
    const dialogo = await screen.findByRole("dialog", { name: "Novo serviço" });
    fireEvent.change(within(dialogo).getByLabelText("Duração (min)"), { target: { value: "7" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar cadastro" }));
    expect(await within(dialogo).findByText("Informe o nome.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Informe o preço, por exemplo 45,00.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Use de 5 a 480 minutos, de 5 em 5.")).toBeInTheDocument();
    expect(banco.escritas).toEqual([]);
  });

  it("serviço novo com categoria nova: cria a categoria e usa no serviço", async () => {
    abrir("servicos");
    fireEvent.click(await screen.findByRole("button", { name: "Novo serviço" }));
    const dialogo = await screen.findByRole("dialog", { name: "Novo serviço" });
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Pezinho" } });
    fireEvent.change(within(dialogo).getByLabelText("Preço (R$)"), { target: { value: "20" } });
    fireEvent.change(within(dialogo).getByLabelText(/Ou crie uma categoria nova/), {
      target: { value: "Acabamento" },
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar cadastro" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Serviço salvo.");
    expect(banco.escritas[0]).toEqual({
      tabela: "categorias",
      op: "insert",
      linha: { nome: "Acabamento" },
    });
    expect(banco.escritas[1]).toMatchObject({
      tabela: "servicos",
      op: "insert",
      linha: {
        nome: "Pezinho",
        categoria_id: "cat-nova",
        preco_centavos: 2000,
        duracao_minutos: 30,
      },
    });
  });

  it("mostra o erro do banco e mantém o cadastro aberto", async () => {
    banco.estado.falhaDeEscrita = "sem_permissao";
    abrir("servicos");
    fireEvent.click(await screen.findByRole("button", { name: "Editar Corte clássico" }));
    const dialogo = await screen.findByRole("dialog", { name: "Editar serviço" });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar cadastro" }));
    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Você não tem permissão");
    expect(screen.getByRole("dialog", { name: "Editar serviço" })).toBeInTheDocument();
  });

  it("catálogo vazio convida a cadastrar", async () => {
    banco.tabelas["servicos"] = [];
    abrir("servicos");
    expect(await screen.findByText("Nenhum serviço cadastrado.")).toBeInTheDocument();
  });
});

describe("Produtos", () => {
  it("lista com especificações e preço", async () => {
    abrir("produtos");
    expect(await screen.findByText("Pente profissional")).toBeInTheDocument();
    expect(screen.getByText("Antiestático")).toBeInTheDocument();
  });

  it("produto novo: grava em centavos", async () => {
    abrir("produtos");
    fireEvent.click(await screen.findByRole("button", { name: "Novo produto" }));
    const dialogo = await screen.findByRole("dialog", { name: "Novo produto" });
    fireEvent.change(within(dialogo).getByLabelText("Nome"), { target: { value: "Pomada" } });
    fireEvent.change(within(dialogo).getByLabelText("Preço (R$)"), { target: { value: "39,9" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Salvar cadastro" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Produto salvo.");
    expect(banco.escritas).toEqual([
      {
        tabela: "produtos",
        op: "insert",
        linha: { nome: "Pomada", descricao: "", preco_centavos: 3990, ordem: 0 },
      },
    ]);
  });

  it("desativa o produto sem apagar", async () => {
    abrir("produtos");
    fireEvent.click(
      await screen.findByRole("button", { name: "Alterar disponibilidade de Pente profissional" }),
    );
    await waitFor(() =>
      expect(banco.escritas).toContainEqual({
        tabela: "produtos",
        op: "update",
        linha: { ativo: false },
        id: "p1",
      }),
    );
  });
});
