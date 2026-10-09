import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useShop } from "@/features/demo/shop-provider";
import { BarraDeFiltros } from "./componentes";
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
      <BarraDeFiltros>
        <div className="relative sm:min-w-64 sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-11"
            aria-label="Pesquisar registros"
            placeholder="Buscar cliente ou serviço"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Filtrar por data"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <NativeSelect
          aria-label="Filtrar status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option>Todos</option>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          onClick={() => {
            setQuery("");
            setPeriod("");
            setStatus("Todos");
          }}
        >
          Limpar filtros
        </Button>
      </BarraDeFiltros>
      <TabelaAgendamentos rows={filtered} />
    </PaginaAdmin>
  );
}
