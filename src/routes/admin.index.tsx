import { createFileRoute } from "@tanstack/react-router";

import { AdminPanel } from "@/features/admin/painel";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/admin/")({
  component: () => <AdminPanel />,
  head: () => ({
    meta: metasDaPagina("Hoje (gestão)", "A agenda de hoje e o que vem a seguir na ON-STYLE."),
  }),
});
