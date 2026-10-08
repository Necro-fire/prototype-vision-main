import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Scissors,
  Clock,
  Sparkles,
  Slice,
  WandSparkles,
  Droplets,
} from "lucide-react";
import { useState } from "react";
import { categories } from "@/features/catalogo/tipos";
import { useShop } from "@/features/demo/shop-provider";
import { money } from "@/lib/dinheiro";
import { Button } from "@/components/ui/button";
const icons = [Scissors, Slice, Scissors, Droplets, Sparkles, WandSparkles];
export function ServiceList({ filters = false }: { filters?: boolean }) {
  const { services } = useShop();
  const [category, setCategory] = useState("Todos");
  return (
    <>
      {filters && (
        <div className="category-tabs">
          {categories.map((c) => (
            <Button
              variant="ghost"
              key={c}
              onClick={() => setCategory(c)}
              className={category === c ? "selected" : ""}
            >
              {c}
            </Button>
          ))}
        </div>
      )}
      <div className="service-grid">
        {services
          .filter((s) => s.active && (category === "Todos" || s.category === category))
          .map((s, i) => {
            const Icon = icons[i % icons.length] ?? Scissors;
            return (
              <Link
                to="/agendamento"
                search={{ service: s.id }}
                className={`service-item ${s.id === "3" ? "featured" : ""}`}
                key={s.id}
              >
                <div className="service-top">
                  <Icon size={25} />
                  <span>{s.id === "3" ? "O MAIS PEDIDO" : `0${i + 1}`}</span>
                </div>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <div className="service-bottom">
                  <strong>{money(s.price)}</strong>
                  <span>
                    <Clock size={13} />
                    {s.duration} min
                  </span>
                  <ArrowUpRight size={20} />
                </div>
              </Link>
            );
          })}
      </div>
      {services.filter((s) => s.active).length === 0 && (
        <p className="empty-state">Nenhum serviço disponível no momento.</p>
      )}
    </>
  );
}
