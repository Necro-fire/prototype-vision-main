import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/features/agenda/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { money } from "@/lib/dinheiro";
import { statuses } from "./modulos";

export function TabelaAgendamentos({ rows }: { rows: Booking[] }) {
  const shop = useShop();
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Serviço</th>
            <th>Data / horário</th>
            <th>Valor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>{b.name}</strong>
                <small>{b.phone}</small>
              </td>
              <td>{b.serviceName}</td>
              <td>
                {new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR")}
                <small>{b.time}</small>
              </td>
              <td>{money(b.price)}</td>
              <td>
                <select
                  aria-label={`Status de ${b.name}`}
                  className="status-select"
                  value={b.status}
                  onChange={(e) =>
                    shop.setBookings((old) =>
                      old.map((item) =>
                        item.id === b.id ? { ...item, status: e.target.value } : item,
                      ),
                    )
                  }
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="admin-empty">
          <CalendarDays />
          <h3>Nenhum registro por aqui.</h3>
          <p>Os agendamentos feitos no site aparecem nesta sessão.</p>
          <Button asChild variant="outline">
            <Link to="/agendamento" search={{ service: undefined }}>
              Criar um agendamento <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export function ordenarPorData(bookings: Booking[]) {
  return [...bookings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
