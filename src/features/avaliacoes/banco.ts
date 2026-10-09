// Avaliações de clientes. O site público lê só pelas funções do banco (primeiro nome e inicial,
// sem identificar a conta); o cliente avalia o próprio atendimento; o dono modera.
import { z } from "zod";

import { falhou } from "@/lib/erro-do-banco";
import { falhaDoBanco, supabasePublico } from "@/lib/supabase";
import { supabaseNavegador } from "@/lib/supabase-navegador";

export const chavesDeAvaliacoes = {
  minhas: ["avaliacoes", "minhas"],
  doDono: ["admin", "avaliacoes"],
};

export type AvaliacaoPublica = {
  nota: number;
  comentario: string;
  autor: string;
  criadaEm: string;
};
export type ResumoDeAvaliacoes = { media: number | null; total: number };
export type AvaliacoesPublicas = { resumo: ResumoDeAvaliacoes; avaliacoes: AvaliacaoPublica[] };

const linhaPublica = z.object({
  nota: z.number().int(),
  comentario: z.string(),
  autor_nome: z.string(),
  criada_em: z.string(),
});
const linhaDoResumo = z.object({
  media: z.union([z.number(), z.string()]).nullable(),
  total: z.number().int(),
});

export async function lerAvaliacoesPublicas(): Promise<AvaliacoesPublicas> {
  const banco = supabasePublico();
  const [lista, resumo] = await Promise.all([
    banco.rpc("avaliacoes_publicas", { p_limite: 50 }),
    banco.rpc("resumo_das_avaliacoes"),
  ]);
  if (lista.error) throw falhaDoBanco("Não foi possível ler as avaliações", lista.error);
  if (resumo.error)
    throw falhaDoBanco("Não foi possível ler o resumo das avaliações", resumo.error);
  const r = linhaDoResumo.parse((resumo.data ?? [])[0] ?? { media: null, total: 0 });
  return {
    resumo: { media: r.media === null ? null : Number(r.media), total: r.total },
    avaliacoes: (lista.data ?? []).map((linha: unknown) => {
      const l = linhaPublica.parse(linha);
      return { nota: l.nota, comentario: l.comentario, autor: l.autor_nome, criadaEm: l.criada_em };
    }),
  };
}

// As notas que o cliente logado já deu: id do atendimento -> nota.
export async function lerMinhasAvaliacoes(): Promise<Record<string, number>> {
  const { data, error } = await supabaseNavegador()
    .from("avaliacoes")
    .select("agendamento_id, nota");
  if (error) falhou(error);
  const mapa: Record<string, number> = {};
  for (const linha of data ?? []) {
    const l = z.object({ agendamento_id: z.string(), nota: z.number().int() }).parse(linha);
    mapa[l.agendamento_id] = l.nota;
  }
  return mapa;
}

export async function avaliar(entrada: {
  agendamentoId: string;
  nota: number;
  comentario: string;
}): Promise<void> {
  const { error } = await supabaseNavegador().rpc("avaliar", {
    p_agendamento_id: entrada.agendamentoId,
    p_nota: entrada.nota,
    p_comentario: entrada.comentario,
  });
  if (error) falhou(error);
}

export type AvaliacaoDoDono = {
  id: string;
  nota: number;
  comentario: string;
  autor: string; // como aparece no site
  clienteNome: string | null; // nome completo, só o dono vê
  servico: string | null;
  publicada: boolean;
  criadaEm: string;
};

const linhaDoDono = z.object({
  id: z.string(),
  nota: z.number().int(),
  comentario: z.string(),
  autor_nome: z.string(),
  publicada: z.boolean(),
  criada_em: z.string(),
  perfis: z.object({ nome: z.string() }).nullable(),
  agendamentos: z.object({ servico_nome: z.string() }).nullable(),
});

export async function lerAvaliacoesDoDono(): Promise<AvaliacaoDoDono[]> {
  const { data, error } = await supabaseNavegador()
    .from("avaliacoes")
    .select(
      "id, nota, comentario, autor_nome, publicada, criada_em, perfis(nome), agendamentos(servico_nome)",
    )
    .order("criada_em", { ascending: false })
    .limit(500);
  if (error) falhou(error);
  return (data ?? []).map((linha) => {
    const l = linhaDoDono.parse(linha);
    return {
      id: l.id,
      nota: l.nota,
      comentario: l.comentario,
      autor: l.autor_nome,
      clienteNome: l.perfis?.nome ?? null,
      servico: l.agendamentos?.servico_nome ?? null,
      publicada: l.publicada,
      criadaEm: l.criada_em,
    };
  });
}

export async function moderarAvaliacao(id: string, publicada: boolean): Promise<void> {
  const { error } = await supabaseNavegador().rpc("moderar_avaliacao", {
    p_id: id,
    p_publicada: publicada,
  });
  if (error) falhou(error);
}
