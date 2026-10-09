import { describe, expect, it } from "vitest";

import type { VendaDoDono } from "@/features/admin/vendas-do-dono";
import type { Agendamento, Situacao } from "@/features/agenda/agendamentos";
import { faturamentoBruto, faturamentoPorDia } from "./faturamento";

const FUSO = "America/Sao_Paulo"; // UTC-3

// Hora local de São Paulo em outubro de 2026, como instante ISO.
const local = (dia: number, hora: number, minuto = 0) =>
  new Date(Date.UTC(2026, 9, dia, hora + 3, minuto)).toISOString();

function atendimento(
  servicoId: string,
  precoCentavos: number,
  situacao: Situacao,
  inicio: string,
): Agendamento {
  return {
    id: `${servicoId}-${inicio}`,
    servicoId,
    servicoNome: servicoId,
    precoCentavos,
    duracaoMinutos: 30,
    inicio,
    fim: inicio,
    situacao,
    observacao: "",
  };
}

function venda(
  id: string,
  itens: { produtoId: string; precoCentavos: number; quantidade: number }[],
  ocorridaEm: string,
  extras: Partial<VendaDoDono> = {},
): VendaDoDono {
  const bruto = itens.reduce((t, i) => t + i.precoCentavos * i.quantidade, 0);
  return {
    id,
    totalCentavos: bruto,
    descontoCentavos: 0,
    formaPagamento: null,
    ocorridaEm,
    estornadaEm: null,
    itens: itens.map((i) => ({ ...i, produtoNome: i.produtoId })),
    ...extras,
  };
}

const atendimentos = [
  atendimento("corte", 4500, "concluido", local(8, 10)),
  atendimento("barba", 3500, "cancelado", local(8, 11)),
  atendimento("corte", 4500, "concluido", local(9, 10)),
  atendimento("barba", 3500, "nao_compareceu", local(9, 12)),
  atendimento("barba", 3500, "agendado", local(9, 14)),
];
const vendas = [
  venda("v1", [{ produtoId: "maquina", precoCentavos: 18900, quantidade: 1 }], local(8, 15)),
  venda("v2", [{ produtoId: "pente", precoCentavos: 2500, quantidade: 2 }], local(9, 16)),
];

describe("faturamentoBruto", () => {
  it("soma só o que foi concluído e as vendas, em centavos", () => {
    expect(faturamentoBruto(atendimentos, vendas, FUSO)).toEqual({
      servicosCentavos: 9000,
      produtosCentavos: 23900,
      totalCentavos: 32900,
      atendimentos: 2,
      vendas: 2,
    });
  });

  it("filtra por período, inclusive nas duas pontas", () => {
    expect(faturamentoBruto(atendimentos, vendas, FUSO, { de: "2026-10-09" }).totalCentavos).toBe(
      4500 + 5000,
    );
    expect(faturamentoBruto(atendimentos, vendas, FUSO, { ate: "2026-10-08" }).totalCentavos).toBe(
      4500 + 18900,
    );
    expect(
      faturamentoBruto(atendimentos, vendas, FUSO, { de: "2026-10-08", ate: "2026-10-08" })
        .totalCentavos,
    ).toBe(4500 + 18900);
  });

  it("o dia é o da barbearia: 22h30 em São Paulo ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC", () => {
    const noite = [atendimento("corte", 4500, "concluido", local(8, 22, 30))];
    expect(
      faturamentoBruto(noite, [], FUSO, { de: "2026-10-08", ate: "2026-10-08" }).totalCentavos,
    ).toBe(4500);
    expect(faturamentoBruto(noite, [], FUSO, { de: "2026-10-09" }).totalCentavos).toBe(0);
  });

  it("escolher um serviço zera os produtos; escolher um produto zera os serviços", () => {
    const soCorte = faturamentoBruto(atendimentos, vendas, FUSO, { servicoId: "corte" });
    expect(soCorte).toMatchObject({ servicosCentavos: 9000, produtosCentavos: 0 });
    const soPente = faturamentoBruto(atendimentos, vendas, FUSO, { produtoId: "pente" });
    expect(soPente).toMatchObject({ servicosCentavos: 0, produtosCentavos: 5000, vendas: 1 });
  });

  it("venda estornada não conta", () => {
    const comEstorno = [
      ...vendas,
      venda("v3", [{ produtoId: "maquina", precoCentavos: 18900, quantidade: 1 }], local(9, 17), {
        estornadaEm: local(9, 18),
      }),
    ];
    expect(faturamentoBruto([], comEstorno, FUSO).totalCentavos).toBe(23900);
  });

  it("com desconto, o total é o da venda; no filtro por produto, o valor do item", () => {
    const comDesconto = [
      venda("v4", [{ produtoId: "pente", precoCentavos: 2500, quantidade: 2 }], local(9, 16), {
        totalCentavos: 4000,
        descontoCentavos: 1000,
      }),
    ];
    expect(faturamentoBruto([], comDesconto, FUSO).produtosCentavos).toBe(4000);
    expect(faturamentoBruto([], comDesconto, FUSO, { produtoId: "pente" }).produtosCentavos).toBe(
      5000,
    );
  });

  it("sem nada, tudo zero", () => {
    expect(faturamentoBruto([], [], FUSO)).toEqual({
      servicosCentavos: 0,
      produtosCentavos: 0,
      totalCentavos: 0,
      atendimentos: 0,
      vendas: 0,
    });
  });

  it("não perde centavo ao somar valores que o ponto flutuante erra", () => {
    const muitos = Array.from({ length: 10 }, (_, i) =>
      atendimento("x", 10, "concluido", local(8, 9, i)),
    );
    expect(faturamentoBruto(muitos, [], FUSO).totalCentavos).toBe(100);
  });
});

describe("faturamentoPorDia", () => {
  it("um resumo por dia, do mais recente para o mais antigo", () => {
    expect(faturamentoPorDia(atendimentos, vendas, FUSO)).toEqual([
      { dia: "2026-10-09", servicosCentavos: 4500, produtosCentavos: 5000, totalCentavos: 9500 },
      { dia: "2026-10-08", servicosCentavos: 4500, produtosCentavos: 18900, totalCentavos: 23400 },
    ]);
  });

  it("respeita o filtro e soma o mesmo que o total", () => {
    const filtro = { de: "2026-10-09" };
    const dias = faturamentoPorDia(atendimentos, vendas, FUSO, filtro);
    expect(dias).toHaveLength(1);
    expect(dias.reduce((t, d) => t + d.totalCentavos, 0)).toBe(
      faturamentoBruto(atendimentos, vendas, FUSO, filtro).totalCentavos,
    );
  });
});
