// Catálogo como o dono enxerga: tudo, inclusive o que está desativado. Quem pode gravar é o dono
// (RLS); serviço e produto com histórico não se apagam, só se desativam (regra C3).
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { supabaseNavegador } from "@/lib/supabase-navegador";
import type { ProdutoParaSalvar, ServicoParaSalvar } from "./catalogo-validacao";

export const chavesDoCatalogo = {
  servicos: ["admin", "servicos"],
  produtos: ["admin", "produtos"],
  categorias: ["admin", "categorias"],
};

export type CategoriaDoDono = { id: string; nome: string };

export type ServicoDoDono = {
  id: string;
  nome: string;
  categoriaId: string | null;
  categoria: string | null;
  descricao: string;
  precoCentavos: number;
  duracaoMinutos: number;
  ativo: boolean;
  destaque: boolean;
  ordem: number;
};

export type ProdutoDoDono = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  ativo: boolean;
  ordem: number;
};

const linhaDeServico = z.object({
  id: z.string(),
  nome: z.string(),
  categoria_id: z.string().nullable(),
  descricao: z.string(),
  preco_centavos: z.number().int(),
  duracao_minutos: z.number().int(),
  ativo: z.boolean(),
  destaque: z.boolean(),
  ordem: z.number().int(),
  categorias: z.object({ nome: z.string() }).nullable(),
});

const linhaDeProduto = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  preco_centavos: z.number().int(),
  ativo: z.boolean(),
  ordem: z.number().int(),
});

export const servicoDoDonoDeLinha = (linha: unknown): ServicoDoDono => {
  const l = linhaDeServico.parse(linha);
  return {
    id: l.id,
    nome: l.nome,
    categoriaId: l.categoria_id,
    categoria: l.categorias?.nome ?? null,
    descricao: l.descricao,
    precoCentavos: l.preco_centavos,
    duracaoMinutos: l.duracao_minutos,
    ativo: l.ativo,
    destaque: l.destaque,
    ordem: l.ordem,
  };
};

export const produtoDoDonoDeLinha = (linha: unknown): ProdutoDoDono => {
  const l = linhaDeProduto.parse(linha);
  return {
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    precoCentavos: l.preco_centavos,
    ativo: l.ativo,
    ordem: l.ordem,
  };
};

export async function lerServicosDoDono(): Promise<ServicoDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("servicos")
    .select(
      "id, nome, categoria_id, descricao, preco_centavos, duracao_minutos, ativo, destaque, ordem, categorias(nome)",
    )
    .order("ordem")
    .order("nome");
  if (error) falhou(error);
  return (data ?? []).map(servicoDoDonoDeLinha);
}

export async function lerProdutosDoDono(): Promise<ProdutoDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("produtos")
    .select("id, nome, descricao, preco_centavos, ativo, ordem")
    .order("ordem")
    .order("nome");
  if (error) falhou(error);
  return (data ?? []).map(produtoDoDonoDeLinha);
}

export async function lerCategoriasDoDono(): Promise<CategoriaDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("categorias")
    .select("id, nome")
    .order("ordem")
    .order("nome");
  if (error) falhou(error);
  return (data ?? []).map((l) => z.object({ id: z.string(), nome: z.string() }).parse(l));
}

async function criarCategoria(nome: string): Promise<string> {
  const { data, error } = await supabaseNavegador()
    .from("categorias")
    .insert({ nome })
    .select("id")
    .single();
  if (error) falhou(error);
  return z.object({ id: z.string() }).parse(data).id;
}

// Cria (sem id) ou atualiza (com id). Categoria nova é criada antes e usada no serviço.
export async function salvarServico(id: string | null, dados: ServicoParaSalvar): Promise<void> {
  const categoriaId = dados.novaCategoria
    ? await criarCategoria(dados.novaCategoria)
    : dados.categoriaId;
  const linha = {
    nome: dados.nome,
    categoria_id: categoriaId,
    descricao: dados.descricao,
    preco_centavos: dados.precoCentavos,
    duracao_minutos: dados.duracaoMinutos,
    destaque: dados.destaque,
    ordem: dados.ordem,
  };
  const banco = supabaseNavegador().from("servicos");
  const { error } = id ? await banco.update(linha).eq("id", id) : await banco.insert(linha);
  if (error) falhou(error);
}

export async function salvarProduto(id: string | null, dados: ProdutoParaSalvar): Promise<void> {
  const linha = {
    nome: dados.nome,
    descricao: dados.descricao,
    preco_centavos: dados.precoCentavos,
    ordem: dados.ordem,
  };
  const banco = supabaseNavegador().from("produtos");
  const { error } = id ? await banco.update(linha).eq("id", id) : await banco.insert(linha);
  if (error) falhou(error);
}

export async function mudarAtivo(
  tabela: "servicos" | "produtos",
  id: string,
  ativo: boolean,
): Promise<void> {
  const { error } = await supabaseNavegador().from(tabela).update({ ativo }).eq("id", id);
  if (error) falhou(error);
}

export async function mudarDestaque(id: string, destaque: boolean): Promise<void> {
  const { error } = await supabaseNavegador().from("servicos").update({ destaque }).eq("id", id);
  if (error) falhou(error);
}
