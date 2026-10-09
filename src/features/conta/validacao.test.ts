import { describe, expect, it } from "vitest";

import {
  caminhoSeguro,
  validarCelular,
  validarEmail,
  validarNome,
  validarSenha,
  voltarDaBusca,
} from "./validacao";

describe("validação do cadastro", () => {
  it("e-mail", () => {
    expect(validarEmail("")).toBe("Informe seu e-mail.");
    expect(validarEmail("   ")).toBe("Informe seu e-mail.");
    expect(validarEmail("ana@")).toBe("Confira o e-mail: faltou algo.");
    expect(validarEmail("ana@exemplo")).toBe("Confira o e-mail: faltou algo.");
    expect(validarEmail("ana@exemplo.com")).toBeUndefined();
    expect(validarEmail("  ana@exemplo.com.br ")).toBeUndefined();
  });

  it("senha: mínimo de 8 caracteres", () => {
    expect(validarSenha("")).toBe("Crie uma senha.");
    expect(validarSenha("1234567")).toBe("Use pelo menos 8 caracteres.");
    expect(validarSenha("12345678")).toBeUndefined();
  });

  it("nome", () => {
    expect(validarNome(" ")).toBe("Informe seu nome.");
    expect(validarNome("A")).toBe("Informe seu nome.");
    expect(validarNome("Ana")).toBeUndefined();
  });

  it("celular com DDD, com ou sem máscara e com o 55 na frente", () => {
    expect(validarCelular("")).toBeDefined();
    expect(validarCelular("91234-5678")).toBeDefined();
    expect(validarCelular("(11) 91234-5678")).toBeUndefined();
    expect(validarCelular("11 1234-5678")).toBeUndefined();
    expect(validarCelular("+55 11 91234-5678")).toBeUndefined();
  });
});

describe("caminhoSeguro", () => {
  it("aceita só caminho do próprio site", () => {
    expect(caminhoSeguro("/agendamento?service=1")).toBe("/agendamento?service=1");
    expect(caminhoSeguro("/cliente")).toBe("/cliente");
  });

  it("recusa endereço de outro site e volta ao padrão", () => {
    const perigosos = [
      "https://outro.com",
      "//outro.com",
      "/\\outro.com",
      "outro.com",
      "javascript:alert(1)",
      "",
      undefined,
      42,
      null,
    ];
    for (const perigoso of perigosos) {
      expect(caminhoSeguro(perigoso)).toBe("/cliente");
    }
  });

  it("usa o padrão que a tela pedir", () => {
    expect(caminhoSeguro("https://outro.com", "/")).toBe("/");
  });
});

describe("voltarDaBusca", () => {
  it("guarda o caminho seguro e descarta o resto", () => {
    expect(voltarDaBusca({ voltar: "/agendamento?service=1" })).toBe("/agendamento?service=1");
    expect(voltarDaBusca({ voltar: "https://outro.com" })).toBeUndefined();
    expect(voltarDaBusca({ voltar: ["/a"] })).toBeUndefined();
    expect(voltarDaBusca({})).toBeUndefined();
  });
});
