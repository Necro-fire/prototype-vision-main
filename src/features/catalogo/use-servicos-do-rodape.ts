import { getRouteApi } from "@tanstack/react-router";

const raiz = getRouteApi("__root__");

export type ServicoDoRodape = { id: string; nome: string };

// Os serviços que o rodapé lista vêm da rota raiz, como o contato: o rodapé aparece em todas as
// páginas. Lista vazia se a leitura falhou: a coluna some, sem erro na cara de quem chega.
export function useServicosDoRodape(limite = 5): ServicoDoRodape[] {
  const dados: { servicos?: ServicoDoRodape[] | null } = raiz.useLoaderData();
  return (dados.servicos ?? []).slice(0, limite);
}
