import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | undefined;

// Cliente anônimo e sem sessão, para o que qualquer visitante pode ler (serviços, produtos,
// horários). Quem protege os dados é o banco (RLS), não este cliente: a chave `anon` é pública.
export function supabasePublico() {
  if (cliente) return cliente;
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const chave = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !chave) {
    throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.");
  }
  cliente = createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cliente;
}

// Erro do Supabase vira Error comum, para o roteador e os testes tratarem do mesmo jeito.
export function falhaDoBanco(contexto: string, erro: { message: string }) {
  return new Error(`${contexto}: ${erro.message}`);
}

// Falha de leitura vira nulo e a tela avisa, em vez de derrubar o site inteiro.
export async function ouNulo<T>(leitura: Promise<T>): Promise<T | null> {
  try {
    return await leitura;
  } catch (erro) {
    console.error(erro);
    return null;
  }
}
