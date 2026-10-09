export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// "R$ 45" quando o valor é inteiro; "R$ 45,50" quando não é. Para tabelas de preço.
export const precoCurto = (value: number) =>
  Number.isInteger(value) ? money(value).replace(",00", "") : money(value);

// O banco guarda dinheiro em centavos inteiros; a tela mostra em reais.
export const precoCurtoDeCentavos = (centavos: number) => precoCurto(centavos / 100);
