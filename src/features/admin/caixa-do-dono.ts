// Caixa como o dono vê. Abrir, fechar e registrar atendimento avulso são funções do banco: é
// lá que se calcula o que deveria haver na gaveta e se guarda a diferença (regra F5).
import { z } from "zod";

import {
  valoresDeFormaDePagamento,
  type FormaPagamento,
} from "@/features/financeiro/formas-de-pagamento";
import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export const chavesDoCaixa = {
  todos: ["admin", "caixa"],
  resumo: (id: string) => ["admin", "caixa", "resumo", id],
};

export type ResumoDaForma = {
  entradasCentavos: number;
  estornosCentavos: number;
  quantidade: number;
};
export type PorForma = Record<FormaPagamento, ResumoDaForma>;

export type Caixa = {
  id: string;
  abertoEm: string;
  valorInicialCentavos: number;
  fechadoEm: string | null;
  valorContadoCentavos: number | null;
  esperadoCentavos: number | null;
  diferencaCentavos: number | null;
  observacao: string;
  porForma: PorForma | null; // só nos caixas fechados: o resumo daquele momento
};

const resumoDaForma = z.object({
  entradas_centavos: z.number().int(),
  estornos_centavos: z.number().int(),
  quantidade: z.number().int(),
});
const porFormaDoBanco = z.record(z.enum(valoresDeFormaDePagamento), resumoDaForma);

function porFormaDeBanco(bruto: unknown): PorForma {
  const lido = porFormaDoBanco.parse(bruto);
  const vazio = { entradasCentavos: 0, estornosCentavos: 0, quantidade: 0 };
  const resultado = Object.fromEntries(
    valoresDeFormaDePagamento.map((f) => [f, vazio]),
  ) as PorForma;
  for (const forma of valoresDeFormaDePagamento) {
    const r = lido[forma];
    if (r) {
      resultado[forma] = {
        entradasCentavos: r.entradas_centavos,
        estornosCentavos: r.estornos_centavos,
        quantidade: r.quantidade,
      };
    }
  }
  return resultado;
}

const linhaDeCaixa = z.object({
  id: z.string(),
  aberto_em: z.string(),
  valor_inicial_centavos: z.number().int(),
  fechado_em: z.string().nullable(),
  valor_contado_centavos: z.number().int().nullable(),
  esperado_centavos: z.number().int().nullable(),
  diferenca_centavos: z.number().int().nullable(),
  observacao: z.string(),
  resumo: z.unknown(),
});

export function caixaDeLinha(linha: unknown): Caixa {
  const l = linhaDeCaixa.parse(linha);
  return {
    id: l.id,
    abertoEm: l.aberto_em,
    valorInicialCentavos: l.valor_inicial_centavos,
    fechadoEm: l.fechado_em,
    valorContadoCentavos: l.valor_contado_centavos,
    esperadoCentavos: l.esperado_centavos,
    diferencaCentavos: l.diferenca_centavos,
    observacao: l.observacao,
    porForma: l.resumo ? porFormaDeBanco(l.resumo) : null,
  };
}

export async function lerCaixas(): Promise<Caixa[]> {
  const { data, error } = await supabaseNavegador()
    .from("caixas")
    .select(
      "id, aberto_em, valor_inicial_centavos, fechado_em, valor_contado_centavos, esperado_centavos, diferenca_centavos, observacao, resumo",
    )
    .order("aberto_em", { ascending: false })
    .limit(60);
  if (error) falhou(error);
  return (data ?? []).map(caixaDeLinha);
}

export type ResumoDoCaixa = { porForma: PorForma; esperadoCentavos: number };

const resumoDoBanco = z.object({
  por_forma: z.unknown(),
  esperado_centavos: z.number().int(),
});

// O resumo do caixa aberto, calculado pelo banco no momento da consulta.
export async function lerResumoDoCaixa(id: string): Promise<ResumoDoCaixa> {
  const { data, error } = await supabaseNavegador().rpc("resumo_do_caixa", { p_id: id });
  if (error) falhou(error);
  const r = resumoDoBanco.parse(data);
  return { porForma: porFormaDeBanco(r.por_forma), esperadoCentavos: r.esperado_centavos };
}

export async function abrirCaixa(valorInicialCentavos: number): Promise<void> {
  const { error } = await supabaseNavegador().rpc("abrir_caixa", {
    p_valor_inicial_centavos: valorInicialCentavos,
  });
  if (error) falhou(error);
}

export async function fecharCaixa(entrada: {
  valorContadoCentavos: number;
  observacao: string;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("fechar_caixa", {
    p_valor_contado_centavos: entrada.valorContadoCentavos,
    p_observacao: entrada.observacao,
  });
  if (error) falhou(error);
}

// Cliente sem hora marcada: o serviço já foi feito, e o preço vem do cadastro, no banco.
export async function registrarAtendimentoAvulso(entrada: {
  servicoId: string;
  formaPagamento: FormaPagamento;
  clienteNome: string;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("registrar_atendimento_avulso", {
    p_servico_id: entrada.servicoId,
    p_forma_pagamento: entrada.formaPagamento,
    p_cliente_nome: entrada.clienteNome,
  });
  if (error) falhou(error);
}
