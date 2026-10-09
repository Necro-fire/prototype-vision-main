import { describe, expect, it } from "vitest";

import {
  abertoAgora,
  descreverExpediente,
  expedienteDeLinhas,
  horaCurta,
  momentoNoFuso,
  rotuloDoDia,
  somarDias,
  type Expediente,
} from "./expediente";

const FUSO = "America/Sao_Paulo"; // UTC-3, sem horário de verão desde 2019

const dia = (abre: string, fecha: string) => [{ abre, fecha }];
const util = dia("09:00", "19:00");

// Segunda a sábado, das 9h às 19h. Domingo fechado.
const segundaASabado: Expediente = {
  fuso: FUSO,
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [[], util, util, util, util, util, util],
};

const comAlmoco = [
  { abre: "09:00", fecha: "12:00" },
  { abre: "14:00", fecha: "19:00" },
];

// 2026-10-12 é segunda-feira. Os instantes abaixo estão em UTC; o fuso desconta 3 horas.
const segunda = (horaLocal: number, minuto = 0) =>
  new Date(Date.UTC(2026, 9, 12, horaLocal + 3, minuto));

describe("expedienteDeLinhas", () => {
  it("lê as horas do Postgres, ordena os intervalos e separa por dia da semana", () => {
    const exp = expedienteDeLinhas({ fuso: FUSO, grade_minutos: 15, antecedencia_max_dias: 20 }, [
      { dia_semana: 1, abre: "14:00:00", fecha: "19:00:00" },
      { dia_semana: 1, abre: "09:00:00", fecha: "12:00:00" },
      { dia_semana: 6, abre: "09:00:00", fecha: "14:00:00" },
    ]);
    expect(exp.gradeMinutos).toBe(15);
    expect(exp.antecedenciaMaxDias).toBe(20);
    expect(exp.porDia[0]).toEqual([]);
    expect(exp.porDia[1]).toEqual(comAlmoco);
    expect(exp.porDia[6]).toEqual(dia("09:00", "14:00"));
  });

  it("recusa linha fora do formato", () => {
    expect(() =>
      expedienteDeLinhas({ fuso: FUSO, grade_minutos: 30, antecedencia_max_dias: 30 }, [
        { dia_semana: 9, abre: "09:00:00", fecha: "19:00:00" },
      ]),
    ).toThrow();
  });
});

describe("momentoNoFuso", () => {
  it("usa o fuso da barbearia, não o do aparelho", () => {
    // 02:30 UTC de segunda ainda é domingo, 23:30, em São Paulo.
    const m = momentoNoFuso(new Date("2026-10-12T02:30:00Z"), FUSO);
    expect(m).toEqual({ data: "2026-10-11", minutos: 23 * 60 + 30, diaSemana: 0 });
  });

  it("não confunde a meia-noite com 24h", () => {
    const m = momentoNoFuso(new Date("2026-10-12T03:00:00Z"), FUSO);
    expect(m).toEqual({ data: "2026-10-12", minutos: 0, diaSemana: 1 });
  });
});

describe("abertoAgora", () => {
  it("aberto: diz até que horas", () => {
    expect(abertoAgora(segundaASabado, segunda(10))).toEqual({
      aberto: true,
      texto: "Aberto agora, até as 19h",
    });
  });

  it("abre exatamente na hora marcada e fecha exatamente no fechamento", () => {
    expect(abertoAgora(segundaASabado, segunda(9)).aberto).toBe(true);
    expect(abertoAgora(segundaASabado, segunda(18, 59)).aberto).toBe(true);
    expect(abertoAgora(segundaASabado, segunda(19)).aberto).toBe(false);
  });

  it("antes de abrir: abre hoje", () => {
    expect(abertoAgora(segundaASabado, segunda(8))).toEqual({
      aberto: false,
      texto: "Fechado. Abre hoje às 9h",
    });
  });

  it("no almoço: fechado e volta no segundo intervalo", () => {
    const exp = { ...segundaASabado, porDia: [[], comAlmoco, [], [], [], [], []] };
    expect(abertoAgora(exp, segunda(11, 59))).toEqual({
      aberto: true,
      texto: "Aberto agora, até as 12h",
    });
    expect(abertoAgora(exp, segunda(12, 30))).toEqual({
      aberto: false,
      texto: "Fechado. Abre hoje às 14h",
    });
  });

  it("depois de fechar: abre amanhã", () => {
    expect(abertoAgora(segundaASabado, segunda(20)).texto).toBe("Fechado. Abre amanhã às 9h");
  });

  it("pula o dia fechado e diz o nome do dia", () => {
    // Sábado, 19h30: domingo fechado, abre segunda.
    const sabado = new Date(Date.UTC(2026, 9, 17, 19 + 3, 30));
    expect(abertoAgora(segundaASabado, sabado).texto).toBe("Fechado. Abre segunda às 9h");
  });

  it("domingo, com segunda aberta, abre amanhã", () => {
    const domingo = new Date(Date.UTC(2026, 9, 11, 15));
    expect(abertoAgora(segundaASabado, domingo).texto).toBe("Fechado. Abre amanhã às 9h");
  });

  it("só uma semana depois, quando o único dia aberto já passou", () => {
    const soSegunda = { ...segundaASabado, porDia: [[], util, [], [], [], [], []] };
    expect(abertoAgora(soSegunda, segunda(20)).texto).toBe("Fechado. Abre segunda que vem às 9h");
  });

  it("sem nenhum dia aberto", () => {
    const fechado = { ...segundaASabado, porDia: [[], [], [], [], [], [], []] };
    expect(abertoAgora(fechado, segunda(10))).toEqual({
      aberto: false,
      texto: "Fechado no momento",
    });
  });
});

describe("descreverExpediente", () => {
  it("junta os dias com o mesmo horário", () => {
    expect(descreverExpediente(segundaASabado)).toEqual([
      { dias: "segunda a sábado", horas: "9h às 19h" },
    ]);
  });

  it("separa os dias com horário diferente e mostra o almoço", () => {
    const exp = {
      ...segundaASabado,
      porDia: [[], comAlmoco, comAlmoco, comAlmoco, [], [], dia("08:30", "14:00")],
    };
    expect(descreverExpediente(exp)).toEqual([
      { dias: "segunda a quarta", horas: "9h às 12h e 14h às 19h" },
      { dias: "sábado", horas: "8h30 às 14h" },
    ]);
  });

  it("sem funcionamento, não descreve nada", () => {
    expect(
      descreverExpediente({ ...segundaASabado, porDia: [[], [], [], [], [], [], []] }),
    ).toEqual([]);
  });
});

describe("datas de calendário", () => {
  it("horaCurta", () => {
    expect(horaCurta("19:00")).toBe("19h");
    expect(horaCurta("09:00")).toBe("9h");
    expect(horaCurta("12:30")).toBe("12h30");
  });

  it("somarDias atravessa o fim do mês e do ano", () => {
    expect(somarDias("2026-10-12", 3)).toBe("2026-10-15");
    expect(somarDias("2026-10-30", 3)).toBe("2026-11-02");
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("rotuloDoDia", () => {
    expect(rotuloDoDia("2026-10-12", "2026-10-12")).toBe("hoje");
    expect(rotuloDoDia("2026-10-13", "2026-10-12")).toBe("amanhã");
    expect(rotuloDoDia("2026-10-16", "2026-10-12")).toBe("sexta, 16/10");
  });
});
