// Vendas de produtos como o dono vê. Registrar e estornar são funções do banco (validam produto,
// quantidade e desconto); venda não se apaga, estorna-se, e o estorno fica no histórico (F3).
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export const chavesDeVendas = { vendas: ["admin", "vendas"] };

export type ItemDeVenda = {
  produtoId: string;
  produtoNome: string;
  precoCentavos: number;
  quantidade: number;
};

export type VendaDoDono = {
  id: string;
  totalCentavos: number;
  descontoCentavos: number;
  formaPagamento: "pix" | "dinheiro" | "debito" | "credito" | null;
  ocorridaEm: string; // instante ISO
  estornadaEm: string | null;
  itens: ItemDeVenda[];
};

const linhaDeVenda = z.object({
  id: z.string(),
  total_centavos: z.number().int(),
  desconto_centavos: z.number().int(),
  forma_pagamento: z.enum(["pix", "dinheiro", "debito", "credito"]).nullable(),
  ocorrida_em: z.string(),
  estornada_em: z.string().nullable(),
  venda_itens: z.array(
    z.object({
      produto_id: z.string(),
      produto_nome: z.string(),
      preco_centavos: z.number().int(),
      quantidade: z.number().int(),
    }),
  ),
});

export function vendaDoDonoDeLinha(linha: unknown): VendaDoDono {
  const l = linhaDeVenda.parse(linha);
  return {
    id: l.id,
    totalCentavos: l.total_centavos,
    descontoCentavos: l.desconto_centavos,
    formaPagamento: l.forma_pagamento,
    ocorridaEm: l.ocorrida_em,
    estornadaEm: l.estornada_em,
    itens: l.venda_itens.map((i) => ({
      produtoId: i.produto_id,
      produtoNome: i.produto_nome,
      precoCentavos: i.preco_centavos,
      quantidade: i.quantidade,
    })),
  };
}

export async function lerVendas(): Promise<VendaDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("vendas")
    .select(
      "id, total_centavos, desconto_centavos, forma_pagamento, ocorrida_em, estornada_em, venda_itens(produto_id, produto_nome, preco_centavos, quantidade)",
    )
    .order("ocorrida_em", { ascending: false })
    .limit(2000);
  if (error) falhou(error);
  return (data ?? []).map(vendaDoDonoDeLinha);
}

// O preço vem do cadastro do produto, no banco: o navegador só diz o que e quantos.
export async function registrarVenda(entrada: {
  itens: { produtoId: string; quantidade: number }[];
  ocorridaEm: string;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("registrar_venda", {
    p_itens: entrada.itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade })),
    p_forma_pagamento: null,
    p_desconto_centavos: 0,
    p_ocorrida_em: entrada.ocorridaEm,
  });
  if (error) falhou(error);
}

export async function estornarVenda(id: string): Promise<void> {
  const { error } = await supabaseNavegador().rpc("estornar_venda", { p_id: id });
  if (error) falhou(error);
}
