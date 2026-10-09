// Cabeçalhos de segurança de toda resposta do servidor. Função pura, usada em `src/server.ts`.
//
// A política de conteúdo (CSP) lista de onde a página pode carregar coisas: o próprio site, o
// Supabase (dados, login, tempo real e fotos do catálogo) e o Google Fonts (as duas fontes).
// `unsafe-inline` nos scripts e estilos é o preço do TanStack Start, que injeta o estado da página
// em um script no HTML; o ganho está nas outras regras: ninguém põe o site dentro de outro
// (frame-ancestors), nenhum plugin (object-src) e nenhum formulário envia para fora (form-action).
const politicaDeConteudo = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

export function comCabecalhosDeSeguranca(resposta: Response, urlDoPedido: string): Response {
  const cabecalhos = new Headers(resposta.headers);
  cabecalhos.set("X-Content-Type-Options", "nosniff");
  cabecalhos.set("Referrer-Policy", "strict-origin-when-cross-origin");
  cabecalhos.set("X-Frame-Options", "DENY");
  cabecalhos.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (new URL(urlDoPedido).protocol === "https:") {
    cabecalhos.set("Strict-Transport-Security", "max-age=31536000");
  }
  if ((cabecalhos.get("content-type") ?? "").includes("text/html")) {
    cabecalhos.set("Content-Security-Policy", politicaDeConteudo);
  }
  return new Response(resposta.body, {
    status: resposta.status,
    statusText: resposta.statusText,
    headers: cabecalhos,
  });
}
