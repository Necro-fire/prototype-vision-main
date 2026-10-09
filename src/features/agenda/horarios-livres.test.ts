import { describe, expect, it } from "vitest";
import {
  diaDaSemanaDe,
  horaNoFuso,
  horariosLivres,
  instanteNoFuso,
  type ParametrosDeHorarios,
} from "./horarios-livres";

const SP = "America/Sao_Paulo";
const integral = [{ abre: "09:00", fecha: "19:00" }];

// Segunda-feira, 12 de outubro de 2026. "Agora" é domingo, para nada cair no passado.
const base: ParametrosDeHorarios = {
  dia: "2026-10-12",
  duracaoMinutos: 30,
  gradeMinutos: 30,
  fuso: SP,
  intervalos: integral,
  ocupados: [],
  agora: new Date("2026-10-11T12:00:00-03:00"),
  antecedenciaMaxDias: 30,
};
const locais = (p: ParametrosDeHorarios) => horariosLivres(p).map((i) => horaNoFuso(i, p.fuso));

describe("Horários livres no fuso da barbearia", () => {
  it("oferece o expediente inteiro numa grade de 30 minutos", () => {
    const horas = locais(base);
    expect(horas).toHaveLength(20);
    expect(horas[0]).toBe("09:00");
    expect(horas.at(-1)).toBe("18:30");
  });

  it("exige que o atendimento inteiro termine antes de fechar", () => {
    const horas = locais({ ...base, duracaoMinutos: 60 });
    expect(horas).toHaveLength(19);
    expect(horas.at(-1)).toBe("18:00");
    expect(horas).not.toContain("18:30");
  });

  it("respeita o intervalo de almoço (dois intervalos no mesmo dia)", () => {
    const horas = locais({
      ...base,
      duracaoMinutos: 60,
      intervalos: [
        { abre: "09:00", fecha: "12:00" },
        { abre: "14:00", fecha: "19:00" },
      ],
    });
    expect(horas).toContain("11:00");
    expect(horas).not.toContain("11:30"); // terminaria às 12:30, dentro do almoço
    expect(horas).not.toContain("12:00");
    expect(horas).not.toContain("13:30");
    expect(horas).toContain("14:00");
  });

  it("não oferece nada em dia fechado", () => {
    expect(horariosLivres({ ...base, intervalos: [] })).toEqual([]);
  });

  it("tira os horários ocupados, inclusive os que só se sobrepõem em parte", () => {
    const horas = locais({
      ...base,
      duracaoMinutos: 60,
      ocupados: [{ inicio: "2026-10-12T10:00:00-03:00", fim: "2026-10-12T10:30:00-03:00" }],
    });
    expect(horas).toContain("09:00"); // termina às 10:00, encosta sem sobrepor
    expect(horas).not.toContain("09:30"); // invadiria as 10:00
    expect(horas).not.toContain("10:00");
    expect(horas).toContain("10:30");
  });

  it("não oferece o que já passou nem o que está longe demais", () => {
    const agora = new Date("2026-10-12T12:00:00-03:00"); // meio-dia da própria segunda
    const horas = locais({ ...base, agora });
    expect(horas[0]).toBe("12:30");
    expect(horas).not.toContain("12:00"); // o instante exato de agora já passou
    expect(locais({ ...base, agora: new Date("2026-08-01T00:00:00-03:00") })).toEqual([]);
  });

  it("aceita outras grades", () => {
    expect(locais({ ...base, gradeMinutos: 60 })).toHaveLength(10);
    expect(locais({ ...base, gradeMinutos: 15, duracaoMinutos: 15 })).toHaveLength(40);
  });

  it("alinha a grade à hora do dia, não ao minuto em que o intervalo abre", () => {
    const horas = locais({ ...base, intervalos: [{ abre: "09:10", fecha: "11:00" }] });
    expect(horas).toEqual(["09:30", "10:00", "10:30"]);
  });

  it("devolve instantes em UTC: 09:00 em São Paulo é 12:00Z", () => {
    expect(horariosLivres(base)[0]).toBe("2026-10-12T12:00:00.000Z");
  });

  it("calcula o fuso de verdade, inclusive com horário de verão", () => {
    // Lisboa em julho está em UTC+1: 09:00 local = 08:00Z
    expect(new Date(instanteNoFuso("2026-07-15", 540, "Europe/Lisbon")).toISOString()).toBe(
      "2026-07-15T08:00:00.000Z",
    );
    // Lisboa em janeiro está em UTC+0
    expect(new Date(instanteNoFuso("2026-01-15", 540, "Europe/Lisbon")).toISOString()).toBe(
      "2026-01-15T09:00:00.000Z",
    );
    expect(new Date(instanteNoFuso("2026-10-12", 540, SP)).toISOString()).toBe(
      "2026-10-12T12:00:00.000Z",
    );
    expect(new Date(instanteNoFuso("2026-10-12", 540, "UTC")).toISOString()).toBe(
      "2026-10-12T09:00:00.000Z",
    );
  });

  it("mostra a hora no fuso da barbearia, não no do aparelho", () => {
    expect(horaNoFuso("2026-10-12T12:00:00Z", SP)).toBe("09:00");
    expect(horaNoFuso("2026-10-12T12:00:00Z", "UTC")).toBe("12:00");
  });

  it("descobre o dia da semana de uma data do calendário", () => {
    expect(diaDaSemanaDe("2026-10-12")).toBe(1); // segunda
    expect(diaDaSemanaDe("2026-10-11")).toBe(0); // domingo
    expect(diaDaSemanaDe("2026-10-10")).toBe(6); // sábado
  });
});
