import { createFileRoute } from "@tanstack/react-router";

import { FormularioCriarConta } from "@/features/conta/formulario-criar-conta";
import { TelaDeConta } from "@/features/conta/tela-de-conta";
import { voltarDaBusca } from "@/features/conta/validacao";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/criar-conta")({
  component: CriarConta,
  validateSearch: (busca: Record<string, unknown>) => ({ voltar: voltarDaBusca(busca) }),
  head: () => ({
    meta: [
      ...metasDaPagina("Criar conta", "Crie sua conta para agendar horários na ON-STYLE."),
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CriarConta() {
  const { voltar } = Route.useSearch();
  return (
    <TelaDeConta
      titulo="Criar conta"
      descricao="Com a conta você agenda em um minuto e acompanha seus horários."
    >
      <FormularioCriarConta voltar={voltar} />
    </TelaDeConta>
  );
}
