import { useState } from "react";
import { Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useShop } from "@/features/demo/shop-provider";
import { BarraDeFiltros, EstadoVazio } from "./componentes";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

export function Clientes() {
  const shop = useShop();
  const [query, setQuery] = useState("");
  const filtrados = shop.clients.filter((c) =>
    `${c.name} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <PaginaAdmin module="clientes">
      <BarraDeFiltros>
        <div className="relative sm:min-w-64 sm:max-w-md sm:flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-11"
            aria-label="Buscar cliente"
            placeholder="Buscar por nome ou celular"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </BarraDeFiltros>
      <ListaAdaptavel
        descricao="Clientes"
        linhas={filtrados}
        chave={(c) => c.id}
        vazio={
          <EstadoVazio
            icone={Users}
            titulo={shop.clients.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum resultado."}
            texto={
              shop.clients.length === 0
                ? "O primeiro agendamento cria o cadastro, pelo celular."
                : "Tente buscar por outro nome ou número."
            }
          />
        }
        colunas={[
          { rotulo: "Nome", principal: true, render: (c) => c.name },
          { rotulo: "Celular", render: (c) => c.phone },
          {
            rotulo: "Agendamentos",
            alinharADireita: true,
            render: (c) => shop.bookings.filter((b) => b.clientId === c.id).length,
          },
        ]}
      />
    </PaginaAdmin>
  );
}
