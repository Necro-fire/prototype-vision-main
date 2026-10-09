import { describe, expect, it } from "vitest";

import { codigoDeCupomValido, descreverDesconto, normalizarCodigo } from "./cupons";

describe("cupons", () => {
  it("normaliza o código como o banco: sem espaços e em maiúsculas", () => {
    expect(normalizarCodigo("  verao10 ")).toBe("VERAO10");
  });

  it("aceita letras, números, hífen e sublinhado, de 3 a 20 caracteres", () => {
    expect(codigoDeCupomValido("verao-10")).toBe(true);
    expect(codigoDeCupomValido("AB")).toBe(false);
    expect(codigoDeCupomValido("com espaço")).toBe(false);
    expect(codigoDeCupomValido("a".repeat(21))).toBe(false);
    expect(codigoDeCupomValido("acentuação")).toBe(false);
  });

  it("descreve o desconto pelo tipo", () => {
    const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",")}`;
    expect(descreverDesconto("percentual", 10, reais)).toBe("10%");
    expect(descreverDesconto("valor", 500, reais)).toBe("R$ 5,00");
  });
});
