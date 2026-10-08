import { createFileRoute } from "@tanstack/react-router";
import { moduleNames } from "@/features/admin/modulos";
import { AdminPanel } from "@/features/admin/painel";
export const Route = createFileRoute("/admin/$module")({
  component: Module,
  head: ({ params }) => ({
    meta: [
      { title: `${moduleNames[params.module] ?? "Módulo"} — Gestão Slick` },
      {
        name: "description",
        content: `Gestão de ${moduleNames[params.module] ?? "operações"} da Slick Barbearia, ambiente demonstrativo.`,
      },
      { property: "og:title", content: `${moduleNames[params.module] ?? "Módulo"} — Gestão Slick` },
      {
        property: "og:description",
        content: `Painel demonstrativo: ${moduleNames[params.module] ?? "gestão"}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
function Module() {
  const { module } = Route.useParams();
  return <AdminPanel key={module} module={module} />;
}
