import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop } from "@/features/demo/shop-provider";
import { statuses } from "./modulos";
import { PaginaAdmin } from "./pagina-admin";
import { TabelaAgendamentos, ordenarPorData } from "./tabela-agendamentos";

export function Agendamentos() {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [period, setPeriod] = useState("");
  const filtered = ordenarPorData(shop.bookings).filter(
    (b) =>
      (status === "Todos" || b.status === status) &&
      (!period || b.date === period) &&
      `${b.name} ${b.serviceName} ${b.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <PaginaAdmin module="agendamentos">
      <div className="admin-filter-bar">
        <div className="search-input">
          <Search size={17} />
          <Input
            aria-label="Pesquisar registros"
            placeholder="Buscar cliente ou serviço..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Input
          type="date"
          aria-label="Filtrar por data"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <select
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Todos</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <Button
          variant="ghost"
          onClick={() => {
            setQuery("");
            setPeriod("");
            setStatus("Todos");
          }}
        >
          Limpar
        </Button>
      </div>
      <TabelaAgendamentos rows={filtered} />
    </PaginaAdmin>
  );
}
