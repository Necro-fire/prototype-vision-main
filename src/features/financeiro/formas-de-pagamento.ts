// Formas de pagamento aceitas na barbearia (regra F4). O banco só conhece estas quatro.
export type FormaPagamento = "pix" | "dinheiro" | "debito" | "credito";

export const formasDePagamento: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "debito", rotulo: "Débito" },
  { valor: "credito", rotulo: "Crédito" },
];

export const valoresDeFormaDePagamento = formasDePagamento.map((f) => f.valor) as [
  FormaPagamento,
  ...FormaPagamento[],
];

export function rotuloDaForma(forma: FormaPagamento | null): string {
  return formasDePagamento.find((f) => f.valor === forma)?.rotulo ?? "Sem forma registrada";
}
