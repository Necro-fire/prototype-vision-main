import { createFileRoute } from "@tanstack/react-router";

import { montarRobots, origemDoPedido, respostaDeTexto } from "@/lib/seo";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: ({ request }) =>
        respostaDeTexto(montarRobots(origemDoPedido(request.url)), "text/plain"),
    },
  },
});
