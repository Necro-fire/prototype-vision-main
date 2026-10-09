import { describe, expect, it } from "vitest";

import {
  validarProduto,
  validarServico,
  type FormularioDeProduto,
  type FormularioDeServico,
} from "./catalogo-validacao";

const servico = (mudancas: Partial<FormularioDeServico> = {}): FormularioDeServico => ({
  nome: "Corte clássico",
  categoriaId: "cat-1",
  novaCategoria: "",
  descricao: "  Tesoura ou máquina  ",
  preco: "45,00",
  duracao: "30",
  destaque: false,
  ordem: "",
  ...mudancas,
});

const produto = (mudancas: Partial<FormularioDeProduto> = {}): FormularioDeProduto => ({
  nome: "Pente profissional",
  descricao: "",
  preco: "25",
  ordem: "3",
  ...mudancas,
});

describe("validarServico", () => {
  it("converte para os tipos do banco: preço em centavos e textos aparados", () => {
    expect(validarServico(servico())).toEqual({
      erros: {},
      dados: {
        nome: "Corte clássico",
        categoriaId: "cat-1",
        novaCategoria: null,
        descricao: "Tesoura ou máquina",
        precoCentavos: 4500,
        duracaoMinutos: 30,
        destaque: false,
        ordem: 0,
      },
    });
  });

  it("pede nome, preço e duração", () => {
    const { erros, dados } = validarServico(servico({ nome: " ", preco: "", duracao: "" }));
    expect(dados).toBeNull();
    expect(erros).toEqual({
      nome: "Informe o nome.",
      preco: "Informe o preço, por exemplo 45,00.",
      duracao: "Use de 5 a 480 minutos, de 5 em 5.",
    });
  });

  it("duração segue o que o banco aceita", () => {
    for (const ruim of ["0", "4", "7", "485", "481", "30,5", "-30", "abc"]) {
      expect(validarServico(servico({ duracao: ruim })).dados, ruim).toBeNull();
    }
    for (const boa of ["5", "15", "45", "480"]) {
      expect(validarServico(servico({ duracao: boa })).dados?.duracaoMinutos, boa).toBe(
        Number(boa),
      );
    }
  });

  it("preço zero é aceito (cortesia), negativo e com 3 casas não", () => {
    expect(validarServico(servico({ preco: "0" })).dados?.precoCentavos).toBe(0);
    expect(validarServico(servico({ preco: "-1" })).dados).toBeNull();
    expect(validarServico(servico({ preco: "1,999" })).dados).toBeNull();
  });

  it("categoria nova vale mais que a escolhida", () => {
    const { dados } = validarServico(servico({ categoriaId: "cat-1", novaCategoria: " Barba " }));
    expect(dados?.categoriaId).toBeNull();
    expect(dados?.novaCategoria).toBe("Barba");
  });

  it("sem categoria é permitido", () => {
    expect(validarServico(servico({ categoriaId: "" })).dados?.categoriaId).toBeNull();
  });

  it("nome de categoria nova curto demais", () => {
    expect(validarServico(servico({ novaCategoria: "A" })).erros.novaCategoria).toBeDefined();
  });

  it("ordem em branco vira 0; texto ou negativo é recusado", () => {
    expect(validarServico(servico({ ordem: "" })).dados?.ordem).toBe(0);
    expect(validarServico(servico({ ordem: "7" })).dados?.ordem).toBe(7);
    expect(validarServico(servico({ ordem: "-1" })).erros.ordem).toBeDefined();
    expect(validarServico(servico({ ordem: "x" })).erros.ordem).toBeDefined();
  });
});

describe("validarProduto", () => {
  it("converte e apara", () => {
    expect(validarProduto(produto({ nome: "  Pente  ", preco: "R$ 25,90" })).dados).toEqual({
      nome: "Pente",
      descricao: "",
      precoCentavos: 2590,
      ordem: 3,
    });
  });

  it("pede nome e preço", () => {
    const { erros, dados } = validarProduto(produto({ nome: "", preco: "x" }));
    expect(dados).toBeNull();
    expect(Object.keys(erros).sort()).toEqual(["nome", "preco"]);
  });
});
