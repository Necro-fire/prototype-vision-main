import { describe, expect, it } from "vitest";

import type { VendaDoDono } from "@/features/admin/vendas-do-dono";
import type { Agendamento } from "@/features/agenda/agendamentos";
import {
  agruparPorSemana,
  compararPeriodos,
  descreverVariacao,
  diasDoPeriodo,
  paraCsv,
  periodoAnterior,
  periodoPredefinido,
  quantosDias,
  rankingDeProdutos,
  rankingDeServicos,
  serieDiaria,
  validarPeriodo,
  variacaoPercentual,
} from "./relatorios";

const FUSO = "America/Sao_Paulo"; // UTC-3

const local = (dia: number, hora: number, minuto = 0, mes = 10) =>
  new Date(Date.UTC(2026, mes - 1, dia, hora + 3, minuto)).toISOString();

function servico(
  servicoId: string,
  nome: string,
  preco: number,
  inicio: string,
  extras: Partial<Agendamento> = {},
): Agendamento {
  return {
    id: `${servicoId}-${inicio}`,
    servicoId,
    servicoNome: nome,
    precoCentavos: preco,
    descontoCentavos: 0,
    duracaoMinutos: 30,
    inicio,
    fim: inicio,
    situacao: "concluido",
    observacao: "",
    ...extras,
  };
}

function venda(
  id: string,
  produtoId: string,
  nome: string,
  preco: number,
  quantidade: number,
  ocorridaEm: string,
  extras: Partial<VendaDoDono> = {},
): VendaDoDono {
  return {
    id,
    totalCentavos: preco * quantidade,
    descontoCentavos: 0,
    formaPagamento: "pix",
    ocorridaEm,
    estornadaEm: null,
    estornoMotivo: "",
    itens: [{ produtoId, produtoNome: nome, precoCentavos: preco, quantidade }],
    ...extras,
  };
}

describe("períodos", () => {
  it("conta os dias, inclusive as duas pontas", () => {
    expect(quantosDias({ de: "2026-10-01", ate: "2026-10-01" })).toBe(1);
    expect(quantosDias({ de: "2026-10-01", ate: "2026-10-31" })).toBe(31);
    expect(diasDoPeriodo({ de: "2026-10-30", ate: "2026-11-02" })).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
    ]);
  });

  it("o período anterior tem o mesmo tamanho e termina na véspera", () => {
    expect(periodoAnterior({ de: "2026-10-08", ate: "2026-10-14" })).toEqual({
      de: "2026-10-01",
      ate: "2026-10-07",
    });
    expect(periodoAnterior({ de: "2026-10-01", ate: "2026-10-31" })).toEqual({
      de: "2026-08-31",
      ate: "2026-09-30",
    });
  });

  it("atravessa virada de mês e de ano", () => {
    expect(periodoAnterior({ de: "2027-01-01", ate: "2027-01-03" })).toEqual({
      de: "2026-12-29",
      ate: "2026-12-31",
    });
  });

  it("monta os períodos prontos a partir de hoje", () => {
    expect(periodoPredefinido("ultimos7", "2026-10-12")).toEqual({
      de: "2026-10-06",
      ate: "2026-10-12",
    });
    expect(periodoPredefinido("ultimos30", "2026-10-12")).toEqual({
      de: "2026-09-13",
      ate: "2026-10-12",
    });
    expect(periodoPredefinido("mes", "2026-10-12")).toEqual({
      de: "2026-10-01",
      ate: "2026-10-12",
    });
    expect(periodoPredefinido("mesPassado", "2026-10-12")).toEqual({
      de: "2026-09-01",
      ate: "2026-09-30",
    });
    expect(periodoPredefinido("mesPassado", "2027-01-05")).toEqual({
      de: "2026-12-01",
      ate: "2026-12-31",
    });
  });

  it("recusa período incompleto, invertido ou maior que um ano", () => {
    expect(validarPeriodo({ de: "", ate: "2026-10-01" })).toMatch(/Escolha a data/);
    expect(validarPeriodo({ de: "2026-10-02", ate: "2026-10-01" })).toMatch(/igual ou depois/);
    expect(validarPeriodo({ de: "2025-01-01", ate: "2026-10-01" })).toMatch(/até um ano/);
    expect(validarPeriodo({ de: "2026-10-01", ate: "2026-10-31" })).toBeNull();
  });
});

