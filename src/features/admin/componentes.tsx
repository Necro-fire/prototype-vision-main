import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";

// Cartão de métrica: rótulo e ícone em cima, o número em serifa e uma nota embaixo.
// `destaque` põe uma régua laranja no alto do cartão que a tela quer que se veja primeiro.
export function Indicador({
  rotulo,
  valor,
  nota,
  icone,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  icone: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className={cn(
        "grid content-start gap-3 rounded-xl border bg-card p-5",
        destaque ? "border-line border-t-2 border-t-primary" : "border-line",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-base text-muted-foreground">{rotulo}</p>
        <IconTile icone={icone} tamanho="sm" />
      </div>
      <p className="font-display text-4xl font-semibold leading-none tabular-nums">{valor}</p>
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
    <div className="grid justify-items-start gap-3 rounded-xl border border-dashed border-line bg-card/40 p-6">
      {Icone && <IconTile icone={Icone} />}
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
        <h2 className="font-display text-3xl font-semibold leading-none">{titulo}</h2>
        {nota && <p className="text-sm text-muted-foreground">{nota}</p>}
      </div>
      {children}
    </section>
  );
}
