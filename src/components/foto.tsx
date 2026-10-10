import { cn } from "@/lib/utils";

// Larguras salvas de cada foto em public/fotos: "<arquivo>-<largura>.webp".
const larguras = [640, 960, 1440];

// Fotografia em espaço de proporção fixa (3:2), para ser trocada sem refazer a página.
// Toda foto precisa de crédito em docs/creditos-imagens.md.
export function Foto({
  arquivo,
  alt,
  prioridade = false,
  sizes = "(min-width: 48rem) 45.5rem, calc(100vw - 2.5rem)",
  className,
}: {
  arquivo: string;
  alt: string;
  prioridade?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <img
      src={`/fotos/${arquivo}-960.webp`}
      srcSet={larguras.map((largura) => `/fotos/${arquivo}-${largura}.webp ${largura}w`).join(", ")}
      sizes={sizes}
      alt={alt}
      width={960}
      height={640}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      decoding="async"
      className={cn(
        "aspect-3/2 w-full rounded-xl border border-line bg-muted object-cover",
        className,
      )}
    />
  );
}
