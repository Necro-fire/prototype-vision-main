import type React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
};
export type Booking = {
  id: string;
  clientId: string;
  name: string;
  phone: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  date: string;
  time: string;
  note: string;
  status: string;
};
export type Client = { id: string; name: string; phone: string };
export const categories = ["Todos", "Cortes", "Barba", "Tratamentos", "Sobrancelha", "FreeStyle"];
export const initialServices: Service[] = [
  {
    id: "1",
    name: "Corte clássico",
    category: "Cortes",
    description: "Na tesoura ou máquina. Acabamento preciso, estilo que permanece.",
    price: 45,
    duration: 30,
    active: true,
  },
  {
    id: "2",
    name: "Barba & navalha",
    category: "Barba",
    description: "Toalha quente, desenho da barba e o ritual da navalha.",
    price: 35,
    duration: 30,
    active: true,
  },
  {
    id: "3",
    name: "Corte + barba",
    category: "Cortes",
    description: "O cuidado completo. Seu corte e sua barba em perfeita sintonia.",
    price: 70,
    duration: 60,
    active: true,
  },
  {
    id: "4",
    name: "Hidratação capilar",
    category: "Tratamentos",
    description: "Renovação e cuidado profundo para um cabelo saudável.",
    price: 30,
    duration: 30,
    active: true,
  },
  {
    id: "5",
    name: "Sobrancelha",
    category: "Sobrancelha",
    description: "Limpeza e definição na medida certa, sem perder a naturalidade.",
    price: 15,
    duration: 15,
    active: true,
  },
  {
    id: "6",
    name: "FreeStyle",
    category: "FreeStyle",
    description: "Personalidade em cada traço. Um desenho feito só para você.",
    price: 60,
    duration: 60,
    active: true,
  },
];
export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};
export const initialProducts: Product[] = [
  {
    id: "1",
    name: "Máquina de acabamento",
    description: "Precisão profissional · Bivolt",
    price: 189,
    active: true,
  },
  {
    id: "2",
    name: "Tesoura de corte",
    description: "Aço inoxidável · 6 polegadas",
    price: 89,
    active: true,
  },
  {
    id: "3",
    name: "Pente profissional",
    description: "Antiestático · Uso diário",
    price: 25,
    active: true,
  },
];
export type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  total: number;
  date: string;
};
export const DEMO_ADMIN = { email: "admin@slick.demo", password: "slick123" };
export function checkAdmin(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
}
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
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
const minutes = (time: string) => {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
};
export function availableTimes(
  date: string,
  duration: number,
  bookings: Booking[],
  open: number,
  close: number,
  days: number[],
) {
  if (!date || date < today() || !days.includes(new Date(`${date}T12:00:00`).getDay())) return [];
  const result: string[] = [];
  const now = new Date();
  for (let start = open * 60; start + duration <= close * 60; start += 30) {
    if (date === today() && start <= now.getHours() * 60 + now.getMinutes()) continue;
    if (
      bookings.some(
        (b) =>
          b.date === date &&
          !["Cancelado", "Não compareceu"].includes(b.status) &&
          start < minutes(b.time) + b.duration &&
          start + duration > minutes(b.time),
      )
    )
      continue;
    result.push(
      `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`,
    );
  }
  return result;
}
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
const g = globalThis as typeof globalThis & { __slickShopContext?: React.Context<Shop | null> };
const ShopContext = (g.__slickShopContext ??= createContext<Shop | null>(null));
export function ShopProvider({ children }: { children: ReactNode }) {
  const shop = useShopState();
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>;
}
export function useShop() {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("ShopProvider required");
  return shop;
}
