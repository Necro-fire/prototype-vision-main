export const NOME = "ON-STYLE";

// Título de uma página de conteúdo: "Serviços — ON-STYLE".
export const tituloDaPagina = (pagina: string) => `${pagina} — ${NOME}`;

// Metas padrão de uma rota de conteúdo. Toda rota define as próprias (CLAUDE.md).
export function metasDaPagina(pagina: string, descricao: string) {
  const titulo = tituloDaPagina(pagina);
  return [
    { title: titulo },
    { name: "description", content: descricao },
    { property: "og:title", content: titulo },
    { property: "og:description", content: descricao },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ];
}
