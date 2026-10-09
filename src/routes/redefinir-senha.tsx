import { createFileRoute } from "@tanstack/react-router";

import { FormularioRedefinirSenha } from "@/features/conta/formulario-redefinir-senha";
import { TelaDeConta } from "@/features/conta/tela-de-conta";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/redefinir-senha")({
  component: RedefinirSenha,
  head: () => ({
    meta: [
      ...metasDaPagina("Nova senha", "Crie uma nova senha para a sua conta."),
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RedefinirSenha() {
  return (
    <TelaDeConta titulo="Nova senha" descricao="Escolha uma senha que você não use em outro lugar.">
      <FormularioRedefinirSenha />
    </TelaDeConta>
  );
}
