import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { MeusHorarios } from "@/features/agenda/meus-horarios";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/cliente")({
  component: Customer,
  head: () => ({
    meta: metasDaPagina("Meus horários", "Veja, cancele ou repita os seus agendamentos."),
  }),
});

function Customer() {
  return (
    <ShopLayout>
      <MeusHorarios />
    </ShopLayout>
  );
}
