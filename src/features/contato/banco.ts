// Dados de contato da barbearia, como o visitante os lê (a RLS libera a linha única de `empresa`).
import { z } from "zod";

import { falhaDoBanco, supabasePublico } from "@/lib/supabase";

export type Contato = {
  nome: string;
  endereco: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
};

const linhaDeContato = z.object({
  nome: z.string(),
  endereco: z.string().nullable(),
  telefone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  instagram: z.string().nullable(),
});

export async function lerContato(): Promise<Contato> {
  const { data, error } = await supabasePublico()
    .from("empresa")
    .select("nome, endereco, telefone, whatsapp, instagram")
    .single();
  if (error) throw falhaDoBanco("Não foi possível ler os dados de contato", error);
  return linhaDeContato.parse(data);
}
