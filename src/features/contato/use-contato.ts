import { getRouteApi } from "@tanstack/react-router";

import type { Contato } from "@/features/contato/banco";

const raiz = getRouteApi("__root__");

// Os dados de contato vêm da rota raiz, como o funcionamento: o rodapé aparece em todas as páginas.
// É nulo se a leitura falhou; quem não tiver dado nenhum não mostra o bloco.
export function useContato(): Contato | null {
  return raiz.useLoaderData().contato;
}
