// Regras da foto do catálogo na tela. O bucket do Supabase confere de novo (migração 6): esta
// checagem existe para o dono saber o que fazer antes de esperar o envio.
export const TAMANHO_MAXIMO_DA_FOTO = 5 * 1024 * 1024;

export const extensaoDoTipo: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const tiposAceitos = Object.keys(extensaoDoTipo).join(",");

export function validarFoto(arquivo: { type: string; size: number }): string | null {
  if (!(arquivo.type in extensaoDoTipo)) return "Use uma foto JPG, PNG ou WebP.";
  if (arquivo.size === 0) return "Esse arquivo está vazio. Escolha outra foto.";
  if (arquivo.size > TAMANHO_MAXIMO_DA_FOTO) return "A foto precisa ter até 5 MB.";
  return null;
}
