import { createFileRoute } from "@tanstack/react-router";

import { ConfirmarLink } from "@/features/conta/confirmar-link";
import { TelaDeConta } from "@/features/conta/tela-de-conta";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/auth/confirmar")({
  component: Confirmar,
  head: () => ({
    meta: [
      ...metasDaPagina("Confirmando", "Confirmando o link enviado por e-mail."),
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Confirmar() {
  return (
    <TelaDeConta titulo="Confirmando">
      <ConfirmarLink />
    </TelaDeConta>
  );
}
