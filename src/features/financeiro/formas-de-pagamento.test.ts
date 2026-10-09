import { describe, expect, it } from "vitest";

import { formasDePagamento, rotuloDaForma, valoresDeFormaDePagamento } from "./formas-de-pagamento";

describe("Formas de pagamento", () => {
  it("são as quatro do banco, na ordem em que aparecem na tela", () => {
    expect(valoresDeFormaDePagamento).toEqual(["pix", "dinheiro", "debito", "credito"]);
    expect(formasDePagamento.map((f) => f.rotulo)).toEqual([
      "Pix",
      "Dinheiro",
      "Débito",
      "Crédito",
    ]);
  });

  it("dá nome a cada forma, e um texto honesto para o histórico antigo", () => {
    expect(rotuloDaForma("debito")).toBe("Débito");
    expect(rotuloDaForma(null)).toBe("Sem forma registrada");
  });
});
