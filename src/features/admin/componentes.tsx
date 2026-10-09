import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Indicador({
  rotulo,
  valor,
  nota,
  icone: Icone,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  icone: LucideIcon;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="grid gap-1 rounded-md border-2 border-foreground bg-card p-4"
    >
      <p className="flex items-center justify-between gap-2 text-base text-muted-foreground">
        {rotulo}
        <Icone aria-hidden="true" className="size-5 shrink-0" />
      </p>
      <p className="font-display text-3xl font-extrabold leading-tight tabular-nums">{valor}</p>
      <p className="text-sm text-muted-foreground">{nota}</p>
    </div>
  );
}

export function EstadoVazio({
  icone: Icone,
  titulo,
  texto,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="grid justify-items-start gap-3 rounded-md border-2 border-dashed border-input p-6">
      {Icone && <Icone aria-hidden="true" className="size-8 text-muted-foreground" />}
      <h3 className="font-display text-xl font-bold">{titulo}</h3>
      {texto && <p className="max-w-[60ch] text-base text-muted-foreground">{texto}</p>}
      {acao}
    </div>
  );
}

export function BarraDeFiltros({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="search" className={cn("grid gap-3 sm:flex sm:flex-wrap sm:items-end", className)}>
      {children}
    </div>
  );
}

export function SecaoAdmin({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={titulo} className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-2xl font-extrabold">{titulo}</h2>
        {nota && <p className="text-sm text-muted-foreground">{nota}</p>}
      </div>
      {children}
    </section>
  );
}
