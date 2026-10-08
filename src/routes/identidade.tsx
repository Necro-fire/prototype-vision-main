import { createFileRoute } from "@tanstack/react-router";
import { PaginaIdentidade } from "@/features/identidade/pagina";

const fontes =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900" +
  "&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Figtree:wght@400..800" +
  "&family=Gabarito:wght@400..900&family=Hanken+Grotesk:wght@400..800&display=swap";

// Página temporária para escolher a identidade (Fase 1). Não é linkada no site e fica fora das buscas.
export const Route = createFileRoute("/identidade")({
  component: Identidade,
  validateSearch: (
    search: Record<string, unknown>,
  ): { estado: "aberto" | "fechado" | undefined } => {
    const estado = search["estado"];
    return { estado: estado === "aberto" || estado === "fechado" ? estado : undefined };
  },
  head: () => ({
    meta: [
      { title: "Direções de identidade — ON-STYLE" },
      {
        name: "description",
        content: "Três propostas de identidade visual para a ON-STYLE, para escolher a direção.",
      },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "stylesheet", href: fontes }],
  }),
});

function Identidade() {
  const { estado } = Route.useSearch();
  return <PaginaIdentidade estadoInicial={estado} />;
}
