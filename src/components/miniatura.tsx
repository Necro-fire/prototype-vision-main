// Foto pequena ao lado do nome de um serviço ou produto. O nome já está escrito ao lado, então a
// imagem é só enfeite para leitor de tela (alt vazio): ler "Foto de Corte" antes de "Corte" é ruído.
export function Miniatura({ url }: { url: string }) {
  return (
    <img
      src={url}
      alt=""
      width={56}
      height={56}
      loading="lazy"
      decoding="async"
      className="size-12 shrink-0 sm:size-14 rounded-md border-2 border-foreground bg-muted object-cover"
    />
  );
}
