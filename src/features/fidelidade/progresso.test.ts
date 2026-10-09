import { describe, expect, it } from "vitest";

import { progressoDoCartao } from "./progresso";

describe("progressoDoCartao", () => {
  it("começa zerado", () => {
    expect(progressoDoCartao(0, 10)).toEqual({
      saldo: 0,
      porPremio: 10,
      carimbos: 0,
      faltam: 10,
      premiosDisponiveis: 0,
      podeResgatar: false,
    });
  });

  it("mostra quantos faltam para o prêmio", () => {
    expect(progressoDoCartao(7, 10)).toMatchObject({ carimbos: 7, faltam: 3, podeResgatar: false });
  });

  it("completo: pode resgatar e o cartão aparece cheio", () => {
    expect(progressoDoCartao(10, 10)).toMatchObject({
      carimbos: 10,
      faltam: 0,
      premiosDisponiveis: 1,
      podeResgatar: true,
    });
  });

  it("saldo acima de N guarda mais de um prêmio", () => {
    expect(progressoDoCartao(23, 10)).toMatchObject({ premiosDisponiveis: 2, podeResgatar: true });
  });

  it("não aceita saldo negativo ou quebrado", () => {
    expect(progressoDoCartao(-3, 5)).toMatchObject({ saldo: 0, faltam: 5 });
    expect(progressoDoCartao(2.9, 5)).toMatchObject({ saldo: 2 });
  });
});
