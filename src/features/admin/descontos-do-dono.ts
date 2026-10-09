// Cupons e cartão fidelidade como o dono mexe. Criar, ligar e desligar cupom e configurar a
// fidelidade são funções do banco: é lá que moram as regras (código, valor, validade, limite).
import { z } from "zod";

import type { SituacaoDoCupom, TipoDeCupom } from "@/features/descontos/cupons";
import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export const chavesDeDescontos = { cupons: ["admin", "cupons"] };

export type CupomDoDono = {
  id: string;
  codigo: string;
  tipo: TipoDeCupom;
  valor: number; // percentual (1 a 100) ou centavos
  validoAte: string | null; // instante ISO; nulo: sem validade
  limiteUsos: number | null;
  ativo: boolean;
  usos: number;
  situacao: SituacaoDoCupom;
};

const linhaDeCupom = z.object({
  id: z.string(),
  codigo: z.string(),
  tipo: z.enum(["percentual", "valor"]),
  valor: z.number().int(),
  valido_ate: z.string().nullable(),
  limite_usos: z.number().int().nullable(),
  ativo: z.boolean(),
  usos: z.number().int(),
  situacao: z.enum(["ativo", "inativo", "vencido", "esgotado"]),
});

export function cupomDoDonoDeLinha(linha: unknown): CupomDoDono {
  const l = linhaDeCupom.parse(linha);
  return {
    id: l.id,
    codigo: l.codigo,
    tipo: l.tipo,
    valor: l.valor,
    validoAte: l.valido_ate,
    limiteUsos: l.limite_usos,
    ativo: l.ativo,
    usos: l.usos,
    situacao: l.situacao,
  };
}

export async function lerCupons(): Promise<CupomDoDono[]> {
  const { data, error } = await supabaseNavegador().rpc("listar_cupons");
  if (error) falhou(error);
  return (data ?? []).map(cupomDoDonoDeLinha);
}

export async function criarCupom(entrada: {
  codigo: string;
  tipo: TipoDeCupom;
  valor: number;
  validoAte: string | null;
  limiteUsos: number | null;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("criar_cupom", {
    p_codigo: entrada.codigo,
    p_tipo: entrada.tipo,
    p_valor: entrada.valor,
    p_valido_ate: entrada.validoAte,
    p_limite_usos: entrada.limiteUsos,
  });
  if (error) falhou(error);
}

export async function mudarCupomAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabaseNavegador().rpc("mudar_cupom_ativo", {
    p_id: id,
    p_ativo: ativo,
  });
  if (error) falhou(error);
}

export async function salvarFidelidade(entrada: {
  ativa: boolean;
  atendimentos: number;
  servicoId: string | null;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("salvar_fidelidade", {
    p_ativa: entrada.ativa,
    p_atendimentos: entrada.atendimentos,
    p_servico_id: entrada.servicoId,
  });
  if (error) falhou(error);
}
