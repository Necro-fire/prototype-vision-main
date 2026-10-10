import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { lerAvaliacoesPublicas } from "@/features/avaliacoes/banco";
import { lerCatalogo } from "@/features/catalogo/banco";
import { FaixaDeDiferenciais } from "@/features/inicio/faixa-de-diferenciais";
import { Hero } from "@/features/inicio/hero";
import { PainelDeAgendamento } from "@/features/inicio/painel-de-agendamento";
import { metasDaPagina } from "@/lib/marca";
import { ouNulo } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    const [catalogo, avaliacoes] = await Promise.all([
      ouNulo(lerCatalogo()),
      ouNulo(lerAvaliacoesPublicas()),
    ]);
    return { catalogo, avaliacoes };
  },
  head: () => ({
    meta: metasDaPagina(
      "Barbearia de bairro",
      "Corte, barba e sobrancelha com horário marcado. Veja os preços, escolha um horário livre e pague na barbearia.",
    ),
  }),
});

// A página inicial, em quatro blocos: abertura com a foto, o painel de agendamento (serviço, dia
// e horário, resumo), a faixa azul de fatos e o rodapé do site. Todo preço, horário e nota vêm
// do banco.
function Index() {
  const { catalogo, avaliacoes } = Route.useLoaderData();
  return (
    <ShopLayout>
      <Hero avaliacoes={avaliacoes} />
      <PainelDeAgendamento catalogo={catalogo} />
      <FaixaDeDiferenciais />
    </ShopLayout>
  );
}