describe("variacaoPercentual", () => {
  it("arredonda para uma casa decimal", () => {
    expect(variacaoPercentual(11250, 10000)).toBe(12.5);
    expect(variacaoPercentual(9000, 10000)).toBe(-10);
    expect(variacaoPercentual(10000, 10000)).toBe(0);
    expect(variacaoPercentual(10001, 30000)).toBe(-66.7);
  });

  it("sem base de comparação não há percentual", () => {
    expect(variacaoPercentual(5000, 0)).toBeNull();
    expect(variacaoPercentual(0, 0)).toBeNull();
  });
});

describe("descreverVariacao", () => {
  it("diz se subiu, caiu ou ficou igual, com vírgula decimal", () => {
    expect(descreverVariacao(12.5, 11250, 10000)).toBe("Subiu 12,5% sobre o período anterior");
    expect(descreverVariacao(-10, 9000, 10000)).toBe("Caiu 10,0% sobre o período anterior");
    expect(descreverVariacao(0, 100, 100)).toBe("Igual ao período anterior");
  });

  it("sem base de comparação, explica o motivo", () => {
    expect(descreverVariacao(null, 5000, 0)).toBe(
      "O período anterior não teve valor para comparar",
    );
    expect(descreverVariacao(null, 0, 0)).toBe("Sem movimento nos dois períodos");
  });
});

describe("compararPeriodos", () => {
  const atendimentos = [
    servico("corte", "Corte", 4500, local(12, 10)), // atual
    servico("corte", "Corte", 4500, local(13, 10), { descontoCentavos: 500 }), // atual, 40,00
    servico("barba", "Barba", 3500, local(6, 10)), // anterior
    servico("corte", "Corte", 4500, local(5, 10), { situacao: "cancelado" }), // não conta
  ];
  const vendas = [
    venda("v1", "pente", "Pente", 2500, 2, local(14, 15)), // atual
    venda("v2", "pente", "Pente", 2500, 1, local(7, 15)), // anterior
  ];
  const r = compararPeriodos(atendimentos, vendas, FUSO, { de: "2026-10-08", ate: "2026-10-14" });

  it("calcula os dois períodos com as mesmas regras do financeiro", () => {
    expect(r.periodoAnterior).toEqual({ de: "2026-10-01", ate: "2026-10-07" });
    expect(r.atual.totalCentavos).toBe(4500 + 4000 + 5000);
    expect(r.anterior.totalCentavos).toBe(3500 + 2500);
    expect(r.variacaoTotal).toBe(125);
    expect(r.variacaoServicos).toBe(142.9); // 8500 sobre 3500
    expect(r.variacaoProdutos).toBe(100); // 5000 sobre 2500
  });
});

describe("serieDiaria", () => {
  it("devolve todos os dias do período, com zero nos dias sem movimento", () => {
    const serie = serieDiaria(
      [servico("corte", "Corte", 4500, local(9, 10))],
      [venda("v1", "pente", "Pente", 2500, 1, local(11, 15))],
      FUSO,
      { de: "2026-10-08", ate: "2026-10-12" },
    );
    expect(serie.map((p) => p.dia)).toEqual([
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
    ]);
    expect(serie.map((p) => p.totalCentavos)).toEqual([0, 4500, 0, 2500, 0]);
  });

  it("respeita o dia da barbearia: 22h30 em São Paulo ainda é o mesmo dia", () => {
    const serie = serieDiaria([servico("corte", "Corte", 4500, local(9, 22, 30))], [], FUSO, {
      de: "2026-10-09",
      ate: "2026-10-10",
    });
    expect(serie.map((p) => p.totalCentavos)).toEqual([4500, 0]);
  });
});

