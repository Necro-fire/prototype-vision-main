import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Ícone dentro de um quadrado de filete. Decorativo: o texto ao lado já diz o que é.
export function IconTile({
  icone: Icone,
  tamanho = "md",
  className,
}: {
  icone: LucideIcon;
  tamanho?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-sm border border-line bg-muted text-primary",
        tamanho === "sm" && "size-10 [&_svg]:size-5",
        tamanho === "md" && "size-12 [&_svg]:size-6",
        tamanho === "lg" && "size-14 [&_svg]:size-7",
        className,
      )}
    >
      <Icone />
    </span>
  );
}
