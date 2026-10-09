import type { ReactNode } from "react";

import { ShopLayout } from "@/components/shop-layout";

// Moldura das telas de conta: título, frase de apoio e o formulário, em coluna estreita.
export function TelaDeConta({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <ShopLayout>
      <div className="mx-auto grid w-full max-w-md gap-6 px-5 pb-20 pt-10">
        <header className="grid gap-2">
          <h1 className="font-display text-4xl font-extrabold leading-tight">{titulo}</h1>
          {descricao && <p className="text-lg text-muted-foreground">{descricao}</p>}
        </header>
        {children}
      </div>
    </ShopLayout>
  );
}
