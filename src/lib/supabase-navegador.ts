import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cliente com a sessão da pessoa, guardada em cookie para o servidor poder conferir também.
// Só existe no navegador. O que é público (serviços, horários) usa `supabasePublico`.
export function supabaseNavegador(): SupabaseClient {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const chave = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !chave) {
    throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.");
  }
  return createBrowserClient(url, chave);
}
