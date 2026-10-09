import { createFileRoute } from "@tanstack/react-router";

import { FormularioRecuperarSenha } from "@/features/conta/formulario-recuperar-senha";
import { TelaDeConta } from "@/features/conta/tela-de-conta";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/recuperar-senha")({
  component: RecuperarSenha,
  head: () => ({
    meta: [
      ...metasDaPagina("Recuperar senha", "Peça um link por e-mail para criar uma nova senha."),
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RecuperarSenha() {
  return (
    <TelaDeConta
      titulo="Recuperar senha"
      descricao="Informe o e-mail da conta. Enviamos um link para criar uma nova senha."
    >
      <FormularioRecuperarSenha />
    </TelaDeConta>
  );
}
