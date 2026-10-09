import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PainelNoCelular } from "./painel-no-celular";

function oferecerInstalacao(resultado: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const evento = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome: resultado }),
  });
  act(() => {
    window.dispatchEvent(evento);
  });
  return { prompt, evento };
}

const comoAplicativo = (instalado: boolean) =>
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((consulta: string) => ({
      matches: instalado && consulta === "(display-mode: standalone)",
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );

beforeEach(() => comoAplicativo(false));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Painel no celular", () => {
  it("sempre explica a instalação manual no iPhone e no Android", () => {
    render(<PainelNoCelular />);
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
    expect(screen.getByText(/Instalar app/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar o painel" })).not.toBeInTheDocument();
  });

  it("quando o navegador oferece, mostra o botão, que abre o pedido de instalação", async () => {
    render(<PainelNoCelular />);
    const { prompt, evento } = oferecerInstalacao();
    expect(evento.defaultPrevented).toBe(true);
    fireEvent.click(await screen.findByRole("button", { name: "Instalar o painel" }));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/Você já está usando o painel instalado/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instalar o painel" })).not.toBeInTheDocument();
  });

  it("se a pessoa recusa, o botão some e a explicação continua", async () => {
    render(<PainelNoCelular />);
    oferecerInstalacao("dismissed");
    fireEvent.click(await screen.findByRole("button", { name: "Instalar o painel" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Instalar o painel" })).not.toBeInTheDocument(),
    );
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
  });

  it("já aberto como aplicativo, só confirma", () => {
    comoAplicativo(true);
    render(<PainelNoCelular />);
    expect(screen.getByText(/Você já está usando o painel instalado/)).toBeInTheDocument();
    expect(screen.queryByText(/Adicionar à Tela de Início/)).not.toBeInTheDocument();
  });
});
