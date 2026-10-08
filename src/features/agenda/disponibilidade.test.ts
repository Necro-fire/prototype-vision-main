import { describe, expect, it } from "vitest";
import { availableTimes } from "./disponibilidade";
import type { Booking } from "./tipos";

const booked: Booking = {
  id: "1",
  clientId: "1",
  name: "Cliente",
  phone: "11999999999",
  serviceId: "1",
  serviceName: "Corte",
  price: 45,
  duration: 60,
  date: "2099-10-07",
  time: "10:00",
  note: "",
  status: "Agendado",
};
const allDays = [0, 1, 2, 3, 4, 5, 6];

describe("Disponibilidade da agenda", () => {
  it("não oferece horários com conflitos inclusive durante a duração", () => {
    const slots = availableTimes("2099-10-07", 60, [booked], 9, 19, allDays);
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
  });
  it("respeita abertura e fechamento para a duração completa", () => {
    const slots = availableTimes("2099-10-07", 60, [], 9, 19, allDays);
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("18:00");
    expect(slots).not.toContain("18:30");
  });
  it("não permite reservar em dias fechados", () => {
    expect(availableTimes("2099-10-07", 30, [], 9, 19, [])).toEqual([]);
  });
  it("libera a disponibilidade de agendamentos cancelados", () => {
    const cancelled = [{ ...booked, status: "Cancelado" }];
    expect(availableTimes("2099-10-07", 60, cancelled, 9, 19, allDays)).toContain("10:00");
  });
});
