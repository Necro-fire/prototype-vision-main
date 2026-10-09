// Configurações como o dono edita: dados da barbearia, regras da agenda, funcionamento e bloqueios.
// A RLS só deixa o dono gravar; o funcionamento é trocado por uma função do banco, tudo ou nada.
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { DiaEditavel } from "./configuracoes-validacao";

export const chavesDeConfiguracoes = {
  empresa: ["admin", "empresa"],
  funcionamento: ["admin", "funcionamento"],
  bloqueios: ["admin", "bloqueios"],
};

export type EmpresaDoDono = {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  gradeMinutos: number;
  antecedenciaMaxDias: number;
  maxAgendamentosFuturos: number;
};

const linhaDeEmpresa = z.object({
  nome: z.string(),
  endereco: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  instagram: z.string().nullable(),
  grade_minutos: z.number().int(),
  antecedencia_max_dias: z.number().int(),
  max_agendamentos_futuros: z.number().int(),
});

export async function lerEmpresaDoDono(): Promise<EmpresaDoDono> {
  const { data, error } = await supabaseNavegador()
    .from("empresa")
    .select(
      "nome, endereco, telefone, whatsapp, instagram, grade_minutos, antecedencia_max_dias, max_agendamentos_futuros",
    )
    .single();
  if (error) falhou(error);
  const l = linhaDeEmpresa.parse(data);
  return {
    nome: l.nome,
    endereco: l.endereco,
    telefone: l.telefone,
    whatsapp: l.whatsapp,
    instagram: l.instagram,
    gradeMinutos: l.grade_minutos,
    antecedenciaMaxDias: l.antecedencia_max_dias,
    maxAgendamentosFuturos: l.max_agendamentos_futuros,
  };
}

export async function salvarEmpresa(dados: {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
}): Promise<void> {
  const { error } = await supabaseNavegador().from("empresa").update(dados).eq("id", 1);
  if (error) falhou(error);
}

export async function salvarRegras(dados: {
  grade_minutos: number;
  antecedencia_max_dias: number;
  max_agendamentos_futuros: number;
}): Promise<void> {
  const { error } = await supabaseNavegador().from("empresa").update(dados).eq("id", 1);
  if (error) falhou(error);
}

const linhaDeFuncionamento = z.object({
  dia_semana: z.number().int().min(0).max(6),
  abre: z.string(),
  fecha: z.string(),
});

// Os sete dias, prontos para a tela editar: "09:00:00" do Postgres vira "09:00".
export async function lerFuncionamentoEditavel(): Promise<DiaEditavel[]> {
  const { data, error } = await supabaseNavegador()
    .from("funcionamento")
    .select("dia_semana, abre, fecha")
    .order("abre");
  if (error) falhou(error);
  const dias: DiaEditavel[] = Array.from({ length: 7 }, () => ({ aberto: false, intervalos: [] }));
  for (const linha of data ?? []) {
    const l = linhaDeFuncionamento.parse(linha);
    const dia = dias[l.dia_semana];
    if (!dia) continue;
    dia.aberto = true;
    dia.intervalos.push({ abre: l.abre.slice(0, 5), fecha: l.fecha.slice(0, 5) });
  }
  return dias;
}

export async function salvarFuncionamento(
  intervalos: { dia_semana: number; abre: string; fecha: string }[],
): Promise<void> {
  const { error } = await supabaseNavegador().rpc("salvar_funcionamento", {
    p_intervalos: intervalos,
  });
  if (error) falhou(error);
}

export type BloqueioDoDono = { id: string; inicio: string; fim: string; motivo: string };

const linhaDeBloqueio = z.object({
  id: z.string(),
  inicio: z.string(),
  fim: z.string(),
  motivo: z.string(),
});

export async function lerBloqueios(): Promise<BloqueioDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("bloqueios")
    .select("id, inicio, fim, motivo")
    .order("inicio");
  if (error) falhou(error);
  return (data ?? []).map((l) => linhaDeBloqueio.parse(l));
}

export async function criarBloqueio(dados: {
  inicio: string;
  fim: string;
  motivo: string;
}): Promise<void> {
  const { error } = await supabaseNavegador().from("bloqueios").insert(dados);
  if (error) falhou(error);
}

export async function removerBloqueio(id: string): Promise<void> {
  const { error } = await supabaseNavegador().from("bloqueios").delete().eq("id", id);
  if (error) falhou(error);
}
