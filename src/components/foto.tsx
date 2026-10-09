// Larguras salvas de cada foto em public/fotos: "<arquivo>-<largura>.webp".
const larguras = [640, 960, 1440];

// Fotografia em espaço de proporção fixa (3:2), para ser trocada sem refazer a página.
// Toda foto precisa de crédito em docs/creditos-imagens.md.
export function Foto({
  arquivo,
  alt,
  prioridade = false,
}: {
  arquivo: string;
  alt: string;
  prioridade?: boolean;
}) {
  return (
    <img
      src={`/fotos/${arquivo}-960.webp`}
      srcSet={larguras.map((largura) => `/fotos/${arquivo}-${largura}.webp ${largura}w`).join(", ")}
      sizes="(min-width: 48rem) 45.5rem, calc(100vw - 2.5rem)"
      alt={alt}
      width={960}
      height={640}
      loading={prioridade ? "eager" : "lazy"}
      fetchPriority={prioridade ? "high" : "auto"}
      decoding="async"
      className="aspect-3/2 w-full rounded-md border-2 border-foreground bg-muted object-cover"
    />
  );
}
