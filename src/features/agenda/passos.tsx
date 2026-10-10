import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const PASSOS = ["Serviço", "Dia e horário", "Confirmar"];

// Os passos do agendamento, numerados porque são uma sequência. `atual` é o índice do passo em
// que a pessoa está: os anteriores aparecem como feitos.
export function Passos({ atual, className }: { atual: number; className?: string }) {
  return (
    <ol
      aria-label="Passos do agendamento"
      className={cn("flex items-center gap-3 sm:gap-6", className)}
    >
      {PASSOS.map((nomeDoPasso, i) => (
        <li
          key={nomeDoPasso}
          aria-current={i === atual ? "step" : undefined}
          className={cn(
            "flex items-center gap-2 text-base font-semibold",
            i > atual && "text-muted-foreground",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-md border-2 text-base font-semibold",
              i <= atual && "border-primary bg-primary text-primary-foreground",
              i > atual && "border-input",
            )}
          >
            {i < atual ? <Check className="size-5" /> : i + 1}
          </span>
          <span className={i === atual ? "" : "hidden sm:inline"}>{nomeDoPasso}</span>
          {i < PASSOS.length - 1 && (
            <span aria-hidden="true" className="hidden h-0.5 w-6 bg-border sm:block" />
          )}
        </li>
      ))}
    </ol>
  );
}
