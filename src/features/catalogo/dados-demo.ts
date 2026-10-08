import type { Product, Service } from "./tipos";

// Dados de demonstração. Passam a vir do banco na Fase 2.
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
