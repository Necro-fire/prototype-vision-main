import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { categories } from "@/features/catalogo/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { cn } from "@/lib/utils";
import { precoCurto } from "@/lib/dinheiro";

// A tabela de preços da parede: nome, pontilhado, preço. Cada linha leva ao agendamento.
export function ServiceList({ filters = false }: { filters?: boolean }) {
  const { services } = useShop();
  const [category, setCategory] = useState("Todos");
  const ativos = services.filter((s) => s.active);
  const visiveis = ativos.filter((s) => category === "Todos" || s.category === category);

  return (
    <div className="grid gap-5">
      {filters && (
        <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                "min-h-11 cursor-pointer rounded-md border-2 px-4 text-base font-semibold transition-colors",
                category === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-card hover:bg-muted",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-md border-2 border-dashed border-input p-6 text-base text-muted-foreground">
          {ativos.length === 0
            ? "Nenhum serviço disponível no momento."
            : "Nenhum serviço nessa categoria."}
        </p>
      ) : (
        <ul
          aria-label="Serviços e preços"
          className="divide-y divide-border overflow-hidden rounded-md border-2 border-foreground bg-card"
        >
          {visiveis.map((s) => (
            <li key={s.id}>
              <Link
                to="/agendamento"
                search={{ service: s.id }}
                className="grid min-h-[4.5rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent sm:px-5"
              >
                <span className="grid gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <strong className="font-display text-xl font-bold leading-tight">
                      {s.name}
                    </strong>
                    {s.featured && <Badge variant="info">Mais pedido</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.duration} min
                    {filters && s.description ? `. ${s.description}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="h-0 self-center border-b-2 border-dotted border-muted-foreground/60"
                />
                <span className="font-display text-xl font-extrabold tabular-nums">
                  {precoCurto(s.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
