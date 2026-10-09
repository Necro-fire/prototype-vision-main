import { describe, expect, it } from "vitest";
import { dataCurta, dataLonga, diaDaSemanaCurto, diaDoMes } from "./datas";

describe("Datas em português", () => {
  it("formata a data curta", () => {
    expect(dataCurta("2026-10-08")).toBe("08/10/2026");
  });
  it("formata a data longa com o dia da semana", () => {
    expect(dataLonga("2026-10-08")).toBe("quinta-feira, 8 de outubro");
  });
  it("abrevia o dia da semana sem ponto", () => {
    expect(diaDaSemanaCurto("2026-10-08")).toBe("qui");
    expect(diaDaSemanaCurto("2026-10-10")).toBe("sáb");
  });
  it("pega o dia do mês sem zero à esquerda", () => {
    expect(diaDoMes("2026-10-08")).toBe("8");
    expect(diaDoMes("2026-10-31")).toBe("31");
  });
  it("não vira o dia por causa do fuso", () => {
    expect(diaDoMes("2026-01-01")).toBe("1");
    expect(diaDoMes("2026-12-31")).toBe("31");
  });
});
