import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { FluxoDeAgendamento } from "@/features/agenda/fluxo-de-agendamento";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/agendamento")({
  component: Appointment,
  // O roteador entrega "1" como número quando o endereço é digitado à mão (?service=1).
  validateSearch: (search: Record<string, unknown>) => {
    const service = search["service"];
    return {
      service:
        typeof service === "string" || typeof service === "number" ? String(service) : undefined,
    };
  },
  head: () => ({
    meta: metasDaPagina(
      "Agendar horário",
      "Escolha o serviço, o dia e o horário. Pagamento na barbearia, sem cobrança antecipada.",
    ),
  }),
});

function Appointment() {
  const { service } = Route.useSearch();
  return (
    <ShopLayout>
      <FluxoDeAgendamento servicoInicial={service} />
    </ShopLayout>
  );
}
