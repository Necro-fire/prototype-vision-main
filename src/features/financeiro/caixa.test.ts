import { describe, expect, it } from "vitest";

import { conferirCaixa } from "./caixa";

// O formatador de moeda usa espaço inseparável depois do "R$".
const texto = (t: string) => t.replace(/\s/g, " ");

describe("conferirCaixa", () => {
  it("confere quando o contado é igual ao esperado", () => {
    expect(conferirCaixa(9500, 9500)).toMatchObject({ tipo: "confere", diferencaCentavos: 0 });
  });

  it("diz quanto sobrou, em reais", () => {
    const r = conferirCaixa(10000, 9500);
    expect(r).toMatchObject({ tipo: "sobrou", diferencaCentavos: 500 });
    expect(texto(r.texto)).toBe("Sobram R$ 5,00 na gaveta.");
  });

  it("diz quanto faltou, em reais", () => {
    const r = conferirCaixa(9000, 9500);
    expect(r).toMatchObject({ tipo: "faltou", diferencaCentavos: -500 });
    expect(texto(r.texto)).toBe("Faltam R$ 5,00 na gaveta.");
  });

  it("trabalha em centavos: um centavo de diferença aparece", () => {
    expect(texto(conferirCaixa(10001, 10000).texto)).toBe("Sobram R$ 0,01 na gaveta.");
  });
});
