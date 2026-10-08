import { describe, expect, it } from "vitest";
import { availableTimes, normalizePhone, type Booking } from "@/lib/barbershop";
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
describe("Regras de agendamento do PRD", () => {
  it("normaliza o mesmo celular para uma identificação única", () => {
    expect(normalizePhone("+55 (11) 99999-9999")).toBe(normalizePhone("11999999999"));
    expect(normalizePhone("(11) 99999-9999")).toBe("11999999999");
  });
  it("não oferece horários com conflitos inclusive durante a duração", () => {
    const slots = availableTimes("2099-10-07", 60, [booked], 9, 19, [0, 1, 2, 3, 4, 5, 6]);
    expect(slots).not.toContain("09:30");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
  });
  it("respeita abertura e fechamento para a duração completa", () => {
    const slots = availableTimes("2099-10-07", 60, [], 9, 19, [0, 1, 2, 3, 4, 5, 6]);
    expect(slots[0]).toBe("09:00");
    expect(slots.at(-1)).toBe("18:00");
    expect(slots).not.toContain("18:30");
  });
  it("não permite reservar em dias fechados", () => {
    expect(availableTimes("2099-10-07", 30, [], 9, 19, [])).toEqual([]);
  });
  it("libera a disponibilidade de agendamentos cancelados", () => {
    expect(
      availableTimes(
        "2099-10-07",
        60,
        [{ ...booked, status: "Cancelado" }],
        9,
        19,
        [0, 1, 2, 3, 4, 5, 6],
      ),
    ).toContain("10:00");
  });
});
import { checkAdmin, grossRevenue } from "@/lib/barbershop";
describe("admin e financeiro", () => {
  it("aceita só as credenciais administrativas", () => {
    expect(checkAdmin("admin@slick.demo", "slick123")).toBe(true);
    expect(checkAdmin("admin@slick.demo", "x")).toBe(false);
  });
  it("faturamento bruto soma serviços concluídos e vendas, com filtros", () => {
    const b: any[] = [
      { serviceId: "1", status: "Concluído", date: "2026-10-08", price: 45 },
      { serviceId: "2", status: "Cancelado", date: "2026-10-08", price: 35 },
    ];
    const s: any[] = [
      { productId: "1", date: "2026-10-08", total: 189 },
      { productId: "2", date: "2026-10-09", total: 89 },
    ];
    expect(grossRevenue(b, s).total).toBe(323);
    expect(grossRevenue(b, s, { date: "2026-10-08" }).total).toBe(234);
    expect(grossRevenue(b, s, { serviceId: "1" }).total).toBe(45);
    expect(grossRevenue(b, s, { productId: "2" }).total).toBe(89);
  });
});
