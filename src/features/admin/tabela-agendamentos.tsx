import { Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Booking } from "@/features/agenda/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { dataCurta } from "@/lib/datas";
import { money } from "@/lib/dinheiro";
import { EstadoVazio } from "./componentes";
import { ListaAdaptavel } from "./lista-adaptavel";
import { statuses } from "./modulos";

export function TabelaAgendamentos({ rows }: { rows: Booking[] }) {
  const shop = useShop();
  return (
    <ListaAdaptavel
      descricao="Agendamentos"
      linhas={rows}
      chave={(b) => b.id}
      vazio={
        <EstadoVazio
          icone={CalendarDays}
          titulo="Nenhum agendamento por aqui."
          texto="Os agendamentos feitos no site aparecem aqui, nesta sessão."
          acao={
            <Button asChild variant="outline">
              <Link to="/agendamento" search={{ service: undefined }}>
                Criar um agendamento
              </Link>
            </Button>
          }
        />
      }
      colunas={[
        {
          rotulo: "Cliente",
          principal: true,
          render: (b) => (
            <>
              <strong className="font-semibold">{b.name}</strong>
              <span className="block text-sm font-normal text-muted-foreground">{b.phone}</span>
            </>
          ),
        },
        { rotulo: "Serviço", render: (b) => b.serviceName },
        { rotulo: "Quando", render: (b) => `${dataCurta(b.date)}, ${b.time}` },
        { rotulo: "Valor", alinharADireita: true, render: (b) => money(b.price) },
        {
          rotulo: "Situação",
          render: (b) => (
            <NativeSelect
              aria-label={`Status de ${b.name}`}
              className="min-h-11 py-1 font-semibold"
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
            </NativeSelect>
          ),
        },
      ]}
    />
  );
}

export function ordenarPorData(bookings: Booking[]) {
  return [...bookings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}
