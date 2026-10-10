import { describe, expect, it } from "vitest";

import type { Expediente } from "@/features/agenda/expediente";
import { quadroSemanal } from "./quadro-semanal";

const expediente: Expediente = {
  fuso: "America/Sao_Paulo",
  gradeMinutos: 30,
  antecedenciaMaxDias: 30,
  porDia: [
    [],
    [
      { abre: "09:00", fecha: "12:00" },
      { abre: "14:00", fecha: "18:00" },
    ],
    [{ abre: "09:00", fecha: "19:00" }],
    [{ abre: "09:00", fecha: "19:00" }],
    [{ abre: "09:00", fecha: "19:00" }],
    [{ abre: "09:00", fecha: "19:00" }],
    [{ abre: "09:00", fecha: "13:30" }],
  ],
};

describe("quadroSemanal", () => {
  it("começa na segunda e termina no domingo", () => {
    const nomes = quadroSemanal(expediente).map((l) => l.nome);
    expect(nomes).toEqual(["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]);
  });

  it("junta os intervalos do dia e marca o dia fechado", () => {
    const linhas = quadroSemanal(expediente);
    expect(linhas[0]?.horas).toBe("9h às 12h e 14h às 18h");
    expect(linhas[5]?.horas).toBe("9h às 13h30");
    expect(linhas[6]).toMatchObject({ dia: 0, horas: null });
  });
});
