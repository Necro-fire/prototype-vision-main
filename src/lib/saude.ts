// Verificação de saúde para o monitor de disponibilidade (UptimeRobot, Cloudflare...): responde
// 200 se o site está de pé e consegue falar com o banco, e 503 se não. Não revela nada do erro.
import { supabasePublico } from "@/lib/supabase";

export type Consulta = () => Promise<{ error: unknown }>;

// Lê a linha única de `empresa`: é pública e barata, e prova que o banco responde.
const lerEmpresa: Consulta = async () =>
  supabasePublico().from("empresa").select("id").limit(1).single();

export async function verificarSaude(
  consultar: Consulta = lerEmpresa,
  limiteMs = 5000,
): Promise<Response> {
  const cabecalhos = { "content-type": "application/json", "cache-control": "no-store" };
  try {
    const limite = new Promise<never>((_, rejeitar) =>
      setTimeout(() => rejeitar(new Error("demorou demais")), limiteMs),
    );
    const { error } = await Promise.race([consultar(), limite]);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cabecalhos });
  } catch (erro) {
    console.error("Verificação de saúde falhou:", erro);
    return new Response(JSON.stringify({ ok: false }), { status: 503, headers: cabecalhos });
  }
}
