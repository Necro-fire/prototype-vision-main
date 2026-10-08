import { describe, expect, it } from "vitest";
import { proximosHorarios, rotuloDia } from "./proximo-horario";
import type { Booking } from "./tipos";

const hours = { open: 9, close: 19, days: [1, 2, 3, 4, 5, 6] };

function segundaDe2099() {
  const d = new Date(2099, 0, 1, 12);
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  return d;
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const diaInteiro = (date: string): Booking => ({
  id: "x",
  clientId: "c",
  name: "Cliente",
  phone: "11999999999",
  serviceId: "1",
  serviceName: "Dia todo",
  price: 0,
  duration: 600,
  date,
  time: "09:00",
  note: "",
  status: "Agendado",
});

describe("Próximo horário livre", () => {
  it("devolve os horários do primeiro dia quando há vaga", () => {
    const segunda = segundaDe2099();
    const achado = proximosHorarios(30, [], hours, segunda);
    expect(achado?.date).toBe(iso(segunda));
    expect(achado?.times[0]).toBe("09:00");
  });
  it("pula o dia lotado e vai para o seguinte", () => {
    const segunda = segundaDe2099();
    const terca = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 1);
    const achado = proximosHorarios(30, [diaInteiro(iso(segunda))], hours, segunda);
    expect(achado?.date).toBe(iso(terca));
  });
  it("pula o dia fechado", () => {
    const segunda = segundaDe2099();
    const domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() - 1);
    const achado = proximosHorarios(30, [], hours, domingo);
    expect(achado?.date).toBe(iso(segunda));
  });
  it("devolve nada quando não há vaga no período", () => {
    expect(proximosHorarios(30, [], { ...hours, days: [] }, segundaDe2099())).toBeNull();
  });
});

describe("Rótulo do dia", () => {
  const segunda = segundaDe2099();
  const somar = (n: number) =>
    iso(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + n));
  it("chama de hoje e de amanhã", () => {
    expect(rotuloDia(somar(0), segunda)).toBe("hoje");
    expect(rotuloDia(somar(1), segunda)).toBe("amanhã");
  });
  it("nos demais dias, diz o dia da semana e a data", () => {
    expect(rotuloDia(somar(3), segunda)).toMatch(/^quinta, \d{1,2}\/\d{1,2}$/);
  });
});
