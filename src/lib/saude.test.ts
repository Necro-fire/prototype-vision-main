import { afterEach, describe, expect, it, vi } from "vitest";

import { verificarSaude } from "./saude";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("verificarSaude", () => {
  it("banco respondeu: 200", async () => {
    const r = await verificarSaude(async () => ({ error: null }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("banco devolveu erro: 503, sem vazar o motivo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await verificarSaude(async () => ({
      error: { message: "senha errada para o usuário x" },
    }));
    expect(r.status).toBe(503);
    const corpo = await r.text();
    expect(JSON.parse(corpo)).toEqual({ ok: false });
    expect(corpo).not.toContain("senha");
  });

  it("consulta que levanta exceção: 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await verificarSaude(async () => {
      throw new Error("sem rede");
    });
    expect(r.status).toBe(503);
  });

  it("banco que não responde: 503 depois do limite, sem ficar pendurado", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    const pendente = verificarSaude(() => new Promise(() => {}), 5000);
    await vi.advanceTimersByTimeAsync(5001);
    expect((await pendente).status).toBe(503);
  });
});
