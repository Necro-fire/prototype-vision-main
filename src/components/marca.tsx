import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

// O "ON" do nome acende em laranja quando a barbearia está aberta.
export function Marca({ ligado = false, className }: { ligado?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-display text-2xl font-bold leading-none tracking-tight",
        className,
      )}
    >
      <span
        data-ligado={ligado}
        className="rounded-md border-2 border-current px-2 pb-1 pt-1.5 data-[ligado=true]:border-primary data-[ligado=true]:bg-primary data-[ligado=true]:text-primary-foreground"
      >
        ON
      </span>
      <span>-STYLE</span>
    </span>
  );
}

export function MarcaLink({ ligado = false, className }: { ligado?: boolean; className?: string }) {
  return (
    <Link
      to="/"
      aria-label="ON-STYLE, ir para o início"
      className={cn("inline-flex min-h-11 items-center", className)}
    >
      <Marca ligado={ligado} />
    </Link>
  );
}

// "Aberto agora, até as 19h" ou "Fechado. Abre amanhã às 9h".
export function EstadoDeFuncionamento({
  aberto,
  texto,
  className,
}: {
  aberto: boolean;
  texto: string | undefined;
  className?: string;
}) {
  return (
    <p
      data-ligado={aberto}
      className={cn("flex min-h-8 items-center gap-2.5 text-base font-semibold", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-3 shrink-0 border-2",
          aberto ? "border-primary bg-primary" : "border-muted-foreground",
        )}
      />
      {texto ?? "Conferindo se estamos abertos"}
    </p>
  );
}
