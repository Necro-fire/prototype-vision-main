// Trava a regra das fotografias (docs/03-design-system.md): toda foto do site tem autor,
// origem e licença registrados em docs/creditos-imagens.md. Roda em todo `npm run verificar`.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pastaDasFotos = join(process.cwd(), "public", "fotos");
const creditos = readFileSync(join(process.cwd(), "docs", "creditos-imagens.md"), "utf8");

const fotos = existsSync(pastaDasFotos) ? readdirSync(pastaDasFotos) : [];

// "cadeira-junto-a-porta-960.webp" é registrada como "cadeira-junto-a-porta-*".
const nomeDaCena = (arquivo: string) => arquivo.replace(/-\d+\.\w+$/, "");

describe("Créditos das fotos", () => {
  it("toda foto de public/fotos está registrada em docs/creditos-imagens.md", () => {
    const semCredito = fotos.filter(
      (arquivo) => !creditos.includes(`\`${nomeDaCena(arquivo)}-*\``),
    );
    expect(semCredito).toEqual([]);
  });

  it("toda foto está em WebP, com a largura no nome", () => {
    const foraDoPadrao = fotos.filter((arquivo) => !/-(640|960|1440)\.webp$/.test(arquivo));
    expect(foraDoPadrao).toEqual([]);
  });
});
