import { createFileRoute, redirect } from "@tanstack/react-router";

import { ShopLayout } from "@/components/shop-layout";
import { MeusHorarios } from "@/features/agenda/meus-horarios";
import { obterSessao } from "@/features/conta/sessao";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/cliente")({
  component: Customer,
  // O servidor confere a sessão antes de abrir a página. Quem não entrou vai para o login e volta.
  beforeLoad: async ({ location }) => {
    const sessao = await obterSessao();
    if (!sessao) throw redirect({ to: "/entrar", search: { voltar: location.href } });
    return { sessao };
  },
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
