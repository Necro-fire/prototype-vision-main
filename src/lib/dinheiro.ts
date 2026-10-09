export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// "R$ 45" quando o valor é inteiro; "R$ 45,50" quando não é. Para tabelas de preço.
export const precoCurto = (value: number) =>
  Number.isInteger(value) ? money(value).replace(",00", "") : money(value);

// O banco guarda dinheiro em centavos inteiros; a tela mostra em reais.
export const precoCurtoDeCentavos = (centavos: number) => precoCurto(centavos / 100);

// "45", "45,5", "45.50", "R$ 1.234,56" → centavos inteiros. Nulo se não for um valor válido
// (vazio, negativo, texto, mais de duas casas decimais). Nada de ponto flutuante: o dinheiro
// é inteiro de ponta a ponta.
export function reaisParaCentavos(texto: string): number | null {
  let valor = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  if (valor.includes(",")) {
    valor = valor.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(valor)) {
    valor = valor.replace(/\./g, ""); // "1.234" é mil duzentos e trinta e quatro
  }
  const casamento = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!casamento) return null;
  const reais = Number(casamento[1]);
  const centavos = Number((casamento[2] ?? "").padEnd(2, "0") || "0");
  const total = reais * 100 + centavos;
  return Number.isSafeInteger(total) ? total : null;
}

// 4500 → "45,00", para preencher um campo de edição.
export const centavosParaCampo = (centavos: number) =>
  `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, "0")}`;

// "R$ 1.234,56", sempre com os centavos, para totais e relatórios.
export const dinheiroDeCentavos = (centavos: number) => money(centavos / 100);
