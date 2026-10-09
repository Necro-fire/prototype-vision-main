export type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  active: boolean;
  // Etiqueta "Mais pedido". Hoje marcada nos dados; o dono passa a marcar na Fase 4.
  featured?: boolean;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};

export const categories = ["Todos", "Cortes", "Barba", "Tratamentos", "Sobrancelha", "FreeStyle"];
