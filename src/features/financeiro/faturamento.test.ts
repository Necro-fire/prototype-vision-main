import { describe, expect, it } from "vitest";
import type { Booking } from "@/features/agenda/tipos";
import type { Sale } from "@/features/vendas/tipos";
import { grossRevenue } from "./faturamento";

const booking = (overrides: Partial<Booking>): Booking => ({
  id: "b",
  clientId: "c",
  name: "Cliente",
  phone: "11999999999",
  serviceId: "1",
  serviceName: "Corte",
  price: 0,
  duration: 30,
  date: "2026-10-08",
  time: "10:00",
  note: "",
  status: "Concluído",
  ...overrides,
});
const sale = (overrides: Partial<Sale>): Sale => ({
  id: "s",
  productId: "1",
  productName: "Produto",
  quantity: 1,
  total: 0,
  date: "2026-10-08",
  ...overrides,
});

describe("Faturamento bruto", () => {
  it("soma serviços concluídos e vendas, com filtros", () => {
    const b = [
      booking({ serviceId: "1", status: "Concluído", price: 45 }),
      booking({ serviceId: "2", status: "Cancelado", price: 35 }),
    ];
    const s = [
      sale({ productId: "1", date: "2026-10-08", total: 189 }),
      sale({ productId: "2", date: "2026-10-09", total: 89 }),
    ];
    expect(grossRevenue(b, s).total).toBe(323);
    expect(grossRevenue(b, s, { date: "2026-10-08" }).total).toBe(234);
    expect(grossRevenue(b, s, { serviceId: "1" }).total).toBe(45);
    expect(grossRevenue(b, s, { productId: "2" }).total).toBe(89);
  });
});
