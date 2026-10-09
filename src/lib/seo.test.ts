import { describe, expect, it } from "vitest";

import { montarRobots, montarSitemap, origemDoPedido, paginasPublicas } from "./seo";

describe("origemDoPedido", () => {
  it("usa o endereço pelo qual o visitante chegou", () => {
    expect(origemDoPedido("https://onstyle.com.br/robots.txt?x=1")).toBe("https://onstyle.com.br");
    expect(origemDoPedido("https://onstyle.workers.dev/sitemap.xml")).toBe(
      "https://onstyle.workers.dev",
    );
  });
});

describe("montarRobots", () => {
  it("libera o site, esconde as áreas privadas e aponta o mapa do site", () => {
    const texto = montarRobots("https://onstyle.com.br");
    expect(texto).toContain("User-agent: *\nAllow: /");
    for (const area of ["/admin", "/cliente", "/auth/", "/api/"]) {
      expect(texto).toContain(`Disallow: ${area}`);
    }
    expect(texto).toContain("Sitemap: https://onstyle.com.br/sitemap.xml");
  });
});

describe("montarSitemap", () => {
  it("lista as páginas públicas com endereço completo", () => {
    const xml = montarSitemap("https://onstyle.com.br");
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const caminho of paginasPublicas) {
      expect(xml).toContain(`<loc>https://onstyle.com.br${caminho}</loc>`);
    }
  });

  it("nunca lista área do dono, conta ou API", () => {
    const xml = montarSitemap("https://onstyle.com.br");
    for (const privada of ["/admin", "/cliente", "/entrar", "/criar-conta", "/auth", "/api"]) {
      expect(xml).not.toContain(`${privada}<`);
      expect(xml).not.toContain(`${privada}/`);
    }
  });

  it("caracteres especiais no endereço não quebram o XML", () => {
    expect(montarSitemap("https://x.com", ["/a?b=1&c=2"])).toContain("/a?b=1&amp;c=2");
  });
});
