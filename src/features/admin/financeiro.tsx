import { useState } from "react";
import { Package, Scissors, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useShop } from "@/features/demo/shop-provider";
import { grossRevenue } from "@/features/financeiro/faturamento";
import { money } from "@/lib/dinheiro";
import { BarraDeFiltros, Indicador } from "./componentes";
import { PaginaAdmin } from "./pagina-admin";

export function Financeiro() {
  const shop = useShop();
  const [date, setDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const r = grossRevenue(shop.bookings, shop.sales, { date, serviceId, productId });
  return (
    <PaginaAdmin module="financeiro">
      <BarraDeFiltros>
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Filtrar por data"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <NativeSelect
          aria-label="Filtrar serviço"
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            setProductId("");
          }}
        >
          <option value="">Todos os serviços</option>
          {shop.services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filtrar produto"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setServiceId("");
          }}
        >
          <option value="">Todos os produtos</option>
          {shop.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          onClick={() => {
            setDate("");
            setServiceId("");
            setProductId("");
          }}
        >
          Limpar filtros
        </Button>
      </BarraDeFiltros>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Faturamento bruto"
          icone={TrendingUp}
          valor={money(r.total)}
          nota="Serviços concluídos mais vendas"
        />
        <Indicador
          rotulo="Serviços"
          icone={Scissors}
          valor={money(r.services)}
          nota="Atendimentos concluídos"
        />
        <Indicador
          rotulo="Produtos"
          icone={Package}
          valor={money(r.products)}
          nota="Vendas registradas"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Formas de pagamento, descontos e fechamento de caixa entram na Fase 6 do roadmap.
      </p>
    </PaginaAdmin>
  );
}
