import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { lerAvaliacoesPublicas } from "@/features/avaliacoes/banco";
import { PaginaDeAvaliacoes } from "@/features/avaliacoes/pagina-de-avaliacoes";
import { metasDaPagina } from "@/lib/marca";
import { ouNulo } from "@/lib/supabase";

export const Route = createFileRoute("/avaliacoes")({
  component: Avaliacoes,
  loader: async () => ({ dados: await ouNulo(lerAvaliacoesPublicas()) }),
  head: () => ({
    meta: metasDaPagina(
      "Avaliações",
      "O que os clientes da ON-STYLE disseram depois do atendimento.",
    ),
  }),
});

function Avaliacoes() {
  const { dados } = Route.useLoaderData();
  const expediente = useExpediente();
  return (
    <ShopLayout>
      <PaginaDeAvaliacoes dados={dados} fuso={expediente?.fuso ?? "America/Sao_Paulo"} />
    </ShopLayout>
  );
}
