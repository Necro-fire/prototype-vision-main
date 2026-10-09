// Cupons de desconto (regra F6). Quem decide se um cupom vale, e quanto abate, é o banco:
// aqui só se pergunta (`prever_desconto`) e se traduz o resultado para a tela.
import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export type TipoDeCupom = "percentual" | "valor";
export type SituacaoDoCupom = "ativo" | "inativo" | "vencido" | "esgotado";

export const rotuloDaSituacaoDoCupom: Record<SituacaoDoCupom, string> = {
  ativo: "Ativo",
  inativo: "Desligado",
  vencido: "Vencido",
  esgotado: "Esgotado",
};

// "10%" ou "R$ 5,00", para listas e avisos.
export function descreverDesconto(
  tipo: TipoDeCupom,
  valor: number,
  formatarDinheiro: (centavos: number) => string,
) {
  return tipo === "percentual" ? `${valor}%` : formatarDinheiro(valor);
}

// O código é guardado em maiúsculas e sem espaços; a tela aceita como a pessoa digitar.
export const normalizarCodigo = (texto: string) => texto.trim().toUpperCase();

export const codigoDeCupomValido = (texto: string) =>
  /^[A-Z0-9_-]{3,20}$/.test(normalizarCodigo(texto));

// Quanto o cupom abate de um total, sem gravar nada. Falha com o motivo (cupom_invalido,
// cupom_vencido, cupom_esgotado) já em português.
export async function preverDesconto(codigo: string, totalCentavos: number): Promise<number> {
  const { data, error } = await supabaseNavegador().rpc("prever_desconto", {
    p_codigo: normalizarCodigo(codigo),
    p_total_centavos: totalCentavos,
  });
  if (error) falhou(error);
  return Number(data);
}
