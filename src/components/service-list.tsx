import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import type { Catalogo } from "@/features/catalogo/banco";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

// A tabela de preços da parede: nome, pontilhado, preço. Cada linha leva ao agendamento.
// `catalogo` é nulo quando a leitura no banco falhou.
export function ServiceList({
  catalogo,
  filters = false,
}: {
  catalogo: Catalogo | null;
  filters?: boolean;
}) {
  const [category, setCategory] = useState("Todos");

  if (!catalogo) {
    return (
      <p role="alert" className="rounded-md border-2 border-dashed border-input p-6 text-base">
        Não conseguimos carregar os serviços agora. Recarregue a página em instantes.
      </p>
    );
  }

  const ativos = catalogo.servicos;
  const categories = ["Todos", ...catalogo.categorias];
  const visiveis = ativos.filter((s) => category === "Todos" || s.categoria === category);

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
                      {s.nome}
                    </strong>
                    {s.destaque && <Badge variant="info">Mais pedido</Badge>}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.duracaoMinutos} min
                    {filters && s.descricao ? `. ${s.descricao}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="h-0 self-center border-b-2 border-dotted border-muted-foreground/60"
                />
                <span className="font-display text-xl font-extrabold tabular-nums">
                  {precoCurtoDeCentavos(s.precoCentavos)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
