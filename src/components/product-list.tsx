import { useState } from "react";
import { ArrowUpRight, Scissors, ListFilter, Package } from "lucide-react";
import { useShop, money, type Product } from "@/lib/barbershop";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { fotos } from "@/assets/fotos";
const equipment = { url: fotos.equipamentos };
export function ProductList() {
  const { products } = useShop();
  const [product, setProduct] = useState<Product | null>(null);
  return (
    <>
      <div className="product-layout">
        <img
          className="equipment-photo"
          src={equipment.url}
          alt="Máquinas de corte, tesoura e pente profissionais em uma bancada de barbearia"
        />
        <div className="product-rows">
          {products
            .filter((p) => p.active)
            .map((p, i) => (
              <div className="product-row" key={p.id}>
                <span className="product-number">0{i + 1}</span>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>{money(p.price)}</strong>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={`Ver ${p.name}`}
                  onClick={() => setProduct(p)}
                >
                  <ArrowUpRight />
                </Button>
              </div>
            ))}
          <span className="stock-note">
            <Package size={14} /> Disponíveis para retirada na barbearia
          </span>
        </div>
      </div>
      <Dialog
        open={!!product}
        onOpenChange={(open) => {
          if (!open) setProduct(null);
        }}
      >
        <DialogContent>
          {product && (
            <>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription>{product.description}</DialogDescription>
              <img
                className="product-dialog-photo"
                src={equipment.url}
                alt="Equipamentos profissionais de barbearia"
              />
              <strong className="text-2xl text-primary">{money(product.price)}</strong>
              <p className="text-sm text-muted-foreground">
                Produto demonstrativo. Consulte disponibilidade na barbearia; não há compra online
                neste protótipo.
              </p>
              <Button onClick={() => setProduct(null)}>Continuar explorando</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
