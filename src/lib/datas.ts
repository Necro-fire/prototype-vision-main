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

// "09/10/2026, 14:30", visto no fuso informado (o da barbearia).
export const dataHoraCurta = (instante: string, fuso: string) =>
  new Date(instante).toLocaleString("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
