import { useState } from "react";
import { Package, Scissors, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useShop } from "@/features/demo/shop-provider";
import { grossRevenue } from "@/features/financeiro/faturamento";
import { money } from "@/lib/dinheiro";
import { PaginaAdmin } from "./pagina-admin";

export function Financeiro() {
  const shop = useShop();
  const [date, setDate] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [productId, setProductId] = useState("");
  const r = grossRevenue(shop.bookings, shop.sales, { date, serviceId, productId });
  return (
    <PaginaAdmin module="financeiro">
      <div className="admin-filter-bar">
        <Input
          type="date"
          aria-label="Filtrar por data"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
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
        </select>
        <select
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
        </select>
        <Button
          variant="ghost"
          onClick={() => {
            setDate("");
            setServiceId("");
            setProductId("");
          }}
        >
          Limpar
        </Button>
      </div>
      <div className="stats-grid financial-stats">
        <div className="stat">
          <span>
            Faturamento bruto <TrendingUp />
          </span>
          <strong>{money(r.total)}</strong>
          <small>Serviços concluídos + vendas</small>
        </div>
        <div className="stat">
          <span>
            Serviços <Scissors />
          </span>
          <strong>{money(r.services)}</strong>
          <small>Atendimentos concluídos</small>
        </div>
        <div className="stat">
          <span>
            Produtos <Package />
          </span>
          <strong>{money(r.products)}</strong>
          <small>Vendas registradas</small>
        </div>
      </div>
      <p className="demo-note">
        Outros indicadores (líquido, descontos, formas de pagamento) serão avaliados conforme
        necessidade.
      </p>
    </PaginaAdmin>
  );
}
