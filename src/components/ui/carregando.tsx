import { cn } from "@/lib/utils";

// Espera de rede: o texto diz o que está carregando e as barras reservam o espaço da lista.
// Sem `role="status"` de propósito: as telas usam esse papel para os avisos de resultado, e o
// texto da espera já é lido como conteúdo da página.
export function EstadoCarregando({
  texto = "Carregando.",
  className,
}: {
  texto?: string;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={cn("grid gap-3", className)}>
      <p className="text-base text-muted-foreground">{texto}</p>
      <div aria-hidden="true" className="grid gap-2">
        <span className="h-12 animate-pulse rounded-lg bg-secondary" />
        <span className="h-12 animate-pulse rounded-lg bg-secondary/70" />
        <span className="h-12 w-2/3 animate-pulse rounded-lg bg-secondary/45" />
      </div>
    </div>
  );
}
