import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useShop } from "@/features/demo/shop-provider";
import { PaginaAdmin } from "./pagina-admin";

export function Clientes() {
  const shop = useShop();
  const [query, setQuery] = useState("");
  return (
    <PaginaAdmin module="clientes">
      <div className="admin-filter-bar">
        <div className="search-input">
          <Search size={17} />
          <Input
            aria-label="Buscar cliente"
            placeholder="Buscar por nome ou celular..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Celular</th>
              <th>Agendamentos</th>
            </tr>
          </thead>
          <tbody>
            {shop.clients
              .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()))
              .map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td>{shop.bookings.filter((b) => b.clientId === c.id).length}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {shop.clients.length === 0 && (
          <div className="admin-empty">
            <h3>Nenhum cliente cadastrado.</h3>
            <p>O primeiro agendamento cria o cadastro por celular.</p>
          </div>
        )}
      </div>
    </PaginaAdmin>
  );
}
