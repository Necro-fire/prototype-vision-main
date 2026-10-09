import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { FluxoDeAgendamento } from "@/features/agenda/fluxo-de-agendamento";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { lerCatalogo } from "@/features/catalogo/banco";
import { obterSessao } from "@/features/conta/sessao";
import { metasDaPagina } from "@/lib/marca";
import { ouNulo } from "@/lib/supabase";

export const Route = createFileRoute("/agendamento")({
  component: Appointment,
  // O roteador entrega "1" como número quando o endereço é digitado à mão (?service=1).
  // `inicio` é o horário já escolhido, que volta junto depois do login.
  validateSearch: (search: Record<string, unknown>) => {
    const service = search["service"];
    const inicio = search["inicio"];
    return {
      service:
        typeof service === "string" || typeof service === "number" ? String(service) : undefined,
      ...(typeof inicio === "string" ? { inicio } : {}),
    };
  },
  // Visitante pode escolher serviço e horário; para confirmar, precisa entrar. A sessão é
  // conferida no servidor, mas aqui não obriga: quem não entrou vê o convite para entrar.
  loader: async () => ({
    catalogo: await ouNulo(lerCatalogo()),
    sessao: await obterSessao(),
  }),
  head: () => ({
    meta: metasDaPagina(
      "Agendar horário",
      "Escolha o serviço, o dia e o horário. Pagamento na barbearia, sem cobrança antecipada.",
    ),
  }),
});

function Appointment() {
  const { service, inicio } = Route.useSearch();
  const { catalogo, sessao } = Route.useLoaderData();
  const expediente = useExpediente();
  return (
    <ShopLayout>
      <FluxoDeAgendamento
        catalogo={catalogo}
        sessao={sessao}
        expediente={expediente}
        servicoInicial={service}
        inicioInicial={inicio}
      />
    </ShopLayout>
  );
}
