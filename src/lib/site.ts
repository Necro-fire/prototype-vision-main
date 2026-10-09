// Endereço público do site (https://onstyle.com.br), sem barra no fim. Entra na compilação como
// VITE_SITE_URL. Sem ele, o site funciona igual, só não anuncia imagem de compartilhamento.
export function urlDoSite(): string | undefined {
  const url = import.meta.env["VITE_SITE_URL"];
  return url ? url.replace(/\/+$/, "") : undefined;
}

export const imagemDeCompartilhamento = (urlDoSiteAbsoluta: string) =>
  `${urlDoSiteAbsoluta}/compartilhar.jpg`;
