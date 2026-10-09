import { describe, expect, it } from "vitest";

import { centavosParaCampo, precoCurtoDeCentavos, reaisParaCentavos } from "./dinheiro";

describe("reaisParaCentavos", () => {
  it("lê os jeitos comuns de escrever um preço", () => {
    expect(reaisParaCentavos("45")).toBe(4500);
    expect(reaisParaCentavos("45,5")).toBe(4550);
    expect(reaisParaCentavos("45,50")).toBe(4550);
    expect(reaisParaCentavos("45.50")).toBe(4550);
    expect(reaisParaCentavos("R$ 45,00")).toBe(4500);
    expect(reaisParaCentavos("  0,05 ")).toBe(5);
    expect(reaisParaCentavos("0")).toBe(0);
  });

  it("entende o ponto de milhar", () => {
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("1.234")).toBe(123400);
    expect(reaisParaCentavos("R$ 12.345.678,90")).toBe(1234567890);
  });

  it("não perde centavo com valores que o ponto flutuante erra", () => {
    expect(reaisParaCentavos("19,99")).toBe(1999);
    expect(reaisParaCentavos("0,29")).toBe(29);
    expect(reaisParaCentavos("1,15")).toBe(115);
  });

  it("recusa o que não é um preço", () => {
    for (const ruim of ["", "   ", "abc", "-5", "45,555", "4,5,5", "R$", "1e3", "45,"]) {
      expect(reaisParaCentavos(ruim), JSON.stringify(ruim)).toBeNull();
    }
  });
});

describe("centavosParaCampo", () => {
  it("volta ao que se digita num campo", () => {
    expect(centavosParaCampo(4500)).toBe("45,00");
    expect(centavosParaCampo(4550)).toBe("45,50");
    expect(centavosParaCampo(5)).toBe("0,05");
    expect(centavosParaCampo(123456)).toBe("1234,56");
  });

  it("ida e volta não muda o valor", () => {
    for (const centavos of [0, 1, 99, 100, 1999, 4500, 123456]) {
      expect(reaisParaCentavos(centavosParaCampo(centavos))).toBe(centavos);
    }
  });
});

describe("precoCurtoDeCentavos", () => {
  it("tira os centavos quando o valor é inteiro", () => {
    // O Intl separa o R$ do número com espaço sem quebra.
    const normal = (texto: string) => texto.replace(/\s/g, " ");
    expect(normal(precoCurtoDeCentavos(4500))).toBe("R$ 45");
    expect(normal(precoCurtoDeCentavos(4550))).toBe("R$ 45,50");
  });
});
