import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils";
import { contarNaoLidos, useAlertas } from "./alertas-do-dono";

// O sino do dono: leva à lista de alertas e mostra quantos ainda não foram lidos.
export function Sino({ className }: { className?: string }) {
  const { data } = useAlertas();
  const naoLidos = contarNaoLidos(data);
  return (
    <Link
      to="/admin/$module"
      params={{ module: "alertas" }}
      aria-label={naoLidos > 0 ? `Alertas, ${naoLidos} não lidos` : "Alertas"}
      className={cn(
        "relative inline-flex size-11 items-center justify-center rounded-md text-header-muted hover:text-header-foreground",
        className,
      )}
    >
      <Bell aria-hidden="true" className="size-6" />
      {naoLidos > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-sm font-extrabold leading-5 text-primary-foreground"
        >
          {naoLidos > 99 ? "99+" : naoLidos}
        </span>
      )}
    </Link>
  );
}
