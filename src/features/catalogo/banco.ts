// Leitura pública do catálogo no banco. Substitui, no site, os dados de demonstração.
// Dinheiro em centavos inteiros, como no banco; quem mostra converte (lib/dinheiro).
import { z } from "zod";

import { falhaDoBanco, supabasePublico } from "@/lib/supabase";

export type Servico = {
  id: string;
  nome: string;
  categoria: string | null;
  descricao: string;
  precoCentavos: number;
  duracaoMinutos: number;
  destaque: boolean;
  fotoUrl: string | null;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  precoCentavos: number;
  fotoUrl: string | null;
};

export type Catalogo = { categorias: string[]; servicos: Servico[] };

const linhaDeServico = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  preco_centavos: z.number().int(),
  duracao_minutos: z.number().int(),
  destaque: z.boolean(),
  foto_url: z.string().nullish(),
  categorias: z.object({ nome: z.string() }).nullable(),
});

const linhaDeProduto = z.object({
  id: z.string(),
  nome: z.string(),
  descricao: z.string(),
  preco_centavos: z.number().int(),
  foto_url: z.string().nullish(),
});

export function servicoDeLinha(linha: unknown): Servico {
  const l = linhaDeServico.parse(linha);
  return {
    id: l.id,
    nome: l.nome,
    categoria: l.categorias?.nome ?? null,
    descricao: l.descricao,
    precoCentavos: l.preco_centavos,
    duracaoMinutos: l.duracao_minutos,
    destaque: l.destaque,
    fotoUrl: l.foto_url ?? null,
  };
}

export function produtoDeLinha(linha: unknown): Produto {
  const l = linhaDeProduto.parse(linha);
  return {
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    precoCentavos: l.preco_centavos,
    fotoUrl: l.foto_url ?? null,
  };
}

// As categorias que aparecem como filtro: só as que têm serviço ativo, na ordem do banco.
export function categoriasComServico(todas: string[], servicos: Servico[]) {
  return todas.filter((nome) => servicos.some((s) => s.categoria === nome));
}

export async function lerServicos(): Promise<Servico[]> {
  const { data, error } = await supabasePublico()
    .from("servicos")
    .select(
      "id, nome, descricao, preco_centavos, duracao_minutos, destaque, foto_url, categorias(nome)",
    )
    .eq("ativo", true)
    .order("ordem");
  if (error) throw falhaDoBanco("Não foi possível ler os serviços", error);
  return (data ?? []).map(servicoDeLinha);
}

export async function lerCategorias(): Promise<string[]> {
  const { data, error } = await supabasePublico().from("categorias").select("nome").order("ordem");
  if (error) throw falhaDoBanco("Não foi possível ler as categorias", error);
  return (data ?? []).map((linha) => z.object({ nome: z.string() }).parse(linha).nome);
}

export async function lerCatalogo(): Promise<Catalogo> {
  const [categorias, servicos] = await Promise.all([lerCategorias(), lerServicos()]);
  return { categorias: categoriasComServico(categorias, servicos), servicos };
}

export async function lerProdutos(): Promise<Produto[]> {
  const { data, error } = await supabasePublico()
    .from("produtos")
    .select("id, nome, descricao, preco_centavos, foto_url")
    .eq("ativo", true)
    .order("ordem");
  if (error) throw falhaDoBanco("Não foi possível ler os produtos", error);
  return (data ?? []).map(produtoDeLinha);
}
