import { createFileRoute } from "@tanstack/react-router";

import { ProductList } from "@/components/product-list";
import { ShopLayout } from "@/components/shop-layout";
import { SectionTitle } from "@/components/ui/section-title";
import { lerProdutos } from "@/features/catalogo/banco";
import { metasDaPagina } from "@/lib/marca";
import { ouNulo } from "@/lib/supabase";

export const Route = createFileRoute("/produtos")({
  component: Products,
  loader: async () => ({ produtos: await ouNulo(lerProdutos()) }),
  head: () => ({
    meta: metasDaPagina(
      "Produtos",
      "Produtos à venda na barbearia. Retire no balcão: não há compra online.",
    ),
  }),
});

function Products() {
  const { produtos } = Route.useLoaderData();
  return (
    <ShopLayout>
      <div className="mx-auto grid w-full max-w-3xl gap-6 px-5 pb-20 pt-10">
        <header className="grid gap-3">
          <SectionTitle nivel={1}>Produtos</SectionTitle>
          <p className="text-lg text-muted-foreground">
            À venda na barbearia. Retire no balcão: não há compra online.
          </p>
        </header>
        <ProductList produtos={produtos} />
      </div>
    </ShopLayout>
  );
}
