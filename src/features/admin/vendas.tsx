import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { today } from "@/features/agenda/disponibilidade";
import { useShop } from "@/features/demo/shop-provider";
import { money } from "@/lib/dinheiro";
import { PaginaAdmin } from "./pagina-admin";

export function Vendas() {
  const shop = useShop();
  const active = shop.products.filter((p) => p.active);
  const [productId, setProductId] = useState(active[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("");
  const [msg, setMsg] = useState("");
  const sales = shop.sales.filter((v) => !period || v.date === period);
  const services = shop.bookings.filter(
    (b) => b.status === "Concluído" && (!period || b.date === period),
  );
  return (
    <PaginaAdmin module="vendas">
      <section className="settings-layout">
        <section>
          <h2>Registrar venda de produto</h2>
          <div className="form-columns">
            <label className="field-label">
              Produto
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Quantidade
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </label>
            <label className="field-label">
              Data
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          {msg && (
            <p role="status" className="returning-client">
              {msg}
            </p>
          )}
          <Button
            onClick={() => {
              try {
                shop.sell(productId, qty, date);
                setQty(1);
                setMsg("Venda registrada nesta sessão.");
              } catch (e) {
                setMsg(e instanceof Error ? e.message : "Erro ao registrar.");
              }
            }}
          >
            Registrar venda <Plus />
          </Button>
        </section>
      </section>
      <div className="admin-filter-bar">
        <Input
          type="date"
          aria-label="Filtrar vendas por data"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Button variant="ghost" onClick={() => setPeriod("")}>
          Limpar
        </Button>
      </div>
      <div className="admin-section-head">
        <h2>Histórico de vendas</h2>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Qtd.</th>
              <th>Data</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>{v.productName}</strong>
                </td>
                <td>{v.quantity}</td>
                <td>{new Date(`${v.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>{money(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && (
          <div className="admin-empty">
            <h3>Nenhuma venda registrada.</h3>
          </div>
        )}
      </div>
      <div className="admin-section-head">
        <h2>Histórico de serviços</h2>
        <span className="text-muted-foreground text-sm">Atendimentos concluídos</span>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Serviço</th>
              <th>Data</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {services.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.name}</strong>
                </td>
                <td>{b.serviceName}</td>
                <td>{new Date(`${b.date}T12:00:00`).toLocaleDateString("pt-BR")}</td>
                <td>{money(b.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {services.length === 0 && (
          <div className="admin-empty">
            <h3>Nenhum serviço concluído.</h3>
            <p>Marque agendamentos como Concluído para vê-los aqui.</p>
          </div>
        )}
      </div>
    </PaginaAdmin>
  );
}
