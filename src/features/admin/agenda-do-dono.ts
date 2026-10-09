// Agenda como o dono enxerga: todos os agendamentos, com o cliente, e as mudanças de situação.
// A RLS entrega tudo ao dono e só os próprios a cada cliente; mudar situação é função do banco.
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  agendamentoDeLinha,
  type Agendamento,
  type Situacao,
} from "@/features/agenda/agendamentos";
import {
  valoresDeFormaDePagamento,
  type FormaPagamento,
} from "@/features/financeiro/formas-de-pagamento";
import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { AgendamentoDoDono } from "./hoje";

export const chavesDoDono = {
  agendamentos: ["admin", "agendamentos"],
  clientes: ["admin", "clientes"],
  eventos: (id: string) => ["admin", "eventos", id],
};

const clienteDoAgendamento = z.object({
  cliente_id: z.string().nullable(),
  cliente_nome: z.string(),
  cliente_celular: z.string(),
  forma_pagamento: z.enum(valoresDeFormaDePagamento).nullish(),
  avulso: z.boolean().nullish(),
});

export function agendamentoDoDonoDeLinha(linha: unknown): AgendamentoDoDono {
  const cliente = clienteDoAgendamento.parse(linha);
  return {
    ...agendamentoDeLinha(linha),
    clienteId: cliente.cliente_id,
    clienteNome: cliente.cliente_nome,
    clienteCelular: cliente.cliente_celular,
    formaPagamento: cliente.forma_pagamento ?? null,
    avulso: cliente.avulso ?? false,
  };
}

const COLUNAS =
  "id, servico_id, servico_nome, preco_centavos, desconto_centavos, duracao_minutos, inicio, fim, situacao, observacao, cliente_id, cliente_nome, cliente_celular, forma_pagamento, avulso";

export async function lerAgendamentosDoDono(): Promise<AgendamentoDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("agendamentos")
    .select(COLUNAS)
    .order("inicio", { ascending: false })
    .limit(2000);
  if (error) falhou(error);
  return (data ?? []).map(agendamentoDoDonoDeLinha);
}

// Concluir pede a forma de pagamento (se houver valor a cobrar) e aceita um cupom ou o serviço
// grátis da fidelidade; as outras mudanças não levam nada.
export type OpcoesDeConclusao = {
  formaPagamento?: FormaPagamento;
  cupom?: string;
  resgatarFidelidade?: boolean;
};

export async function mudarSituacao(
  id: string,
  para: Situacao,
  opcoes: OpcoesDeConclusao = {},
): Promise<Agendamento> {
  const { data, error } = await supabaseNavegador().rpc("mudar_situacao", {
    p_id: id,
    p_para: para,
    ...(opcoes.formaPagamento ? { p_forma_pagamento: opcoes.formaPagamento } : {}),
    ...(opcoes.cupom ? { p_cupom: opcoes.cupom } : {}),
    ...(opcoes.resgatarFidelidade ? { p_resgatar_fidelidade: true } : {}),
  });
  if (error) falhou(error);
  return agendamentoDeLinha(data);
}

// Os dados mudam por fora (cliente agenda, cancela); o painel se atualiza sozinho.
export function useAgendamentosDoDono() {
  return useQuery({
    queryKey: chavesDoDono.agendamentos,
    queryFn: lerAgendamentosDoDono,
    refetchInterval: 30_000,
  });
}

export type EventoDeSituacao = {
  de: Situacao | null;
  para: Situacao;
  por: string | null;
  em: string;
};

const situacao = z.enum([
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "nao_compareceu",
]);
const linhaDeEvento = z.object({
  de: situacao.nullable(),
  para: situacao,
  em: z.string(),
  perfis: z.object({ nome: z.string() }).nullable(),
});

export async function lerEventos(agendamentoId: string): Promise<EventoDeSituacao[]> {
  const { data, error } = await supabaseNavegador()
    .from("agendamento_eventos")
    .select("de, para, em, perfis(nome)")
    .eq("agendamento_id", agendamentoId)
    .order("em", { ascending: true });
  if (error) falhou(error);
  return (data ?? []).map((linha) => {
    const e = linhaDeEvento.parse(linha);
    return { de: e.de, para: e.para, em: e.em, por: e.perfis?.nome ?? null };
  });
}

export type ClienteDoDono = { id: string; nome: string; celular: string; desde: string };

const linhaDeCliente = z.object({
  id: z.string(),
  nome: z.string(),
  celular: z.string().nullable(),
  criado_em: z.string(),
});

export async function lerClientes(): Promise<ClienteDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("perfis")
    .select("id, nome, celular, criado_em")
    .eq("papel", "cliente")
    .order("nome");
  if (error) falhou(error);
  return (data ?? []).map((linha) => {
    const c = linhaDeCliente.parse(linha);
    return { id: c.id, nome: c.nome, celular: c.celular ?? "", desde: c.criado_em };
  });
}
