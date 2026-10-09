import { useEffect, useState } from "react";

// Só para telas que existem apenas no navegador (o painel depois do login).
// No servidor devolve o valor inicial; a página pública não deve depender disto.
export function useMediaQuery(consulta: string, inicial = false) {
  const [corresponde, setCorresponde] = useState(() =>
    typeof window === "undefined" ? inicial : window.matchMedia(consulta).matches,
  );
  useEffect(() => {
    const lista = window.matchMedia(consulta);
    const atualizar = () => setCorresponde(lista.matches);
    atualizar();
    lista.addEventListener("change", atualizar);
    return () => lista.removeEventListener("change", atualizar);
  }, [consulta]);
  return corresponde;
}

export const useTelaGrande = () => useMediaQuery("(min-width: 768px)");
