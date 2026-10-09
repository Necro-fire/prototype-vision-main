// Datas do sistema são texto "AAAA-MM-DD". Meio-dia evita virar o dia por causa de fuso.
const emData = (iso: string) => new Date(`${iso}T12:00:00`);

// "08/10/2026"
export const dataCurta = (iso: string) => emData(iso).toLocaleDateString("pt-BR");

// "quinta-feira, 8 de outubro"
export const dataLonga = (iso: string) =>
  emData(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

// "qui"
export const diaDaSemanaCurto = (iso: string) =>
  emData(iso).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");

// "8"
export const diaDoMes = (iso: string) => String(emData(iso).getDate());
