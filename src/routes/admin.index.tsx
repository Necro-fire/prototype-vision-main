import { createFileRoute } from "@tanstack/react-router";

import { AdminPanel } from "@/features/admin/painel";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/admin/")({
  component: () => <AdminPanel />,
  head: () => ({
    meta: metasDaPagina("Visão geral (gestão)", "Agenda, serviços e resultados da ON-STYLE."),
  }),
});
