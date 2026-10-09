import { createFileRoute } from "@tanstack/react-router";

import { FormularioEntrar } from "@/features/conta/formulario-entrar";
import { TelaDeConta } from "@/features/conta/tela-de-conta";
import { voltarDaBusca } from "@/features/conta/validacao";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/entrar")({
  component: Entrar,
  validateSearch: (busca: Record<string, unknown>) => ({ voltar: voltarDaBusca(busca) }),
  head: () => ({
    meta: [
      ...metasDaPagina("Entrar", "Entre na sua conta para agendar e ver seus horários."),
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Entrar() {
  const { voltar } = Route.useSearch();
  return (
    <TelaDeConta titulo="Entrar" descricao="Entre para agendar e ver seus horários.">
      <FormularioEntrar voltar={voltar} />
    </TelaDeConta>
  );
}
