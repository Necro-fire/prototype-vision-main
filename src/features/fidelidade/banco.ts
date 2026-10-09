// Cartão fidelidade como o app lê: a regra mora na linha única da barbearia (pública), o saldo
// vem de uma função do banco (cada cliente vê o seu; o dono vê o de qualquer um).
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export const chavesDeFidelidade = {
  regra: ["fidelidade", "regra"],
  saldo: (clienteId: string | null) => ["fidelidade", "saldo", clienteId],
  movimentos: ["fidelidade", "movimentos"],
};

export type RegraDeFidelidade = {
  ativa: boolean;
  atendimentos: number; // N: pontos para ganhar o serviço grátis
  servicoId: string | null;
  servicoNome: string | null;
};

const linhaDaRegra = z.object({
  fidelidade_ativa: z.boolean(),
  fidelidade_atendimentos: z.number().int(),
  fidelidade_servico_id: z.string().nullable(),
  servicos: z.object({ nome: z.string() }).nullable(),
});

export async function lerRegraDeFidelidade(): Promise<RegraDeFidelidade | null> {
  const { data, error } = await supabaseNavegador()
    .from("empresa")
    .select("fidelidade_ativa, fidelidade_atendimentos, fidelidade_servico_id, servicos(nome)")
    .limit(1);
  if (error) falhou(error);
  const linha = data?.[0];
  if (!linha) return null;
  const l = linhaDaRegra.parse(linha);
  return {
    ativa: l.fidelidade_ativa,
    atendimentos: l.fidelidade_atendimentos,
    servicoId: l.fidelidade_servico_id,
    servicoNome: l.servicos?.nome ?? null,
  };
}

export function useRegraDeFidelidade() {
  return useQuery({ queryKey: chavesDeFidelidade.regra, queryFn: lerRegraDeFidelidade });
}

// Sem `clienteId`, o saldo de quem está logado.
export async function lerSaldoDeFidelidade(clienteId?: string): Promise<number> {
  const { data, error } = await supabaseNavegador().rpc("saldo_de_fidelidade", {
    ...(clienteId ? { p_cliente_id: clienteId } : {}),
  });
  if (error) falhou(error);
  return Number(data ?? 0);
}

export type MovimentoDeFidelidade = {
  pontos: number;
  motivo: "atendimento" | "resgate";
  criadoEm: string;
};

const linhaDeMovimento = z.object({
  pontos: z.number().int(),
  motivo: z.enum(["atendimento", "resgate"]),
  criado_em: z.string(),
});

export async function lerMeusMovimentos(): Promise<MovimentoDeFidelidade[]> {
  const { data, error } = await supabaseNavegador()
    .from("fidelidade_movimentos")
    .select("pontos, motivo, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);
  if (error) falhou(error);
  return (data ?? []).map((linha) => {
    const m = linhaDeMovimento.parse(linha);
    return { pontos: m.pontos, motivo: m.motivo, criadoEm: m.criado_em };
  });
}
