import type { Booking } from "@/features/agenda/tipos";
import type { Sale } from "@/features/vendas/tipos";

export function grossRevenue(
  bookings: Booking[],
  sales: Sale[],
  f: { date?: string; serviceId?: string; productId?: string } = {},
) {
  const services = f.productId
    ? 0
    : bookings
        .filter(
          (b) =>
            b.status === "Concluído" &&
            (!f.date || b.date === f.date) &&
            (!f.serviceId || b.serviceId === f.serviceId),
        )
        .reduce((t, b) => t + b.price, 0);
  const products = f.serviceId
    ? 0
    : sales
        .filter(
          (v) => (!f.date || v.date === f.date) && (!f.productId || v.productId === f.productId),
        )
        .reduce((t, v) => t + v.total, 0);
  return { services, products, total: services + products };
}
