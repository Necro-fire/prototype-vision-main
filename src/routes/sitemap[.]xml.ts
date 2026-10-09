import { createFileRoute } from "@tanstack/react-router";

import { montarSitemap, origemDoPedido, respostaDeTexto } from "@/lib/seo";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) =>
        respostaDeTexto(montarSitemap(origemDoPedido(request.url)), "application/xml"),
    },
  },
});
