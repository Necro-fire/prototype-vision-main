import type { ReactNode } from "react";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { moduleNames } from "./modulos";

const descricoes: Record<string, string> = {
  dashboard: "O que a barbearia precisa saber agora.",
  agendamentos: "Todos os horários marcados, com busca e filtros.",
  servicos: "O que você oferece, com preço e duração.",
  produtos: "O que está à venda no balcão.",
  clientes: "Quem tem conta e o histórico de cada um.",
  vendas: "Registre as vendas de produtos e veja o histórico.",
  caixa: "Abra e feche o caixa do dia e registre quem chegou sem hora marcada.",
  descontos: "Cupons e cartão fidelidade.",
  financeiro: "Quanto entrou, por período e por forma de pagamento.",
  alertas: "O que aconteceu na agenda: novos horários, cancelamentos e remarcações.",
  configuracoes: "Dados da barbearia, horário de funcionamento, regras da agenda e bloqueios.",
};

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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            {moduleNames[module] ?? "Página não encontrada"}
          </h1>
          <p className="text-base text-muted-foreground">
            {descricoes[module] ?? "Esta página não existe."}
          </p>
        </div>
        {action ?? (
          <p className="hidden text-base text-muted-foreground sm:block">
            {new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </div>
      {message && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-md border-2 border-success bg-success-soft py-1 pl-4 pr-1 text-base font-semibold text-success"
        >
          <Check aria-hidden="true" className="size-5 shrink-0" />
          <span className="flex-1">{message}</span>
          <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={onCloseMessage}>
            <X />
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
