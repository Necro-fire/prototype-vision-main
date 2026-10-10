import { Miniatura } from "@/components/miniatura";
import type { Produto } from "@/features/catalogo/banco";
import { precoCurtoDeCentavos } from "@/lib/dinheiro";

// `produtos` é nulo quando a leitura no banco falhou.
export function ProductList({ produtos }: { produtos: Produto[] | null }) {
  if (!produtos) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-dashed border-line bg-card/40 p-6 text-base"
      >
        Não conseguimos carregar os produtos agora. Recarregue a página em instantes.
      </p>
    );
  }

  if (produtos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line bg-card/40 p-6 text-base text-muted-foreground">
        Nenhum produto disponível no momento.
      </p>
    );
  }

  return (
    <ul
      aria-label="Produtos e preços"
      className="divide-y divide-border overflow-hidden rounded-xl border border-line bg-card"
    >
      {produtos.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            {p.fotoUrl && <Miniatura url={p.fotoUrl} />}
            <div className="grid gap-0.5">
              <h2 className="font-display text-xl font-bold leading-tight">{p.nome}</h2>
              <p className="text-sm text-muted-foreground">{p.descricao}</p>
            </div>
          </div>
          <span className="text-xl font-bold tabular-nums text-primary">
            {precoCurtoDeCentavos(p.precoCentavos)}
          </span>
        </li>
      ))}
    </ul>
  );
}
