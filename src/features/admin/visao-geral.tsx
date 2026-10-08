import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Package, Scissors, TrendingUp } from "lucide-react";
import { today } from "@/features/agenda/disponibilidade";
import { useShop } from "@/features/demo/shop-provider";
import { grossRevenue } from "@/features/financeiro/faturamento";
import { money } from "@/lib/dinheiro";
import { PaginaAdmin } from "./pagina-admin";
import { TabelaAgendamentos, ordenarPorData } from "./tabela-agendamentos";

export function VisaoGeral() {
  const shop = useShop();
  const completed = shop.bookings.filter((b) => b.status === "Concluído");
  const revenue = grossRevenue(shop.bookings, shop.sales).total;
  const sorted = ordenarPorData(shop.bookings);
  return (
    <PaginaAdmin module="dashboard">
      <div className="stats-grid">
        <div className="stat">
          <span>
            Faturamento bruto <TrendingUp />
          </span>
          <strong>{money(revenue)}</strong>
          <small>Atendimentos concluídos nesta sessão</small>
        </div>
        <div className="stat">
          <span>
            Agendamentos <CalendarDays />
          </span>
          <strong>
            {shop.bookings
              .filter((b) => !["Cancelado", "Não compareceu"].includes(b.status))
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <small>{shop.bookings.filter((b) => b.date === today()).length} para hoje</small>
        </div>
        <div className="stat">
          <span>
            Clientes <Scissors />
          </span>
          <strong>{shop.clients.length.toString().padStart(2, "0")}</strong>
          <small>Cadastros únicos por celular</small>
        </div>
        <div className="stat">
          <span>
            Ticket médio <Package />
          </span>
          <strong>{money(completed.length ? revenue / completed.length : 0)}</strong>
          <small>Por atendimento concluído</small>
        </div>
      </div>
      <div className="admin-section-head">
        <h2>Próximos agendamentos</h2>
        <Link to="/admin/$module" params={{ module: "agendamentos" }} className="text-link">
          Ver todos <ArrowUpRight size={16} />
        </Link>
      </div>
      <TabelaAgendamentos
        rows={sorted
          .filter((b) => ["Agendado", "Confirmado", "Em atendimento"].includes(b.status))
          .slice(0, 5)}
      />
      <div className="admin-section-head">
        <h2>Serviços mais vendidos</h2>
        <span className="text-muted-foreground text-sm">Atendimentos concluídos</span>
      </div>
      <div className="ranking">
        {shop.services
          .map((s) => ({
            name: s.name,
            count: completed.filter((b) => b.serviceId === s.id).length,
          }))
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((s, i) => (
            <div key={s.name}>
              <span>0{i + 1}</span>
              <strong>{s.name}</strong>
              <span>{s.count} atendimentos</span>
            </div>
          ))}
        {completed.length === 0 && (
          <p className="text-muted-foreground">
            O ranking aparecerá quando houver atendimentos concluídos.
          </p>
        )}
      </div>
    </PaginaAdmin>
  );
}