describe("agruparPorSemana", () => {
  it("soma de sete em sete dias, com o primeiro dia de cada grupo", () => {
    const serie = diasDoPeriodo({ de: "2026-10-01", ate: "2026-10-10" }).map((dia, i) => ({
      dia,
      servicosCentavos: 100,
      produtosCentavos: i,
      totalCentavos: 100 + i,
    }));
    const grupos = agruparPorSemana(serie);
    expect(grupos.map((g) => g.dia)).toEqual(["2026-10-01", "2026-10-08"]);
    expect(grupos[0]?.totalCentavos).toBe(700 + 21);
    expect(grupos[1]?.totalCentavos).toBe(300 + 7 + 8 + 9);
  });
});

describe("rankings", () => {
  const periodo = { de: "2026-10-01", ate: "2026-10-31" };

  it("serviços: por valor cobrado, só concluídos do período", () => {
    const r = rankingDeServicos(
      [
        servico("corte", "Corte", 4500, local(2, 10)),
        servico("corte", "Corte", 4500, local(3, 10), { descontoCentavos: 4500 }), // grátis
        servico("barba", "Barba", 3500, local(4, 10)),
        servico("barba", "Barba", 3500, local(5, 10)),
        servico("sobr", "Sobrancelha", 1500, local(6, 10), { situacao: "cancelado" }),
        servico("fora", "Fora do período", 9900, local(2, 10, 0, 9)),
      ],
      FUSO,
      periodo,
    );
    expect(r).toEqual([
      { nome: "Barba", quantidade: 2, totalCentavos: 7000 },
      { nome: "Corte", quantidade: 2, totalCentavos: 4500 },
    ]);
  });

  it("produtos: soma as quantidades, ignora estornadas e desempata por quantidade e nome", () => {
    const r = rankingDeProdutos(
      [
        venda("v1", "pente", "Pente", 2500, 2, local(2, 10)),
        venda("v2", "pente", "Pente", 2500, 1, local(3, 10)),
        venda("v3", "tesoura", "Tesoura", 7500, 1, local(4, 10), { estornadaEm: local(4, 12) }),
        venda("v4", "gel", "Gel", 7500, 1, local(5, 10)),
        venda("v5", "cera", "Cera", 7500, 1, local(6, 10)),
      ],
      FUSO,
      periodo,
    );
    // Os três somam R$ 75,00; o Pente vendeu mais unidades e Cera vem antes de Gel pelo nome.
    expect(r.map((l) => l.nome)).toEqual(["Pente", "Cera", "Gel"]);
    expect(r[0]).toEqual({ nome: "Pente", quantidade: 3, totalCentavos: 7500 });
  });
});

describe("paraCsv", () => {
  it("separa por ponto e vírgula, termina linhas com CRLF e escreve o dinheiro com vírgula", () => {
    expect(
      paraCsv(
        ["Dia", "Total"],
        [
          ["2026-10-09", { centavos: 4550 }],
          ["2026-10-10", { centavos: 5 }],
        ],
      ),
    ).toBe("Dia;Total\r\n2026-10-09;45,50\r\n2026-10-10;0,05\r\n");
  });

  it("dinheiro negativo e quantidades saem sem aspas", () => {
    expect(paraCsv(["a", "b"], [[{ centavos: -250 }, 3]])).toBe("a;b\r\n-2,50;3\r\n");
  });

  it("protege campos com separador, aspas e quebra de linha", () => {
    expect(paraCsv(["Nome"], [["Corte; barba"], ['Ele disse "oi"'], ["linha1\nlinha2"]])).toBe(
      'Nome\r\n"Corte; barba"\r\n"Ele disse ""oi"""\r\n"linha1\nlinha2"\r\n',
    );
  });

  it("texto que viraria fórmula na planilha ganha uma aspa simples na frente", () => {
    const saida = paraCsv(["x"], [["=SOMA(A1)"], ["+1"], ["-1"], ["@cmd"], ["normal"]]);
    expect(saida).toBe("x\r\n'=SOMA(A1)\r\n'+1\r\n'-1\r\n'@cmd\r\nnormal\r\n");
  });
});
