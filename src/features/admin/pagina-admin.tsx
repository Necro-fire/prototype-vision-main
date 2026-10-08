import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moduleNames } from "./modulos";

type PaginaAdminProps = {
  module: string;
  // Botão de ação do cabeçalho. Sem ele, o cabeçalho mostra a data de hoje.
  action?: ReactNode;
  message?: string;
  onCloseMessage?: () => void;
  children: ReactNode;
};

export function PaginaAdmin({
  module,
  action,
  message,
  onCloseMessage,
  children,
}: PaginaAdminProps) {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">SLICK / GESTÃO</span>
          <h1>{moduleNames[module] ?? "Página não encontrada"}</h1>
          <p>
            {module === "dashboard"
              ? "O que importa para o seu negócio, em um só lugar."
              : module === "configuracoes"
                ? "Os detalhes que fazem a barbearia funcionar."
                : "Organize o seu ofício."}
          </p>
        </div>
        {action ?? (
          <span className="admin-date">
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>
      {message && (
        <div role="status" className="admin-notice">
          <Check size={16} />
          {message}
          <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={onCloseMessage}>
            <X />
          </Button>
        </div>
      )}
      {children}
    </>
  );
}
