import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { PerfilDoCliente } from "@/features/conta/perfil";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/cliente/perfil")({
  component: Perfil,
  head: () => ({
    meta: metasDaPagina("Meu perfil", "Seus dados, lembretes por e-mail e exclusão da conta."),
  }),
});

function Perfil() {
  const { sessao } = Route.useRouteContext();
  return (
    <ShopLayout>
      <PerfilDoCliente sessao={sessao} />
    </ShopLayout>
  );
}
