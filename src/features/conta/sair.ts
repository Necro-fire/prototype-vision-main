import { useRouter } from "@tanstack/react-router";

import { supabaseNavegador } from "@/lib/supabase-navegador";

// Encerra a sessão (apaga os cookies) e volta ao início.
export function useSair() {
  const router = useRouter();
  return async () => {
    await supabaseNavegador().auth.signOut();
    router.history.push("/");
  };
}
