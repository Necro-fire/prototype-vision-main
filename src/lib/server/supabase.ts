// Só roda no servidor (a pasta `server/` é barrada do navegador pelo Vite).
import { createServerClient } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

// Cliente com a sessão que veio nos cookies da requisição. Se a sessão foi renovada, os cookies
// novos voltam na resposta.
export function supabaseDoServidor() {
  const url = import.meta.env["VITE_SUPABASE_URL"];
  const chave = import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!url || !chave) {
    throw new Error("Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente do servidor.");
  }
  return createServerClient(url, chave, {
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) setCookie(name, value, options);
      },
    },
  });
}
