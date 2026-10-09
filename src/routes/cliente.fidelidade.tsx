import { createFileRoute } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { useExpediente } from "@/features/agenda/use-funcionamento";
import { CartaoDoCliente } from "@/features/fidelidade/cartao-do-cliente";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/cliente/fidelidade")({
  component: Fidelidade,
  head: () => ({
    meta: metasDaPagina(
      "Cartão fidelidade",
      "Veja seus pontos e quanto falta para ganhar um serviço grátis.",
    ),
  }),
});

function Fidelidade() {
  const expediente = useExpediente();
  return (
    <ShopLayout>
      <CartaoDoCliente fuso={expediente?.fuso ?? "America/Sao_Paulo"} />
    </ShopLayout>
  );
}
