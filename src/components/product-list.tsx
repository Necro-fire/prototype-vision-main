import { useShop } from "@/features/demo/shop-provider";
import { precoCurto } from "@/lib/dinheiro";

export function ProductList() {
  const { products } = useShop();
  const ativos = products.filter((p) => p.active);

  if (ativos.length === 0) {
    return (
      <p className="rounded-md border-2 border-dashed border-input p-6 text-base text-muted-foreground">
        Nenhum produto disponível no momento.
      </p>
    );
  }

  return (
    <ul
      aria-label="Produtos e preços"
      className="divide-y divide-border overflow-hidden rounded-md border-2 border-foreground bg-card"
    >
      {ativos.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="grid gap-0.5">
            <h3 className="font-display text-xl font-bold leading-tight">{p.name}</h3>
            <p className="text-sm text-muted-foreground">{p.description}</p>
          </div>
          <span className="font-display text-xl font-extrabold tabular-nums">
            {precoCurto(p.price)}
          </span>
        </li>
      ))}
    </ul>
  );
}
