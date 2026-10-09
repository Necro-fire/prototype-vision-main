import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { today } from "@/features/agenda/disponibilidade";
import { useShop } from "@/features/demo/shop-provider";
import { dataCurta } from "@/lib/datas";
import { money } from "@/lib/dinheiro";
import { BarraDeFiltros, EstadoVazio, SecaoAdmin } from "./componentes";
import { ListaAdaptavel } from "./lista-adaptavel";
import { PaginaAdmin } from "./pagina-admin";

export function Vendas() {
  const shop = useShop();
  const active = shop.products.filter((p) => p.active);
  const [productId, setProductId] = useState(active[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("");
  const [msg, setMsg] = useState<{ texto: string; erro: boolean } | null>(null);
  const sales = shop.sales.filter((v) => !period || v.date === period);
  const services = shop.bookings.filter(
    (b) => b.status === "Concluído" && (!period || b.date === period),
  );
  return (
    <PaginaAdmin module="vendas">
      <SecaoAdmin titulo="Registrar venda de produto">
        <div className="grid gap-4 rounded-md border-2 border-foreground bg-card p-4 sm:grid-cols-3 sm:p-5">
          <Campo id="venda-produto" rotulo="Produto">
            {(props) => (
              <NativeSelect
                {...props}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {active.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}, {money(p.price)}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Campo>
          <Campo id="venda-quantidade" rotulo="Quantidade">
            {(props) => (
              <Input
                {...props}
                type="number"
                inputMode="numeric"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            )}
          </Campo>
          <Campo id="venda-data" rotulo="Data">
            {(props) => (
              <Input
                {...props}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Campo>
          <div className="grid gap-3 sm:col-span-3">
            {msg && (
              <p
                role={msg.erro ? "alert" : "status"}
                className={`text-base font-semibold ${msg.erro ? "text-destructive" : "text-success"}`}
              >
                {msg.texto}
              </p>
            )}
            <div>
              <Button
                onClick={() => {
                  try {
                    shop.sell(productId, qty, date);
                    setQty(1);
                    setMsg({ texto: "Venda registrada nesta sessão.", erro: false });
                  } catch (e) {
                    setMsg({
                      texto: e instanceof Error ? e.message : "Não foi possível registrar.",
                      erro: true,
                    });
                  }
                }}
              >
                <Plus /> Registrar venda
              </Button>
            </div>
          </div>
        </div>
      </SecaoAdmin>

      <BarraDeFiltros>
        <Input
          type="date"
          className="sm:w-auto"
          aria-label="Filtrar vendas por data"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        />
        <Button variant="outline" onClick={() => setPeriod("")}>
          Limpar filtro
        </Button>
      </BarraDeFiltros>

      <SecaoAdmin titulo="Histórico de vendas">
        <ListaAdaptavel
          descricao="Vendas de produtos"
          linhas={sales}
          chave={(v) => v.id}
          vazio={<EstadoVazio titulo="Nenhuma venda registrada." />}
          colunas={[
            { rotulo: "Produto", principal: true, render: (v) => v.productName },
            { rotulo: "Qtd.", render: (v) => v.quantity },
            { rotulo: "Data", render: (v) => dataCurta(v.date) },
            { rotulo: "Total", alinharADireita: true, render: (v) => money(v.total) },
          ]}
        />
      </SecaoAdmin>

      <SecaoAdmin titulo="Histórico de serviços" nota="Atendimentos concluídos">
        <ListaAdaptavel
          descricao="Serviços concluídos"
          linhas={services}
          chave={(b) => b.id}
          vazio={
            <EstadoVazio
              titulo="Nenhum serviço concluído."
              texto="Marque um agendamento como Concluído para ele aparecer aqui."
            />
          }
          colunas={[
            { rotulo: "Cliente", principal: true, render: (b) => b.name },
            { rotulo: "Serviço", render: (b) => b.serviceName },
            { rotulo: "Data", render: (b) => dataCurta(b.date) },
            { rotulo: "Valor", alinharADireita: true, render: (b) => money(b.price) },
          ]}
        />
      </SecaoAdmin>
    </PaginaAdmin>
  );
}
