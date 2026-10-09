import { createFileRoute } from "@tanstack/react-router";

import { moduleNames } from "@/features/admin/modulos";
import { AdminPanel } from "@/features/admin/painel";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/admin/$module")({
  component: Module,
  head: ({ params }) => ({
    meta: metasDaPagina(
      `${moduleNames[params.module] ?? "Página não encontrada"} (gestão)`,
      `Gestão de ${(moduleNames[params.module] ?? "operações").toLowerCase()} da ON-STYLE.`,
    ),
  }),
});

function Module() {
  const { module } = Route.useParams();
  return <AdminPanel key={module} module={module} />;
}
