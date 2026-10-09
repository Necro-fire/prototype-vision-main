// Fotos de serviços e produtos no Storage do Supabase (bucket público `catalogo`). Só o dono
// envia e apaga (política do banco). O endereço público da foto fica em `foto_url`.
import { supabaseNavegador } from "@/lib/supabase-navegador";
import { extensaoDoTipo, validarFoto } from "./foto-validacao";

export const BUCKET_DO_CATALOGO = "catalogo";

export type PastaDeFoto = "servicos" | "produtos";

// O que o dono fez com a foto no cadastro.
export type MudancaDeFoto =
  { tipo: "manter" } | { tipo: "remover" } | { tipo: "trocar"; arquivo: File };

export const semMudancaDeFoto: MudancaDeFoto = { tipo: "manter" };

// Caminho do arquivo dentro do bucket, a partir do endereço público. Endereço de outro lugar
// (ou vazio) dá nulo: nunca se apaga o que não é do catálogo.
export function caminhoDaFoto(url: string | null): string | null {
  if (!url) return null;
  const marca = `/object/public/${BUCKET_DO_CATALOGO}/`;
  const posicao = url.indexOf(marca);
  if (posicao === -1) return null;
  const caminho = decodeURIComponent(url.slice(posicao + marca.length).split("?")[0] ?? "");
  return caminho || null;
}

// Cada foto ganha um nome novo: trocar a foto nunca mostra a antiga guardada no navegador.
export async function enviarFoto(pasta: PastaDeFoto, arquivo: File): Promise<string> {
  const problema = validarFoto(arquivo);
  if (problema) throw new Error(problema);
  const caminho = `${pasta}/${crypto.randomUUID()}.${extensaoDoTipo[arquivo.type]}`;
  const bucket = supabaseNavegador().storage.from(BUCKET_DO_CATALOGO);
  const { error } = await bucket.upload(caminho, arquivo, {
    contentType: arquivo.type,
    cacheControl: "31536000",
  });
  if (error) throw new Error("Não conseguimos enviar a foto. Tente de novo.");
  return bucket.getPublicUrl(caminho).data.publicUrl;
}

// Faxina: se não der para apagar, o arquivo fica sobrando no bucket, mas nada quebra.
export async function apagarFoto(url: string | null): Promise<void> {
  const caminho = caminhoDaFoto(url);
  if (!caminho) return;
  try {
    await supabaseNavegador().storage.from(BUCKET_DO_CATALOGO).remove([caminho]);
  } catch {
    // sobra de arquivo não deve atrapalhar o cadastro
  }
}

// Envia a foto nova antes de gravar a linha, e só apaga a antiga depois que a linha foi gravada.
// Se a gravação falhar, a foto nova recém-enviada é descartada e a antiga continua valendo.
// `gravar` recebe o endereço novo, nulo (foto removida) ou `undefined` (não mexer na foto).
export async function gravarComFoto(
  pasta: PastaDeFoto,
  mudanca: MudancaDeFoto,
  fotoAtual: string | null,
  gravar: (fotoUrl: string | null | undefined) => Promise<void>,
): Promise<void> {
  if (mudanca.tipo === "manter") {
    await gravar(undefined);
    return;
  }
  const nova = mudanca.tipo === "trocar" ? await enviarFoto(pasta, mudanca.arquivo) : null;
  try {
    await gravar(nova);
  } catch (erro) {
    await apagarFoto(nova);
    throw erro;
  }
  await apagarFoto(fotoAtual);
}
