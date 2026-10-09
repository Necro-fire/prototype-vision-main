import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PropsDoControle = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

// Rótulo + controle + ajuda + erro, com o erro ligado ao campo certo para leitores de tela.
export function Campo({
  id,
  rotulo,
  opcional = false,
  ajuda,
  erro,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  opcional?: boolean;
  ajuda?: string;
  erro?: string;
  className?: string;
  children: (props: PropsDoControle) => ReactNode;
}) {
  const ids = [ajuda ? `${id}-ajuda` : null, erro ? `${id}-erro` : null].filter(Boolean);
  return (
    <div className={cn("grid gap-2", className)}>
      <label htmlFor={id} className="text-base font-semibold">
        {rotulo}
        {opcional && <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>}
      </label>
      {children({
        id,
        "aria-describedby": ids.length ? ids.join(" ") : undefined,
        "aria-invalid": erro ? true : undefined,
      })}
      {ajuda && (
        <p id={`${id}-ajuda`} className="text-sm text-muted-foreground">
          {ajuda}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-semibold text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
