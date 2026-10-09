// Estado provisório da demonstração: tudo vive na memória do navegador.
// Este arquivo é removido quando o banco entrar (Fases 2 e 3).
import type React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { availableTimes } from "@/features/agenda/disponibilidade";
import type { Booking } from "@/features/agenda/tipos";
import { initialProducts, initialServices } from "@/features/catalogo/dados-demo";
import type { Client } from "@/features/clientes/tipos";
import { checkAdmin } from "@/features/conta/admin-demo";
import type { Sale } from "@/features/vendas/tipos";
import { normalizePhone } from "@/lib/telefone";

function useShopState() {
  const [services, setServices] = useState(initialServices);
  const [products, setProducts] = useState(initialProducts);
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hours, setHours] = useState({ open: 9, close: 19, days: [1, 2, 3, 4, 5, 6] });
  const [currentPhone, setCurrentPhone] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [admin, setAdmin] = useState(false);
  function login(email: string, password: string) {
    const ok = checkAdmin(email, password);
    setAdmin(ok);
    return ok;
  }
  function sell(productId: string, quantity: number, date: string) {
    const p = products.find((x) => x.id === productId && x.active);
    if (!p || !Number.isInteger(quantity) || quantity < 1)
      throw new Error("Escolha um produto ativo e uma quantidade válida.");
    setSales((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        productId,
        productName: p.name,
        quantity,
        total: p.price * quantity,
        date,
      },
    ]);
  }
  function book(data: {
    name: string;
    phone: string;
    serviceId: string;
    date: string;
    time: string;
    note: string;
  }) {
    const service = services.find((s) => s.id === data.serviceId && s.active);
    const phone = normalizePhone(data.phone);
    if (!service || !/^\d{10,11}$/.test(phone) || !data.name.trim())
      throw new Error("Confira seu nome e celular com DDD.");
    if (
      !availableTimes(
        data.date,
        service.duration,
        bookings,
        hours.open,
        hours.close,
        hours.days,
      ).includes(data.time)
    )
      throw new Error("Este horário não está mais disponível. Escolha outro.");
    const client = clients.find((c) => c.phone === phone) ?? {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      phone,
    };
    if (!clients.some((c) => c.id === client.id)) setClients((old) => [...old, client]);
    const booking: Booking = {
      ...data,
      id: crypto.randomUUID(),
      clientId: client.id,
      name: client.name,
      phone,
      serviceName: service.name,
      price: service.price,
      duration: service.duration,
      status: "Agendado",
    };
    setBookings((old) => [...old, booking]);
    setCurrentPhone(phone);
    return booking;
  }
  return {
    services,
    setServices,
    products,
    setProducts,
    clients,
    bookings,
    setBookings,
    hours,
    setHours,
    book,
    currentPhone,
    setCurrentPhone,
    sales,
    sell,
    admin,
    login,
    logout: () => setAdmin(false),
  };
}

type Shop = ReturnType<typeof useShopState>;
// Keep one context instance across hot reloads so the provider and screens always match.
const g = globalThis as typeof globalThis & { __onstyleShopContext?: React.Context<Shop | null> };
const ShopContext = (g.__onstyleShopContext ??= createContext<Shop | null>(null));

export function ShopProvider({ children }: { children: ReactNode }) {
  const shop = useShopState();
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("ShopProvider required");
  return shop;
}
