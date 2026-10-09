// @vitest-environment node
// O manifesto do painel e os ícones: se um arquivo sumir ou o tamanho do ícone não bater com o que
// o manifesto promete, o navegador deixa de oferecer a instalação sem avisar ninguém.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const publico = join(process.cwd(), "public");
const manifesto = JSON.parse(readFileSync(join(publico, "manifest.webmanifest"), "utf8")) as {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

// Largura e altura de um PNG estão no cabeçalho IHDR, logo depois da assinatura de 8 bytes.
function tamanhoDoPng(caminho: string) {
  const bytes = readFileSync(caminho);
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { largura: bytes.readUInt32BE(16), altura: bytes.readUInt32BE(20) };
}

describe("Manifesto do painel", () => {
  it("abre o painel em tela cheia, em português", () => {
    expect(manifesto).toMatchObject({
      lang: "pt-BR",
      start_url: "/admin",
      scope: "/",
      display: "standalone",
    });
    expect(manifesto.short_name.length).toBeLessThanOrEqual(12);
    expect(manifesto.theme_color).toBe("#131416");
    expect(manifesto.background_color).toBe("#131416");
  });

  it("tem ícones de 192 e 512, e um para máscara redonda", () => {
    const sizes = manifesto.icons.map((i) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toContain("192x192:any");
    expect(sizes).toContain("512x512:any");
    expect(sizes).toContain("512x512:maskable");
  });

  it.each(["192x192", "512x512"])("o ícone de %s existe e tem mesmo o tamanho declarado", (tam) => {
    const icone = manifesto.icons.find((i) => i.sizes === tam)!;
    const caminho = join(publico, icone.src);
    expect(existsSync(caminho)).toBe(true);
    const [l, a] = tam.split("x").map(Number);
    expect(tamanhoDoPng(caminho)).toEqual({ largura: l, altura: a });
  });

  it("o ícone do iPhone tem 180x180", () => {
    expect(tamanhoDoPng(join(publico, "icones", "apple-touch-icon.png"))).toEqual({
      largura: 180,
      altura: 180,
    });
  });
});
