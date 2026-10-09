import { createFileRoute } from "@tanstack/react-router";

import { Foto } from "@/components/foto";
import { ServiceList } from "@/components/service-list";
import { ShopLayout } from "@/components/shop-layout";
import { metasDaPagina } from "@/lib/marca";

export const Route = createFileRoute("/servicos")({
  component: Services,
  head: () => ({
    meta: metasDaPagina(
      "Serviços e preços",
      "Cortes, barba, tratamentos, sobrancelha e FreeStyle, com preço e duração. Toque no serviço para agendar.",
    ),
  }),
});

function Services() {
  return (
    <ShopLayout>
      <div className="mx-auto grid w-full max-w-3xl gap-6 px-5 pb-20 pt-10">
        <header className="grid gap-2">
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
            Serviços e preços
          </h1>
          <p className="text-lg text-muted-foreground">
            Toque no serviço para escolher o dia e o horário.
          </p>
        </header>
        <Foto
          arquivo="cadeira-em-sala-clara"
          alt="Cadeira de barbeiro preta, vista de costas, em uma sala clara."
          prioridade
        />
        <ServiceList filters />
      </div>
    </ShopLayout>
  );
}
