// Arquivos para buscadores: robots.txt e mapa do site. O endereço vem do próprio pedido, então
// vale em qualquer domínio (o de teste da Cloudflare e o da barbearia) sem configurar nada.

// Páginas públicas de conteúdo. Área do dono, conta e rotas de API ficam de fora.
export const paginasPublicas = ["/", "/servicos", "/produtos", "/contato", "/agendamento"];

const escaparXml = (texto: string) =>
  texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const origemDoPedido = (urlDoPedido: string) => new URL(urlDoPedido).origin;

export function montarRobots(origem: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /cliente",
    "Disallow: /auth/",
    "Disallow: /api/",
    "",
    `Sitemap: ${origem}/sitemap.xml`,
    "",
  ].join("\n");
}

export function montarSitemap(origem: string, paginas: string[] = paginasPublicas): string {
  const urls = paginas
    .map((caminho) => `  <url><loc>${escaparXml(origem + caminho)}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const respostaDeTexto = (corpo: string, tipo: string) =>
  new Response(corpo, {
    headers: { "content-type": `${tipo}; charset=utf-8`, "cache-control": "public, max-age=3600" },
  });
