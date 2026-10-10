import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Título de seção do site: uma marca laranja curta no alto indica "aqui começa outro assunto",
// o título e, se houver, uma linha de apoio. Sempre à esquerda.
export function SectionTitle({
  id,
  children,
  descricao,
  nivel = 2,
  className,
}: {
  id?: string;
  children: ReactNode;
  descricao?: string;
  nivel?: 1 | 2;
  className?: string;
}) {
  const Titulo = nivel === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "relative grid gap-3 pt-5 before:absolute before:left-0 before:top-0 before:h-1 before:w-12 before:bg-primary",
        className,
      )}
    >
      <Titulo
        id={id}
        className={cn(
          "font-semibold leading-[1.05]",
          nivel === 1 ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl",
        )}
      >
        {children}
      </Titulo>
      {descricao && <p className="max-w-[60ch] text-lg text-muted-foreground">{descricao}</p>}
    </div>
  );
}
