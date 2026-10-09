import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { MeusHorarios } from "@/features/agenda/meus-horarios";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/cliente/")({
  component: Cliente,
  head: () => ({
    meta: metasDaPagina("Meus horários", "Veja, remarque, cancele ou repita os seus agendamentos."),
  }),
});

function Cliente() {
  const { sessao } = Route.useRouteContext();
  const expediente = useExpediente();
  return (
    <ShopLayout>
      <MeusHorarios sessao={sessao} expediente={expediente} />
    </ShopLayout>
  );
}
