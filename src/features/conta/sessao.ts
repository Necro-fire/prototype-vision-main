import { createServerFn } from "@tanstack/react-start";

export type Papel = "cliente" | "dono";

export type Sessao = {
  id: string;
  email: string;
  nome: string;
  celular: string | null;
  papel: Papel;
  lembretesPorEmail: boolean;
};

// Quem está logado, conferido no servidor: o Supabase valida o token a cada chamada (getUser),
// em vez de confiar no que o navegador diz. O papel vem do banco, nunca do navegador.
export const obterSessao = createServerFn({ method: "GET" }).handler(
  async (): Promise<Sessao | null> => {
    const { supabaseDoServidor } = await import("@/lib/server/supabase");
    const banco = supabaseDoServidor();
    const { data, error } = await banco.auth.getUser();
    if (error || !data.user) return null;
    const { data: perfil } = await banco
      .from("perfis")
      .select("nome, celular, papel, lembretes_por_email")
      .eq("id", data.user.id)
      .maybeSingle();
    return {
      id: data.user.id,
      email: data.user.email ?? "",
      nome: typeof perfil?.nome === "string" ? perfil.nome : "",
      celular: typeof perfil?.celular === "string" ? perfil.celular : null,
      papel: perfil?.papel === "dono" ? "dono" : "cliente",
      lembretesPorEmail: perfil?.lembretes_por_email !== false,
    };
  },
);
