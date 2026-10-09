import { describe, expect, it } from "vitest";

import { comCabecalhosDeSeguranca } from "./cabecalhos-de-seguranca";

const html = () =>
  new Response("<p>oi</p>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

describe("comCabecalhosDeSeguranca", () => {
  it("põe os cabeçalhos básicos em toda resposta", () => {
    const r = comCabecalhosDeSeguranca(
      new Response("{}", { headers: { "content-type": "application/json" } }),
      "https://onstyle.example/api/saude",
    );
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
    expect(r.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(r.headers.get("Permissions-Policy")).toContain("camera=()");
  });

  it("a política de conteúdo vale só para HTML e proíbe o site dentro de outro", () => {
    const pagina = comCabecalhosDeSeguranca(html(), "https://onstyle.example/");
    const politica = pagina.headers.get("Content-Security-Policy") ?? "";
    expect(politica).toContain("frame-ancestors 'none'");
    expect(politica).toContain("object-src 'none'");
    expect(politica).toContain("form-action 'self'");
    const json = comCabecalhosDeSeguranca(
      new Response("{}", { headers: { "content-type": "application/json" } }),
      "https://onstyle.example/api/saude",
    );
    expect(json.headers.get("Content-Security-Policy")).toBeNull();
  });

  it("libera só o que o site usa: Supabase (dados, tempo real, fotos) e Google Fonts", () => {
    const politica = comCabecalhosDeSeguranca(html(), "https://onstyle.example/").headers.get(
      "Content-Security-Policy",
    )!;
    expect(politica).toContain(
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com",
    );
    expect(politica).toContain("img-src 'self' data: blob: https://*.supabase.co");
    expect(politica).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(politica).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com");
    // Nenhum domínio solto além desses.
    const dominios = politica.match(/https?:\/\/[^\s;]+|wss:\/\/[^\s;]+/g) ?? [];
    expect(new Set(dominios)).toEqual(
      new Set([
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "https://*.supabase.co",
        "wss://*.supabase.co",
      ]),
    );
  });

  it("HSTS só em https, para não travar o desenvolvimento local", () => {
    expect(
      comCabecalhosDeSeguranca(html(), "https://onstyle.example/").headers.get(
        "Strict-Transport-Security",
      ),
    ).toBe("max-age=31536000");
    expect(
      comCabecalhosDeSeguranca(html(), "http://localhost:8080/").headers.get(
        "Strict-Transport-Security",
      ),
    ).toBeNull();
  });

  it("mantém status, corpo e os cabeçalhos que já existiam", async () => {
    const original = new Response("não achei", {
      status: 404,
      headers: { "content-type": "text/html", "set-cookie": "a=1", "cache-control": "no-store" },
    });
    const r = comCabecalhosDeSeguranca(original, "https://onstyle.example/x");
    expect(r.status).toBe(404);
    expect(await r.text()).toBe("não achei");
    expect(r.headers.get("set-cookie")).toBe("a=1");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });
});
