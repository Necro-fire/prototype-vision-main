import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/features/admin/painel";
export const Route = createFileRoute("/admin/")({
  component: () => <AdminPanel />,
  head: () => ({
    meta: [
      { title: "Visão geral — Gestão Slick" },
      { name: "description", content: "Painel demonstrativo de gestão da Slick Barbearia." },
      { property: "og:title", content: "Visão geral — Gestão Slick" },
      {
        property: "og:description",
        content: "Agenda, serviços e resultados da Slick em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
