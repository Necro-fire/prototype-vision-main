import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmarLink } from "./confirmar-link";
import { FormularioCriarConta } from "./formulario-criar-conta";
import { FormularioEntrar } from "./formulario-entrar";
import { FormularioRecuperarSenha } from "./formulario-recuperar-senha";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

// O Supabase é simulado: aqui se testa a tela (validação, mensagens, para onde vai), não o servidor.
const banco = vi.hoisted(() => {
  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
  };
  const perfil = { papel: "cliente" as "cliente" | "dono" };
  const from = () => ({
    select: () => ({
      eq: () => ({ maybeSingle: () => Promise.resolve({ data: { papel: perfil.papel } }) }),
    }),
  });
  return { auth, perfil, from };
});

vi.mock("@/lib/supabase-navegador", () => ({
  supabaseNavegador: () => ({ auth: banco.auth, from: banco.from }),
}));

function abrir(tela: ReactNode) {
  const raiz = createRootRoute({ component: Outlet });
  const rota = (path: string, component: () => ReactNode) =>
    createRoute({ getParentRoute: () => raiz, path, component });
  const router = createRouter({
    routeTree: raiz.addChildren([
      rota("/", () => tela),
      rota("/admin", () => <p>painel</p>),
      rota("/cliente", () => <p>conta do cliente</p>),
      rota("/agendamento", () => <p>agendamento</p>),
      rota("/redefinir-senha", () => <p>nova senha</p>),
      rota("/entrar", () => <p>entrar</p>),
      rota("/criar-conta", () => <p>criar conta</p>),
      rota("/recuperar-senha", () => <p>recuperar</p>),
    ]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
  return router;
}

const digitar = (rotulo: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
const botao = (nome: string | RegExp) => screen.getByRole("button", { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  banco.perfil.papel = "cliente";
});
afterEach(cleanup);

describe("Entrar", () => {
  it("não chama o servidor com campos vazios e diz o que falta", async () => {
    abrir(<FormularioEntrar voltar={undefined} />);
    fireEvent.click(await screen.findByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument();
    expect(banco.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("mostra a mensagem em português quando o login falha", async () => {
    banco.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "invalid_credentials", message: "Invalid login credentials" },
    });
    abrir(<FormularioEntrar voltar={undefined} />);
    await screen.findByRole("button", { name: "Entrar" });
    digitar("E-mail", "ana@exemplo.com");
    digitar("Senha", "senha-errada");
    fireEvent.click(botao("Entrar"));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos");
  });

  it("cliente vai para a própria conta, com o e-mail sem espaços", async () => {
    banco.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const router = abrir(<FormularioEntrar voltar={undefined} />);
    await screen.findByRole("button", { name: "Entrar" });
    digitar("E-mail", "  ana@exemplo.com ");
    digitar("Senha", "12345678");
    fireEvent.click(botao("Entrar"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/cliente"));
    expect(banco.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ana@exemplo.com",
      password: "12345678",
    });
  });

  it("dono vai para o painel", async () => {
    banco.perfil.papel = "dono";
    banco.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u2" } }, error: null });
    const router = abrir(<FormularioEntrar voltar={undefined} />);
    await screen.findByRole("button", { name: "Entrar" });
    digitar("E-mail", "dono@exemplo.com");
    digitar("Senha", "12345678");
    fireEvent.click(botao("Entrar"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin"));
  });

  it("volta para onde a pessoa estava, e só dentro do site", async () => {
    banco.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const router = abrir(<FormularioEntrar voltar="/agendamento" />);
    await screen.findByRole("button", { name: "Entrar" });
    digitar("E-mail", "ana@exemplo.com");
    digitar("Senha", "12345678");
    fireEvent.click(botao("Entrar"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/agendamento"));
  });

  it("ignora um endereço de outro site no voltar", async () => {
    banco.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const router = abrir(<FormularioEntrar voltar="https://outro.com" />);
    await screen.findByRole("button", { name: "Entrar" });
    digitar("E-mail", "ana@exemplo.com");
    digitar("Senha", "12345678");
    fireEvent.click(botao("Entrar"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/cliente"));
  });

  it("oferece recuperar a senha e criar conta", async () => {
    abrir(<FormularioEntrar voltar={undefined} />);
    expect(await screen.findByRole("link", { name: "Esqueci minha senha" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ainda não tenho conta" })).toBeInTheDocument();
  });
});

describe("Criar conta", () => {
  function preencher() {
    digitar("Nome", "Ana Lima");
    digitar("Celular com DDD", "(11) 91234-5678");
    digitar("E-mail", "ana@exemplo.com");
    digitar("Senha", "12345678");
  }

  it("aponta cada campo inválido e não chama o servidor", async () => {
    abrir(<FormularioCriarConta voltar={undefined} />);
    fireEvent.click(await screen.findByRole("button", { name: "Criar conta" }));
    expect(await screen.findByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByText(/Informe o celular com DDD/)).toBeInTheDocument();
    expect(screen.getByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(screen.getByText("Crie uma senha.")).toBeInTheDocument();
    expect(banco.auth.signUp).not.toHaveBeenCalled();
  });

  it("recusa senha curta", async () => {
    abrir(<FormularioCriarConta voltar={undefined} />);
    await screen.findByRole("button", { name: "Criar conta" });
    preencher();
    digitar("Senha", "1234567");
    fireEvent.click(botao("Criar conta"));
    expect(await screen.findByText("Use pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(banco.auth.signUp).not.toHaveBeenCalled();
  });

  it("manda nome e celular normalizado para o banco criar o perfil, e pede a confirmação", async () => {
    banco.auth.signUp.mockResolvedValue({
      data: { session: null, user: { id: "u1" } },
      error: null,
    });
    abrir(<FormularioCriarConta voltar="/agendamento" />);
    await screen.findByRole("button", { name: "Criar conta" });
    preencher();
    fireEvent.click(botao("Criar conta"));
    expect(await screen.findByRole("heading", { name: "Confirme seu e-mail" })).toBeInTheDocument();
    expect(screen.getByText("ana@exemplo.com")).toBeInTheDocument();

    const pedido = banco.auth.signUp.mock.calls[0]?.[0] as {
      email: string;
      password: string;
      options: { data: Record<string, string>; emailRedirectTo: string };
    };
    expect(pedido.email).toBe("ana@exemplo.com");
    expect(pedido.options.data).toEqual({ nome: "Ana Lima", celular: "11912345678" });
    expect(pedido.options.emailRedirectTo).toMatch(/\/auth\/confirmar\?voltar=%2Fagendamento$/);
  });

  it("diz quando já existe conta com o e-mail", async () => {
    banco.auth.signUp.mockResolvedValue({
      data: { session: null, user: null },
      error: { code: "user_already_exists", message: "User already registered" },
    });
    abrir(<FormularioCriarConta voltar={undefined} />);
    await screen.findByRole("button", { name: "Criar conta" });
    preencher();
    fireEvent.click(botao("Criar conta"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Já existe uma conta");
  });

  it("sem confirmação de e-mail, a conta já entra e segue para o destino", async () => {
    banco.auth.signUp.mockResolvedValue({
      data: { session: { access_token: "x" }, user: { id: "u1" } },
      error: null,
    });
    const router = abrir(<FormularioCriarConta voltar="/agendamento" />);
    await screen.findByRole("button", { name: "Criar conta" });
    preencher();
    fireEvent.click(botao("Criar conta"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/agendamento"));
  });
});

describe("Recuperar senha", () => {
  it("valida o e-mail antes de enviar", async () => {
    abrir(<FormularioRecuperarSenha />);
    fireEvent.click(await screen.findByRole("button", { name: "Enviar link" }));
    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument();
    expect(banco.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("responde do mesmo jeito exista a conta ou não", async () => {
    banco.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    abrir(<FormularioRecuperarSenha />);
    await screen.findByRole("button", { name: "Enviar link" });
    digitar("E-mail da conta", "alguem@exemplo.com");
    fireEvent.click(botao("Enviar link"));
    expect(await screen.findByRole("heading", { name: "Veja seu e-mail" })).toBeInTheDocument();
    expect(screen.getByText(/Se houver uma conta/)).toBeInTheDocument();
    const [email, opcoes] = banco.auth.resetPasswordForEmail.mock.calls[0] as [
      string,
      { redirectTo: string },
    ];
    expect(email).toBe("alguem@exemplo.com");
    expect(opcoes.redirectTo).toMatch(/\/auth\/confirmar\?tipo=recuperacao$/);
  });
});

describe("Redefinir senha", () => {
  it("sem sessão de recuperação, avisa que o link venceu", async () => {
    banco.auth.getSession.mockResolvedValue({ data: { session: null } });
    abrir(<FormularioRedefinirSenha />);
    expect(await screen.findByText(/Esse link venceu ou já foi usado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pedir novo link" })).toBeInTheDocument();
  });

  it("salva a nova senha e leva para a conta", async () => {
    banco.auth.getSession.mockResolvedValue({ data: { session: { access_token: "x" } } });
    banco.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const router = abrir(<FormularioRedefinirSenha />);
    await screen.findByRole("button", { name: "Salvar nova senha" });
    digitar("Nova senha", "senha-nova-123");
    fireEvent.click(botao("Salvar nova senha"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/cliente"));
    expect(banco.auth.updateUser).toHaveBeenCalledWith({ password: "senha-nova-123" });
  });

  it("recusa senha curta", async () => {
    banco.auth.getSession.mockResolvedValue({ data: { session: { access_token: "x" } } });
    abrir(<FormularioRedefinirSenha />);
    await screen.findByRole("button", { name: "Salvar nova senha" });
    digitar("Nova senha", "curta");
    fireEvent.click(botao("Salvar nova senha"));
    expect(await screen.findByText("Use pelo menos 8 caracteres.")).toBeInTheDocument();
    expect(banco.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("Link do e-mail", () => {
  const abrirLink = (busca: string) => {
    window.history.pushState({}, "", `/auth/confirmar${busca}`);
    return abrir(<ConfirmarLink />);
  };
  afterEach(() => window.history.pushState({}, "", "/"));

  it("troca o código por sessão e segue para onde a pessoa ia", async () => {
    banco.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const router = abrirLink("?code=abc&voltar=%2Fagendamento");
    await waitFor(() => expect(router.state.location.pathname).toBe("/agendamento"));
    expect(banco.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("confirma por token_hash, que funciona em outro aparelho", async () => {
    banco.auth.verifyOtp.mockResolvedValue({ error: null });
    const router = abrirLink("?token_hash=th&type=signup");
    await waitFor(() => expect(router.state.location.pathname).toBe("/cliente"));
    expect(banco.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "th", type: "signup" });
  });

  it("link de recuperação leva a criar a nova senha", async () => {
    banco.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const router = abrirLink("?code=abc&tipo=recuperacao");
    await waitFor(() => expect(router.state.location.pathname).toBe("/redefinir-senha"));
  });

  it("link vencido mostra a mensagem e como pedir outro", async () => {
    banco.auth.exchangeCodeForSession.mockResolvedValue({
      error: { code: "flow_state_expired", message: "expired" },
    });
    abrirLink("?code=velho");
    expect(await screen.findByRole("alert")).toHaveTextContent("Esse link venceu");
    expect(screen.getByRole("link", { name: "Pedir novo link" })).toBeInTheDocument();
  });

  it("link sem código não finge que deu certo", async () => {
    abrirLink("");
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(banco.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("não deixa o voltar levar para outro site", async () => {
    banco.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const router = abrirLink("?code=abc&voltar=https%3A%2F%2Foutro.com");
    await waitFor(() => expect(router.state.location.pathname).toBe("/cliente"));
  });
});
