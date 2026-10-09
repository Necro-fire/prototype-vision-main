import { Link } from "@tanstack/react-router";
import { CalendarDays, Package, Scissors, TrendingUp } from "lucide-react";

import { today } from "@/features/agenda/disponibilidade";
import { useShop } from "@/features/demo/shop-provider";
import { grossRevenue } from "@/features/financeiro/faturamento";
import { money } from "@/lib/dinheiro";
import { Indicador, SecaoAdmin } from "./componentes";
import { PaginaAdmin } from "./pagina-admin";
import { TabelaAgendamentos, ordenarPorData } from "./tabela-agendamentos";

export function VisaoGeral() {
  const shop = useShop();
  const completed = shop.bookings.filter((b) => b.status === "Concluído");
  const revenue = grossRevenue(shop.bookings, shop.sales).total;
  const sorted = ordenarPorData(shop.bookings);
  const ativos = shop.bookings.filter((b) => !["Cancelado", "Não compareceu"].includes(b.status));
  const ranking = shop.services
    .map((s) => ({
      name: s.name,
      count: completed.filter((b) => b.serviceId === s.id).length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <PaginaAdmin module="dashboard">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          rotulo="Faturamento bruto"
          icone={TrendingUp}
          valor={money(revenue)}
          nota="Atendimentos concluídos nesta sessão"
        />
        <Indicador
          rotulo="Agendamentos"
          icone={CalendarDays}
          valor={String(ativos.length).padStart(2, "0")}
          nota={`${shop.bookings.filter((b) => b.date === today()).length} para hoje`}
        />
        <Indicador
          rotulo="Clientes"
          icone={Scissors}
          valor={String(shop.clients.length).padStart(2, "0")}
          nota="Cadastros únicos por celular"
        />
        <Indicador
          rotulo="Ticket médio"
          icone={Package}
          valor={money(completed.length ? revenue / completed.length : 0)}
          nota="Por atendimento concluído"
        />
      </div>

      <SecaoAdmin titulo="Próximos agendamentos">
        <TabelaAgendamentos
          rows={sorted
            .filter((b) => ["Agendado", "Confirmado", "Em atendimento"].includes(b.status))
            .slice(0, 5)}
        />
        <Link
          to="/admin/$module"
          params={{ module: "agendamentos" }}
          className="inline-flex min-h-11 items-center font-semibold text-info underline underline-offset-4 hover:no-underline"
        >
          Ver todos os agendamentos
        </Link>
      </SecaoAdmin>

      <SecaoAdmin titulo="Serviços mais pedidos" nota="Atendimentos concluídos">
        {ranking.length === 0 ? (
          <p className="text-base text-muted-foreground">
            O ranking aparece quando houver atendimentos concluídos.
          </p>
        ) : (
          <ol className="divide-y divide-border rounded-md border-2 border-foreground bg-card">
            {ranking.map((s, i) => (
              <li key={s.name} className="flex items-center gap-4 px-4 py-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-md bg-foreground font-display text-lg font-extrabold text-background"
                >
                  {i + 1}
                </span>
                <strong className="flex-1 font-semibold">{s.name}</strong>
                <span className="text-muted-foreground">{s.count} atendimentos</span>
              </li>
            ))}
          </ol>
        )}
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
